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

interface AddTransactionDialogProps {
  defaultType?: TransactionType;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
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
  const [tags, setTags] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  // Update type when defaultType changes (only if not user-modified? typically reset on open)
  // useEffect(() => setType(defaultType), [defaultType, open]); 

  const { accounts, addTransaction, defaultCurrency } = useStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId) return;

    if (type === 'transfer' && !toAccountId) return;

    addTransaction({
      id: Math.floor(Math.random() * 1000000),
      type,
      amount: parseFloat(amount),
      currency: defaultCurrency,
      accountId: parseInt(accountId),
      toAccountId: type === 'transfer' && toAccountId ? parseInt(toAccountId) : undefined,
      category: category || 'Uncategorized',
      date: new Date().toISOString(),
      description,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      isRecurring,
      status: 'completed'
    });

    setOpen?.(false);
    resetForm();
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory('');
    setTags('');
    setIsRecurring(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen?.(val);
      if (val) setType(defaultType); // Reset type on open
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
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">
              {t('transactions.type')}
            </Label>
            <Select
              value={type}
              onValueChange={(value: TransactionType) => setType(value)}
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
                  {accounts
                    .filter(acc => acc.id !== parseInt(accountId))
                    .map((acc) => {
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
          )}

          <div className="grid gap-2">
            <Label htmlFor="category">
              {t('transactions.category')}
            </Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={type === 'income' ? t('transactions.placeholders.category_income') : t('transactions.placeholders.category')}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">
              {t('transactions.tags') || 'Tags'}
            </Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
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
            <Button type="submit" className="w-full sm:w-auto">{t('transactions.save_changes')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
