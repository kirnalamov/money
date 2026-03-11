"use client";

import { useState, useEffect } from 'react';
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
import { Transaction, TransactionType } from '@/types';
import { useTranslation } from 'react-i18next';
import { CreatableCombobox } from '@/components/ui/creatable-combobox';
import { MultiSelectCreatable } from '@/components/ui/multi-select-creatable';
import { Trash2, Calendar, Wallet, Tag as TagIcon, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface TransactionDetailsDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailsDialog({ transaction, open, onOpenChange }: TransactionDetailsDialogProps) {
  const { t } = useTranslation();
  const { accounts, categories, tags: tagsList, updateTransaction, deleteTransaction, defaultCurrency } = useStore();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [date, setDate] = useState('');

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setDescription(transaction.description || '');
      setAccountId(transaction.accountId.toString());
      setToAccountId(transaction.toAccountId?.toString() || '');
      setCategory(transaction.category);
      setTags(transaction.tags || []);
      setDate(format(new Date(transaction.date), "yyyy-MM-dd'T'HH:mm"));
    }
  }, [transaction, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || !amount || !accountId) return;

    await updateTransaction(transaction.id, {
      type,
      amount: parseFloat(amount),
      accountId: parseInt(accountId),
      toAccountId: type === 'transfer' && toAccountId ? parseInt(toAccountId) : undefined,
      category,
      description,
      tags,
      date: new Date(date).toISOString(),
    });

    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!transaction) return;
    if (confirm(t('common.confirm_delete') || 'Are you sure you want to delete this transaction?')) {
      await deleteTransaction(transaction.id);
      onOpenChange(false);
    }
  };

  if (!transaction) return null;

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
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">{t('transactions.type')}</Label>
            <Select value={type} onValueChange={(value: TransactionType) => setType(value)}>
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
            <Select value={accountId} onValueChange={setAccountId}>
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
                  {accounts
                    .filter(acc => acc.id !== parseInt(accountId))
                    .map((acc) => (
                      <SelectItem key={acc.id} value={acc.id.toString()}>
                        {acc.name} ({acc.currency})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button type="submit">{t('common.save') || 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
