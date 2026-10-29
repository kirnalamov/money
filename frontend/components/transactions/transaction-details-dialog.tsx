"use client";

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Transaction, TransactionType } from '@/types';
import { useTranslation } from 'react-i18next';
import { CreatableCombobox } from '@/components/ui/creatable-combobox';
import { MultiSelectCreatable } from '@/components/ui/multi-select-creatable';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface TransactionDetailsDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (transaction: Transaction) => void;
}

interface TransactionDetailsFormProps extends Omit<TransactionDetailsDialogProps, 'transaction'> {
  transaction: Transaction;
}

export function TransactionDetailsDialog(props: TransactionDetailsDialogProps) {
  if (!props.transaction) return null;

  return <TransactionDetailsForm key={props.transaction.id} {...props} transaction={props.transaction} />;
}

function TransactionDetailsForm({ transaction, open, onOpenChange, onDeleted }: TransactionDetailsFormProps) {
  const { t } = useTranslation();
  const { accounts, categories, tags: tagsList, updateTransaction, deleteTransaction } = useStore();

  const [type, setType] = useState<TransactionType>(transaction.type);
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [description, setDescription] = useState(transaction.description || '');
  const [accountId, setAccountId] = useState(transaction.accountId.toString());
  const [toAccountId, setToAccountId] = useState(transaction.toAccountId?.toString() || '');
  const [category, setCategory] = useState(transaction.category);
  const [tags, setTags] = useState<string[]>(transaction.tags || []);
  const [date, setDate] = useState(format(new Date(transaction.date), "yyyy-MM-dd'T'HH:mm"));
  const [isRecurring, setIsRecurring] = useState(!!transaction.isRecurring);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedAccount = accounts.find((account) => account.id === Number(accountId));
  const destinationAccounts = accounts.filter((account) => (
    account.id !== Number(accountId) &&
    (!selectedAccount || account.currency === selectedAccount.currency)
  ));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedAmount = Number(amount);
    const parsedDate = new Date(date);
    const destinationAccount = accounts.find((account) => account.id === Number(toAccountId));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t('transactions.validation.amount'));
      return;
    }
    if (!selectedAccount) {
      setError(t('transactions.validation.account'));
      return;
    }
    if (type === 'transfer' && !destinationAccount) {
      setError(t('transactions.validation.destination'));
      return;
    }
    if (type === 'transfer' && destinationAccount?.currency !== selectedAccount.currency) {
      setError(t('transactions.validation.transfer_currency'));
      return;
    }
    if (!category.trim()) {
      setError(t('transactions.validation.category'));
      return;
    }
    if (Number.isNaN(parsedDate.getTime())) {
      setError(t('transactions.validation.date'));
      return;
    }

    setIsSubmitting(true);
    try {
      await updateTransaction(transaction.id, {
        type,
        amount: parsedAmount,
        currency: selectedAccount.currency,
        accountId: parseInt(accountId),
        toAccountId: type === 'transfer' && toAccountId ? parseInt(toAccountId) : undefined,
        category: category.trim(),
        description,
        tags,
        isRecurring,
        date: parsedDate.toISOString(),
      });

      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    if (confirm(t('common.confirm_delete') || 'Are you sure you want to delete this transaction?')) {
      setError(null);
      try {
        await deleteTransaction(transaction.id);
        onDeleted?.(transaction);
        onOpenChange(false);
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : t('common.error'));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{t('transactions.edit_dialog_title') || 'Transaction Details'}</DialogTitle>
            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            {t('transactions.edit_dialog_desc') || 'View or update your transaction information.'}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">{t('transactions.type')}</Label>
            <Select value={type} onValueChange={(value: TransactionType) => {
              setType(value);
              if (value !== 'transfer') setToAccountId('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder={t('transactions.placeholders.select_type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">{t('transactions.types.expense')}</SelectItem>
                <SelectItem value="income">{t('transactions.types.income')}</SelectItem>
                <SelectItem value="transfer">{t('transactions.types.transfer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">{t('transactions.amount')}</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                required
                className="pl-8"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                {transaction.currency}
              </span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">{t('common.date') || 'Date'}</Label>
            <Input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account">
              {type === 'transfer' ? t('transactions.from_account') : t('transactions.account')}
            </Label>
            <Select value={accountId} onValueChange={(value) => {
              setAccountId(value);
              const nextAccount = accounts.find((account) => account.id === Number(value));
              const currentDestination = accounts.find((account) => account.id === Number(toAccountId));
              if (!nextAccount || !currentDestination || currentDestination.id === nextAccount.id || currentDestination.currency !== nextAccount.currency) {
                setToAccountId('');
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder={t('transactions.placeholders.select_account')} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id.toString()}>
                    {acc.name} ({acc.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'transfer' && (
            <div className="grid gap-2">
              <Label htmlFor="toAccount">{t('transactions.to_account')}</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('transactions.placeholders.destination_account')} />
                </SelectTrigger>
                <SelectContent>
                {destinationAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id.toString()}>
                        {acc.name} ({acc.currency})
                      </SelectItem>
                    ))}
                {destinationAccounts.length === 0 && (
                  <SelectItem value="no-destination" disabled>
                    {t('transactions.validation.no_destination')}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedAccount && (
              <p className="text-xs text-muted-foreground">
                {t('transactions.transfer_currency_hint', { currency: selectedAccount.currency })}
              </p>
            )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="category">{t('transactions.category')}</Label>
            <CreatableCombobox
              options={categories.map(c => ({ label: c.name, value: c.name }))}
              value={category}
              onChange={setCategory}
              placeholder={t('transactions.placeholders.category')}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">{t('transactions.tags') || 'Tags'}</Label>
            <MultiSelectCreatable
              options={tagsList.map(t => ({ label: t.name, value: t.name }))}
              values={tags}
              onChange={setTags}
              placeholder={t('transactions.placeholders.tags')}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">{t('transactions.description')}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('transactions.placeholders.description')}
            />
          </div>

          {type !== 'income' && type !== 'transfer' && (
            <div className="flex items-center justify-between border p-3 rounded-md mt-2">
              <div className="space-y-0.5">
                <Label htmlFor="recurring" className="text-base">{t('transactions.recurring_label') || 'Recurring'}</Label>
                <p className="text-xs text-muted-foreground">{t('transactions.recurring_desc') || 'Mark as fixed monthly expense'}</p>
              </div>
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
