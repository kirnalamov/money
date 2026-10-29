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
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Plus } from 'lucide-react';
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
      if (isSubmitting && !val) return;
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
      <DialogContent className="flex max-h-[min(90dvh,850px)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[560px]">
        <DialogHeader className="border-b px-6 pb-5 pt-6 pr-12 text-left">
          <DialogTitle className="text-xl">{t('transactions.add_dialog_title')}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {t('transactions.add_dialog_desc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-5">
          {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
          {accounts.length === 0 && <Alert><AlertDescription>{t('transactions.validation.no_accounts')}</AlertDescription></Alert>}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('transactions.type')}</legend>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
              {([
                ['expense', ArrowUpRight],
                ['income', ArrowDownLeft],
                ['transfer', ArrowLeftRight],
              ] as const).map(([value, Icon]) => (
                <label key={value} className="relative cursor-pointer">
                  <input type="radio" name="transaction-type" value={value} checked={type === value}
                    onChange={() => { setType(value); if (value !== 'transfer') setToAccountId(''); }} className="peer sr-only" />
                  <span className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-1 text-xs font-medium text-muted-foreground transition-colors peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring sm:text-sm">
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {t(`transactions.types.${value}`)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="rounded-xl border bg-muted/30 p-4">
            <Label htmlFor="amount" className="text-muted-foreground">{t('transactions.amount')}</Label>
            <div className="mt-2 flex items-center gap-3">
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              required
              placeholder="0.00"
              className="h-12 min-w-0 border-0 bg-transparent px-0 text-3xl font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <span className="shrink-0 rounded-lg bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground" aria-live="polite">{selectedAccount?.currency || t('transactions.currency_after_account')}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
              <SelectTrigger id="account" className="h-11">
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
                <SelectTrigger id="toAccount" className="h-11">
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
            <Label htmlFor="date">{t('common.date')}</Label>
            <Input id="date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required className="h-11 min-w-0" />
          </div>
          </div>

          <div className="grid gap-2">
            <Label id="new-transaction-category-label">
              {t('transactions.category')}
            </Label>
            <CreatableCombobox
              options={categories.map(c => ({ label: c.name, value: c.name }))}
              value={category}
              onChange={setCategory}
              aria-labelledby="new-transaction-category-label"
              placeholder={type === 'income' ? t('transactions.placeholders.category_income') : t('transactions.placeholders.category')}
            />
          </div>

          <div className="grid gap-2">
            <Label id="new-transaction-tags-label">
              {t('transactions.tags') || 'Tags'}
            </Label>
            <MultiSelectCreatable
              options={tagsList.map(t => ({ label: t.name, value: t.name }))}
              values={tags}
              onChange={setTags}
              aria-labelledby="new-transaction-tags-label"
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
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 p-4">
              <div className="space-y-1">
                <Label htmlFor="recurring" className="text-sm font-medium">{t('transactions.recurring_label')}</Label>
                <p className="text-xs text-muted-foreground">{t('transactions.recurring_desc')}</p>
              </div>
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>
          )}

          </div>
          <DialogFooter className="gap-2 border-t bg-background px-6 py-4 sm:space-x-0">
            <Button type="button" variant="outline" onClick={() => setOpen?.(false)} disabled={isSubmitting} className="w-full sm:w-auto">{t('common.cancel')}</Button>
            <Button type="submit" className="w-full sm:min-w-36 sm:w-auto" disabled={isSubmitting || accounts.length === 0}>
              {isSubmitting ? t('common.loading') : t('transactions.save_changes')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
