"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TransactionType } from "@/types";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, FileText, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatCurrency, convertCurrency } from "@/lib/utils";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { MultiSelectCreatable } from "@/components/ui/multi-select-creatable";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

function dateWithOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalDateTimeInput(date);
}

export function AddTransactionDialog({
  defaultType = "expense",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: AddTransactionDialogProps) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => toLocalDateTimeInput(new Date()));
  const [tags, setTags] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { accounts, categories, tags: tagsList, addTransaction, defaultCurrency } = useStore();
  const selectedAccount = accounts.find((account) => account.id === Number(accountId));
  const destinationAccounts = accounts.filter((account) => (
    account.id !== Number(accountId) &&
    (!selectedAccount || account.currency === selectedAccount.currency)
  ));
  const categoryOptions = useMemo(
    () => Array.from(new Set(categories.map((item) => item.name))).sort((a, b) => a.localeCompare(b)),
    [categories],
  );
  const parsedAmount = Number(amount);
  const balanceIsInsufficient = type === "expense" && Boolean(
    selectedAccount && Number.isFinite(parsedAmount) && parsedAmount > selectedAccount.balance,
  );
  const typeTone = type === "expense" ? "#ff6f6a" : type === "income" ? "#c6f24e" : "#5aa9f0";
  const toneStyle = { "--operation-tone": typeTone } as CSSProperties;

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setAccountId("");
    setToAccountId("");
    setCategory("");
    setDate(toLocalDateTimeInput(new Date()));
    setTags([]);
    setIsRecurring(false);
    setShowMore(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsedDate = new Date(date);
    const destinationAccount = accounts.find((account) => account.id === Number(toAccountId));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t("transactions.validation.amount"));
      return;
    }
    if (!selectedAccount) {
      setError(t("transactions.validation.account"));
      return;
    }
    if (type === "transfer" && !destinationAccount) {
      setError(t("transactions.validation.destination"));
      return;
    }
    if (type === "transfer" && destinationAccount?.currency !== selectedAccount.currency) {
      setError(t("transactions.validation.transfer_currency"));
      return;
    }
    if (!category.trim()) {
      setError(t("transactions.validation.category"));
      return;
    }
    if (Number.isNaN(parsedDate.getTime())) {
      setError(t("transactions.validation.date"));
      return;
    }

    setIsSubmitting(true);
    try {
      await addTransaction({
        type,
        amount: parsedAmount,
        currency: selectedAccount.currency || defaultCurrency,
        accountId: Number(accountId),
        toAccountId: type === "transfer" && toAccountId ? Number(toAccountId) : undefined,
        category: category.trim(),
        date: parsedDate.toISOString(),
        description,
        tags: tags.length > 0 ? tags : undefined,
        isRecurring,
        status: "completed",
      });
      setOpen?.(false);
      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectAccount = (value: string) => {
    setAccountId(value);
    const nextAccount = accounts.find((account) => account.id === Number(value));
    const currentDestination = accounts.find((account) => account.id === Number(toAccountId));
    if (!nextAccount || !currentDestination || currentDestination.id === nextAccount.id || currentDestination.currency !== nextAccount.currency) {
      setToAccountId("");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (isSubmitting && !value) return;
        setOpen?.(value);
        if (value) {
          setType(defaultType);
          setError(null);
        }
      }}
    >
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("transactions.add_button")}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent
        className="flex max-h-[min(94dvh,900px)] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-[1.75rem] border-[rgba(200,240,90,.12)] bg-[#0f110d] p-0 text-[#f1f4ea] shadow-2xl sm:max-w-[440px]"
        style={toneStyle}
      >
        <DialogHeader className="px-6 pb-2 pt-6 pr-12 text-left">
          <DialogTitle className="text-[17px] font-semibold tracking-tight text-[#f1f4ea]">
            {t("transactions.add_dialog_title")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("transactions.add_dialog_desc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 space-y-5 overflow-y-auto px-6 pb-3">
            {error && <Alert variant="destructive" role="alert" className="border-[#ff6f6a]/30 bg-[#ff6f6a]/10 text-[#ffaaa6]"><AlertDescription>{error}</AlertDescription></Alert>}
            {accounts.length === 0 && <Alert className="border-[#c6f24e]/20 bg-[#161913] text-[#f1f4ea]"><AlertDescription>{t("transactions.validation.no_accounts")}</AlertDescription></Alert>}

            <fieldset>
              <legend className="sr-only">{t("transactions.type")}</legend>
              <div className="relative grid grid-cols-3 rounded-[14px] bg-[#161913] p-1">
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 top-1 w-[calc((100%-8px)/3)] rounded-[10px] bg-[#1e2218] transition-transform duration-200"
                  style={{ transform: `translateX(${type === "expense" ? 0 : type === "income" ? 100 : 200}%)` }}
                />
                {([
                  ["expense", ArrowUpRight],
                  ["income", ArrowDownLeft],
                  ["transfer", ArrowLeftRight],
                ] as const).map(([value, Icon]) => (
                  <label key={value} className="relative z-10 cursor-pointer">
                    <input
                      type="radio"
                      name="transaction-type"
                      value={value}
                      checked={type === value}
                      onChange={() => { setType(value); if (value !== "transfer") setToAccountId(""); }}
                      className="peer sr-only"
                    />
                    <span className="flex min-h-10 items-center justify-center gap-2 rounded-[10px] px-2 text-sm font-medium text-[#8f9588] transition-colors peer-checked:text-[var(--operation-tone)] peer-focus-visible:ring-2 peer-focus-visible:ring-[#c6f24e]">
                      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                      {t(`transactions.types.${value}`)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="py-5 text-center">
              <Label htmlFor="amount" className="sr-only">{t("transactions.amount")}</Label>
              <div className="flex items-baseline justify-center text-[var(--operation-tone)]">
                <span className="mr-1 text-[32px] opacity-60">{type === "expense" ? "−" : type === "income" ? "+" : ""}</span>
                <Input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                  placeholder="0"
                  className="h-auto w-[min(8ch,100%)] min-w-0 rounded-lg border-0 bg-transparent px-0 text-center text-[52px] font-semibold leading-none tracking-[-0.05em] text-[var(--operation-tone)] shadow-none placeholder:text-[#262c20] focus-visible:ring-2 focus-visible:ring-[#c6f24e] focus-visible:ring-offset-0"
                />
                <span className="ml-1 text-[28px] font-medium opacity-60" aria-label={t("transactions.currency_after_account")}>
                  {selectedAccount?.currency || defaultCurrency}
                </span>
              </div>
              <p className={`mt-3 min-h-5 text-[13px] ${balanceIsInsufficient ? "text-[#ff6f6a]" : "text-[#8f9588]"}`} aria-live="polite">
                {selectedAccount && Number.isFinite(parsedAmount) && parsedAmount > 0
                  ? balanceIsInsufficient
                    ? t("transactions.insufficient_balance", { amount: formatCurrency(parsedAmount - selectedAccount.balance, selectedAccount.currency) })
                    : t("transactions.available_balance", { amount: formatCurrency(selectedAccount.balance, selectedAccount.currency) })
                  : ""}
              </p>
            </div>

            <div className="overflow-hidden rounded-[18px] bg-[#161913]">
              <div className="flex min-h-[54px] items-center justify-between gap-3 px-[18px]">
                <Label htmlFor="account" className="text-[#8f9588]">{type === "transfer" ? t("transactions.from_account") : t("transactions.account")}</Label>
                <Select value={accountId} onValueChange={selectAccount}>
                  <SelectTrigger id="account" className="h-auto w-auto min-w-0 justify-end gap-1 border-0 bg-transparent p-0 text-sm font-medium text-[#f1f4ea] shadow-none focus:ring-0">
                    <SelectValue placeholder={t("transactions.placeholders.select_account")} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => {
                      const convertedBalance = convertCurrency(account.balance, account.currency, defaultCurrency);
                      return <SelectItem key={account.id} value={account.id.toString()}>{account.name} ({formatCurrency(account.balance, account.currency)}{account.currency !== defaultCurrency && ` ≈ ${formatCurrency(convertedBalance, defaultCurrency)}`})</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              {type === "transfer" && <div className="flex min-h-[54px] items-center justify-between gap-3 border-t border-[rgba(200,240,90,.09)] px-[18px]">
                <Label htmlFor="toAccount" className="text-[#8f9588]">{t("transactions.to_account")}</Label>
                <Select value={toAccountId} onValueChange={setToAccountId}>
                  <SelectTrigger id="toAccount" className="h-auto w-auto min-w-0 justify-end gap-1 border-0 bg-transparent p-0 text-sm font-medium text-[#f1f4ea] shadow-none focus:ring-0">
                    <SelectValue placeholder={t("transactions.placeholders.destination_account")} />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationAccounts.map((account) => <SelectItem key={account.id} value={account.id.toString()}>{account.name}</SelectItem>)}
                    {destinationAccounts.length === 0 && <SelectItem value="no-destination" disabled>{t("transactions.validation.no_destination")}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>}
            </div>

            <div>
              <p id="new-transaction-category-label" className="mb-2 ml-0.5 text-[13px] text-[#8f9588]">{t("transactions.category")}</p>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((option) => <button key={option} type="button" aria-pressed={category === option} onClick={() => setCategory(category === option ? "" : option)} className="rounded-full border border-transparent bg-[#161913] px-4 py-2 text-sm font-medium text-[#f1f4ea] transition-colors hover:bg-[#1e2218] aria-pressed:border-[#ff6f6a] aria-pressed:bg-transparent aria-pressed:text-[#ff6f6a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6f24e]">{option}</button>)}
                {category && !categoryOptions.includes(category) && <button type="button" aria-pressed="true" onClick={() => setCategory("")} className="rounded-full border border-[#ff6f6a] px-4 py-2 text-sm font-medium text-[#ff6f6a]">{category}<X aria-hidden="true" className="ml-1 inline h-3 w-3" /></button>}
              </div>
              <div className="mt-2">
                <CreatableCombobox
                  options={categoryOptions.map((item) => ({ label: item, value: item }))}
                  value={category}
                  onChange={setCategory}
                  aria-labelledby="new-transaction-category-label"
                  placeholder={t("transactions.placeholders.category")}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-[18px] bg-[#161913]">
              <div className="flex min-h-[54px] items-center justify-between gap-3 px-[18px]">
                <span className="text-[#8f9588]">{t("common.date")}</span>
                <div className="flex items-center gap-1">
                  <button type="button" aria-pressed={date.slice(0, 10) === dateWithOffset(0).slice(0, 10)} onClick={() => setDate(dateWithOffset(0))} className="rounded-full px-3 py-1.5 text-sm text-[#8f9588] transition-colors aria-pressed:bg-[#1e2218] aria-pressed:text-[#f1f4ea]">{t("common.today")}</button>
                  <button type="button" aria-pressed={date.slice(0, 10) === dateWithOffset(-1).slice(0, 10)} onClick={() => setDate(dateWithOffset(-1))} className="rounded-full px-3 py-1.5 text-sm text-[#8f9588] transition-colors aria-pressed:bg-[#1e2218] aria-pressed:text-[#f1f4ea]">{t("common.yesterday")}</button>
                </div>
              </div>
              <div className="border-t border-[rgba(200,240,90,.09)] px-[18px] py-2">
                <Input id="date" type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} required aria-label={t("common.date")} className="h-9 w-full border-0 bg-transparent p-0 text-right text-sm text-[#f1f4ea] shadow-none focus-visible:ring-0" />
              </div>
            </div>

            <button type="button" className="w-fit border-0 bg-transparent px-0 pb-1 text-sm font-medium text-[#8f9588] hover:text-[#f1f4ea]" onClick={() => setShowMore(!showMore)}>
              {showMore ? "− " : "＋ "}{showMore ? t("transactions.hide_details") : t("transactions.more_details")}
            </button>

            {showMore && <div className="space-y-3">
              <div className="relative">
                <Label htmlFor="description" className="sr-only">{t("transactions.description")}</Label>
                <Input id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={type === "income" ? t("transactions.placeholders.description_income") : t("transactions.placeholders.description")} className="h-12 rounded-[14px] border-transparent bg-[#161913] text-[#f1f4ea] placeholder:text-[#58615a] focus-visible:border-white/20 focus-visible:ring-0" />
                <FileText aria-hidden="true" className="pointer-events-none absolute right-4 top-3.5 h-4 w-4 text-[#8f9588]" />
              </div>
              <div className="rounded-[18px] bg-[#161913] px-[18px] py-3">
                <Label id="new-transaction-tags-label" className="mb-2 block text-sm text-[#8f9588]">{t("transactions.tags")}</Label>
                <MultiSelectCreatable options={tagsList.map((item) => ({ label: item.name, value: item.name }))} values={tags} onChange={setTags} aria-labelledby="new-transaction-tags-label" placeholder={t("transactions.placeholders.tags")} />
              </div>
              {type === "expense" && <div className="flex items-center justify-between gap-4 rounded-[18px] bg-[#161913] px-[18px] py-3">
                <div className="space-y-1">
                  <Label htmlFor="recurring" className="text-sm font-medium text-[#f1f4ea]">{t("transactions.recurring_monthly")}</Label>
                  <p className="text-xs text-[#8f9588]">{t("transactions.recurring_same_day")}</p>
                </div>
                <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
              </div>}
            </div>}
          </div>

          <DialogFooter className="gap-2 bg-gradient-to-t from-[#0f110d] via-[#0f110d] px-6 pb-6 pt-4 sm:flex-row sm:space-x-0">
            <Button type="button" variant="ghost" onClick={() => setOpen?.(false)} disabled={isSubmitting} className="h-12 rounded-[14px] px-4 text-[#8f9588] hover:bg-transparent hover:text-[#f1f4ea]">{t("common.cancel")}</Button>
            <Button type="submit" className="h-12 flex-1 rounded-[16px] bg-[#c6f24e] text-[#10160a] hover:bg-[#d4fb58]" disabled={isSubmitting || accounts.length === 0}>
              {isSubmitting ? t("common.loading") : t("transactions.save_changes")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
