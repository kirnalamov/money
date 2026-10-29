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
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, CircleDollarSign, FileText, Plus, Tag, Wallet } from 'lucide-react';
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
      <DialogContent className="flex max-h-[min(92dvh,900px)] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-[2rem] border-border/70 bg-background p-0 shadow-2xl dark:border-white/15 dark:bg-[#141e1b] sm:max-w-[640px]">
        <DialogHeader className="px-5 pb-4 pt-6 pr-12 text-left sm:px-7 sm:pr-12">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d4fb58] text-[#15200b]">
            <CircleDollarSign aria-hidden="true" className="h-5 w-5" />
          </div>
          <DialogTitle className="text-2xl font-semibold tracking-tight">{t('transactions.add_dialog_title')}</DialogTitle>
          <DialogDescription className="leading-relaxed dark:text-white/65">
            {t('transactions.add_dialog_desc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 space-y-3 overflow-y-auto px-5 pb-5 sm:px-7">
          {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
          {accounts.length === 0 && <Alert><AlertDescription>{t('transactions.validation.no_accounts')}</AlertDescription></Alert>}
          <fieldset className="space-y-2">
            <legend className="sr-only">{t('transactions.type')}</legend>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['expense', ArrowUpRight],
                ['income', ArrowDownLeft],
                ['transfer', ArrowLeftRight],
              ] as const).map(([value, Icon]) => (
                <label key={value} className="relative cursor-pointer">
                  <input type="radio" name="transaction-type" value={value} checked={type === value}
                    onChange={() => { setType(value); if (value !== 'transfer') setToAccountId(''); }} className="peer sr-only" />
                  <span className="flex min-h-[72px] flex-col items-start justify-between gap-2 rounded-[1.2rem] border border-border bg-muted/60 p-3 text-xs font-medium text-foreground transition-colors hover:bg-muted peer-checked:border-[#a6cd31] peer-checked:bg-[#d4fb58] peer-checked:text-[#17220c] peer-focus-visible:ring-2 peer-focus-visible:ring-ring dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:peer-checked:border-[#d4fb58] dark:peer-checked:bg-[#d4fb58] dark:peer-checked:text-[#17220c] sm:min-h-[80px] sm:text-sm">
                    <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                    {t(`transactions.types.${value}`)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="rounded-[1.5rem] border border-border bg-gradient-to-br from-lime-100 to-emerald-50 p-5 dark:border-white/10 dark:from-[#3f554b] dark:to-[#263a33]">
            <Label htmlFor="amount" className="text-muted-foreground dark:text-white/70">{t('transactions.amount')}</Label>
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
              className="h-14 min-w-0 rounded-lg border-0 bg-transparent px-1 text-4xl font-semibold tracking-tight shadow-none placeholder:text-foreground/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 dark:text-white dark:placeholder:text-white/40"
            />
            <span className="shrink-0 rounded-full bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground dark:bg-black/25 dark:text-white/80" aria-live="polite">{selectedAccount?.currency || t('transactions.currency_after_account')}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid content-start gap-3 rounded-[1.4rem] border bg-muted/50 p-4 dark:border-white/10 dark:bg-white/[0.08]">
            <Label htmlFor="account" className="flex items-center gap-2 text-muted-foreground dark:text-white/70">
              <Wallet aria-hidden="true" className="h-4 w-4" />
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
              <SelectTrigger id="account" className="h-11 rounded-xl bg-background/80 dark:border-white/10 dark:bg-black/20">
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
            <div className="grid content-start gap-3 rounded-[1.4rem] border bg-muted/50 p-4 dark:border-white/10 dark:bg-white/[0.08]">
              <Label htmlFor="toAccount" className="flex items-center gap-2 text-muted-foreground dark:text-white/70">
                <ArrowLeftRight aria-hidden="true" className="h-4 w-4" />
                {t('transactions.to_account')}
              </Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger id="toAccount" className="h-11 rounded-xl bg-background/80 dark:border-white/10 dark:bg-black/20">
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

          <div className="grid content-start gap-3 rounded-[1.4rem] border bg-muted/50 p-4 dark:border-white/10 dark:bg-white/[0.08]">
            <Label htmlFor="date" className="flex items-center gap-2 text-muted-foreground dark:text-white/70"><CalendarDays aria-hidden="true" className="h-4 w-4" />{t('common.date')}</Label>
            <Input id="date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required className="h-11 min-w-0 rounded-xl bg-background/80 dark:border-white/10 dark:bg-black/20" />
          </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid content-start gap-3 rounded-[1.4rem] border bg-muted/50 p-4 dark:border-white/10 dark:bg-white/[0.08]">
            <Label id="new-transaction-category-label" className="flex items-center gap-2 text-muted-foreground dark:text-white/70">
              <Tag aria-hidden="true" className="h-4 w-4" />
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

          <div className="grid content-start gap-3 rounded-[1.4rem] border bg-muted/50 p-4 dark:border-white/10 dark:bg-white/[0.08]">
            <Label id="new-transaction-tags-label" className="flex items-center gap-2 text-muted-foreground dark:text-white/70">
              <Tag aria-hidden="true" className="h-4 w-4" />
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
          </div>

          <div className="grid gap-3 rounded-[1.4rem] border bg-muted/50 p-4 dark:border-white/10 dark:bg-white/[0.08]">
            <Label htmlFor="description" className="flex items-center gap-2 text-muted-foreground dark:text-white/70">
              <FileText aria-hidden="true" className="h-4 w-4" />
              {t('transactions.description')}
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'income' ? t('transactions.placeholders.description_income') : t('transactions.placeholders.description')}
              className="h-11 rounded-xl bg-background/80 dark:border-white/10 dark:bg-black/20"
            />
          </div>

          {type !== 'income' && type !== 'transfer' && (
            <div className="flex items-center justify-between gap-4 rounded-[1.4rem] border bg-muted/50 p-4 dark:border-white/10 dark:bg-white/[0.08]">
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
          <DialogFooter className="gap-2 border-t bg-background px-5 py-4 dark:border-white/10 dark:bg-[#141e1b] sm:space-x-0 sm:px-7">
            <Button type="button" variant="outline" onClick={() => setOpen?.(false)} disabled={isSubmitting} className="h-11 w-full rounded-xl sm:w-auto">{t('common.cancel')}</Button>
            <Button type="submit" className="h-11 w-full rounded-xl bg-[#d4fb58] text-[#17220c] hover:bg-[#c1eb43] sm:min-w-40 sm:w-auto" disabled={isSubmitting || accounts.length === 0}>
              {isSubmitting ? t('common.loading') : t('transactions.save_changes')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
