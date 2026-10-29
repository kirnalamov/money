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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TransactionType } from '@/types';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, convertCurrency } from '@/lib/utils';
import { CreatableCombobox } from '@/components/ui/creatable-combobox';
import { MultiSelectCreatable } from '@/components/ui/multi-select-creatable';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddTransactionDialogProps {
  defaultType?: TransactionType;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

function toLocalDateTimeInput(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function AddTransactionDialog({ defaultType = 'expense', open: controlledOpen, onOpenChange: setControlledOpen, trigger }: AddTransactionDialogProps) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(() => toLocalDateTimeInput(new Date()));
  const [tags, setTags] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update type when defaultType changes (only if not user-modified? typically reset on open)
  // useEffect(() => setType(defaultType), [defaultType, open]); 

  const { accounts, categories, tags: tagsList, addTransaction, defaultCurrency } = useStore();
  const selectedAccount = accounts.find(a => a.id === Number(accountId));
  const destinationAccounts = accounts.filter((account) => (
    account.id !== Number(accountId) &&
    (!selectedAccount || account.currency === selectedAccount.currency)
  ));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedAmount = Number(amount);
    const parsedDate = new Date(date);
    const destinationAccount = accounts.find(a => a.id === Number(toAccountId));

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
      await addTransaction({
      type,
      amount: parsedAmount,
      currency: selectedAccount?.currency || defaultCurrency,
      accountId: parseInt(accountId),
      toAccountId: type === 'transfer' && toAccountId ? parseInt(toAccountId) : undefined,
      category: category.trim(),
      date: parsedDate.toISOString(),
      description,
      tags: tags.length > 0 ? tags : undefined,
      isRecurring,
      status: 'completed'
      });

      setOpen?.(false);
      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setAccountId('');
    setToAccountId('');
    setCategory('');
    setDate(toLocalDateTimeInput(new Date()));
    setTags([]);
    setIsRecurring(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen?.(val);
      if (val) {
        setType(defaultType);
        setError(null);
      }
    }}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('transactions.add_button')}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('transactions.add_dialog_title')}</DialogTitle>
          <DialogDescription>
            {t('transactions.add_dialog_desc')}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {accounts.length === 0 && (
          <Alert>
            <AlertDescription>{t('transactions.validation.no_accounts')}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">
              {t('transactions.type')}
            </Label>
            <Select
              value={type}
              onValueChange={(value: TransactionType) => {
                setType(value);
                if (value !== 'transfer') setToAccountId('');
              }}
            >
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
            <Label htmlFor="amount">
              {t('transactions.amount')}
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">{t('common.date')}</Label>
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
                {accounts.map((acc) => {
                  const convertedBalance = convertCurrency(acc.balance, acc.currency, defaultCurrency);
                  return (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      {acc.name} ({formatCurrency(acc.balance, acc.currency)}
                      {acc.currency !== defaultCurrency && ` ≈ ${formatCurrency(convertedBalance, defaultCurrency)}`})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {type === 'transfer' && (
            <div className="grid gap-2">
              <Label htmlFor="toAccount">
                {t('transactions.to_account')}
              </Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('transactions.placeholders.destination_account')} />
                </SelectTrigger>
                <SelectContent>
                  {destinationAccounts.map((acc) => {
                      const convertedBalance = convertCurrency(acc.balance, acc.currency, defaultCurrency);
                      return (
                        <SelectItem key={acc.id} value={acc.id.toString()}>
                          {acc.name} ({formatCurrency(acc.balance, acc.currency)}
                          {acc.currency !== defaultCurrency && ` ≈ ${formatCurrency(convertedBalance, defaultCurrency)}`})
                        </SelectItem>
                      );
                    })}
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
            <Label htmlFor="category">
              {t('transactions.category')}
            </Label>
            <CreatableCombobox
              options={categories.map(c => ({ label: c.name, value: c.name }))}
              value={category}
              onChange={setCategory}
              placeholder={type === 'income' ? t('transactions.placeholders.category_income') : t('transactions.placeholders.category')}
              onCreate={() => {
                // Optionally could dispatch create action here immediately if desired
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">
              {t('transactions.tags') || 'Tags'}
            </Label>
            <MultiSelectCreatable
              options={tagsList.map(t => ({ label: t.name, value: t.name }))}
              values={tags}
              onChange={setTags}
              placeholder={t('transactions.placeholders.tags') || 'fun, jokes, entertainment'}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">
              {t('transactions.description')}
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'income' ? t('transactions.placeholders.description_income') : t('transactions.placeholders.description')}
            />
          </div>

          {type !== 'income' && type !== 'transfer' && (
            <div className="flex items-center justify-between border p-3 rounded-md mt-2">
              <div className="space-y-0.5">
                <Label htmlFor="recurring" className="text-base">{t('transactions.recurring_label')}</Label>
                <p className="text-xs text-muted-foreground">{t('transactions.recurring_desc')}</p>
              </div>
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || accounts.length === 0}>
              {isSubmitting ? t('common.loading') : t('transactions.save_changes')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
