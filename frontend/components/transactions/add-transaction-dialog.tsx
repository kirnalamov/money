"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { format, isSameDay, subDays } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { CalendarDays, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { MultiSelectCreatable } from "@/components/ui/multi-select-creatable";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransactionType } from "@/types";
import { getCategoryIcon, getCategoryLabel } from "./transaction-list";

interface AddTransactionDialogProps {
  defaultType?: TransactionType;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

const TYPES: TransactionType[] = ["expense", "income", "transfer"];
const TYPE_STYLE: Record<TransactionType, string> = {
  expense: "border-expense bg-expense/10 text-expense",
  income: "border-income bg-income/10 text-income",
  transfer: "border-foreground bg-secondary text-foreground",
};
const AMOUNT_COLOR: Record<TransactionType, string> = {
  expense: "text-expense",
  income: "text-income",
  transfer: "text-foreground",
};
const SIGN: Record<TransactionType, string> = { expense: "−", income: "+", transfer: "" };
const pill = "inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function currencySymbol(currency: string, language: string) {
  const parts = new Intl.NumberFormat(language, { style: "currency", currency }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? currency;
}

function AddTransactionForm({ defaultType, onClose }: { defaultType: TransactionType; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const dateLocale = language === "ru" ? ru : enUS;
  const { accounts, categories, tags: tagsList, addTransaction } = useStore();

  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [category, setCategory] = useState("");
  const [day, setDay] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [recurring, setRecurring] = useState(false);
  const [mandatory, setMandatory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savingRef = useRef(false);
  const againRef = useRef<HTMLButtonElement>(null);

  const account = accounts.find((item) => item.id === Number(accountId));
  const destinations = accounts.filter((item) => (
    item.id !== account?.id &&
    item.currency === account?.currency &&
    (item.type !== "brokerage" || accounts.length === 1)
  ));
  const parsed = Number(amount);
  const hasAmount = Number.isFinite(parsed) && parsed > 0;
  const today = new Date();
  const isToday = isSameDay(day, today);
  const isYesterday = isSameDay(day, subDays(today, 1));
  const isCustom = !isToday && !isYesterday;

  useEffect(() => {
    if (saved) againRef.current?.focus();
  }, [saved]);

  const changeType = (next: TransactionType) => {
    setType(next);
    setError(null);
    if (next !== "transfer") setToAccountId("");
    if (next !== "expense") { setRecurring(false); setMandatory(false); }
  };

  const changeAccount = (value: string) => {
    setAccountId(value);
    const next = accounts.find((item) => item.id === Number(value));
    const dest = accounts.find((item) => item.id === Number(toAccountId));
    if (!next || !dest || dest.id === next.id || dest.currency !== next.currency) setToAccountId("");
  };

  const reset = () => {
    setAmount(""); setAccountId(""); setToAccountId(""); setCategory("");
    setDay(new Date()); setMore(false); setDescription(""); setTags([]);
    setRecurring(false); setMandatory(false); setError(null);
    savingRef.current = false; setSaving(false); setSaved(false);
    requestAnimationFrame(() => document.getElementById("add-tx-amount")?.focus());
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingRef.current) return;
    setError(null);
    const destination = type === "transfer" ? accounts.find((item) => item.id === Number(toAccountId)) : undefined;
    const finalCategory = type === "transfer" ? destination?.name : category.trim();

    if (!hasAmount || !account || (type !== "transfer" && !finalCategory)) {
      setError(t("transactions.dialog.fill_required"));
      return;
    }
    if (type === "transfer" && !destination) {
      setError(t("transactions.dialog.pick_destination"));
      return;
    }
    if (destination && destination.currency !== account.currency) {
      setError(t("transactions.dialog.currency_mismatch", { currency: account.currency }));
      return;
    }

    // Selected day plus current time; ISO is computed only on save.
    const when = new Date(day);
    const now = new Date();
    when.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);

    savingRef.current = true;
    setSaving(true);
    try {
      await addTransaction({
        amount: parsed,
        type,
        currency: account.currency,
        accountId: account.id,
        toAccountId: destination?.id,
        category: finalCategory as string,
        date: when.toISOString(),
        description: description.trim() || undefined,
        tags: tags.length ? tags : undefined,
        isRecurring: recurring || mandatory,
        status: "completed",
      });
      setSaved(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("transactions.dialog.save_failed"));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="grid justify-items-center gap-4 py-8 text-center" role="status">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-income/10 text-income"><Check className="h-7 w-7" aria-hidden="true" /></span>
        <div className="grid gap-1">
          <p className="text-base font-semibold text-foreground">{t("transactions.dialog.saved_title")}</p>
          <p className="text-sm text-muted-foreground">{t("transactions.dialog.saved_desc")}</p>
        </div>
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>{t("transactions.dialog.close")}</Button>
          <Button ref={againRef} type="button" className="min-h-11" onClick={reset}>{t("transactions.dialog.add_another")}</Button>
        </div>
      </div>
    );
  }

  const balanceHint = account && type !== "income" && (() => {
    if (!hasAmount) return t("transactions.dialog.available", { amount: formatMoney(account.balance, account.currency, language) });
    const diff = account.balance - parsed;
    return diff >= 0
      ? t("transactions.dialog.available", { amount: formatMoney(account.balance, account.currency, language) })
      : t("transactions.dialog.shortfall", { amount: formatMoney(-diff, account.currency, language) });
  })();
  const short = !!account && type !== "income" && hasAmount && account.balance < parsed;

  return (
    <form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-5" noValidate>
      <div role="tablist" aria-label={t("transactions.dialog.title")} className="grid grid-cols-3 gap-2">
        {TYPES.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={type === item}
            onClick={() => changeType(item)}
            className={cn(pill, "w-full", type === item ? TYPE_STYLE[item] : "border-border text-muted-foreground hover:text-foreground")}
          >
            {t(`transactions.dialog.tab_${item}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Label htmlFor="add-tx-amount">{t("transactions.dialog.amount")}</Label>
        <div className="flex min-h-14 items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
          <span className={cn("max-w-[40%] shrink-0 truncate text-3xl font-bold leading-none tabular-nums", AMOUNT_COLOR[type])} aria-hidden="true">
            {SIGN[type]}{account ? currencySymbol(account.currency, language) : ""}
          </span>
          <input
            id="add-tx-amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            placeholder={t("transactions.dialog.amount_placeholder")}
            aria-describedby="add-tx-hint"
            onChange={(event) => {
              const value = event.target.value.replace(",", ".");
              if (/^\d*\.?\d*$/.test(value)) setAmount(value);
            }}
            className={cn("w-full min-w-0 flex-1 bg-transparent py-2 text-3xl font-bold leading-none tabular-nums placeholder:text-muted-foreground focus:outline-none", AMOUNT_COLOR[type])}
          />
        </div>
        <p id="add-tx-hint" className={cn("min-h-4 text-xs tabular-nums", short ? "text-expense" : "text-muted-foreground")}>{balanceHint}</p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Label htmlFor="add-tx-account">{type === "transfer" ? t("transactions.dialog.from_account") : t("transactions.dialog.account")}</Label>
        <Select name="account" value={accountId} onValueChange={changeAccount}>
          <SelectTrigger id="add-tx-account" className="min-h-11"><SelectValue placeholder={t("transactions.dialog.select_account")} /></SelectTrigger>
          <SelectContent>
            {accounts.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name} ({item.currency})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {type === "transfer" ? (
        <div className="grid grid-cols-1 gap-2">
          <Label htmlFor="add-tx-to">{t("transactions.dialog.to_account")}</Label>
          <Select name="toAccount" value={toAccountId} onValueChange={setToAccountId}>
            <SelectTrigger id="add-tx-to" className="min-h-11"><SelectValue placeholder={t("transactions.dialog.destination_label")} /></SelectTrigger>
            <SelectContent>
              {destinations.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name} ({item.currency})</SelectItem>)}
              {destinations.length === 0 && <SelectItem value="none" disabled>{t("transactions.dialog.no_destination")}</SelectItem>}
            </SelectContent>
          </Select>
          {account && destinations.length === 0 && <p className="text-xs text-muted-foreground">{t("transactions.dialog.no_destination")}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          <Label id="add-tx-category-label">{t("transactions.dialog.category")}</Label>
          {categories.length === 0 ? (
            <CreatableCombobox options={[]} value={category} onChange={setCategory} placeholder={t("transactions.placeholders.category")} />
          ) : (
            <div role="group" aria-labelledby="add-tx-category-label" className="flex flex-wrap gap-2">
              {categories.map((item) => {
                const Icon = getCategoryIcon(type, item.name);
                const active = category === item.name;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(active ? "" : item.name)}
                    className={cn(pill, active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground")}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="truncate">{getCategoryLabel(t, item.name)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        <Label id="add-tx-date-label">{t("transactions.dialog.date")}</Label>
        <div role="group" aria-labelledby="add-tx-date-label" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={isToday} onClick={() => setDay(new Date())} className={cn(pill, isToday ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground")}>{t("transactions.dialog.today")}</button>
          <button type="button" aria-pressed={isYesterday} onClick={() => setDay(subDays(new Date(), 1))} className={cn(pill, isYesterday ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground")}>{t("transactions.dialog.yesterday")}</button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button type="button" aria-pressed={isCustom} className={cn(pill, isCustom ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {t("transactions.dialog.pick_date")}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={day}
                defaultMonth={day}
                disabled={{ after: new Date() }}
                onSelect={(value) => { if (value) { setDay(value); setCalendarOpen(false); } }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">{format(day, "d MMMM yyyy", { locale: dateLocale })}</p>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore((value) => !value)}
          className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {more ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
          {more ? t("transactions.dialog.less") : t("transactions.dialog.more")}
        </button>
        {more && (
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="add-tx-description">{t("transactions.dialog.description")}</Label>
              <Input id="add-tx-description" name="description" className="min-h-11" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("transactions.dialog.description_placeholder")} />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label id="add-tx-tags-label">{t("transactions.dialog.tags")}</Label>
              <MultiSelectCreatable
                aria-labelledby="add-tx-tags-label"
                options={tagsList.map((tag) => ({ label: tag.name, value: tag.name }))}
                values={tags}
                onChange={setTags}
                placeholder={t("transactions.dialog.add_tag")}
              />
            </div>
          </div>
        )}
      </div>

      {type === "expense" && (
        <div className="grid grid-cols-1 gap-2">
          <Label htmlFor="add-tx-recurring" className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border p-3">
            <span className="grid min-w-0 gap-0.5">
              <span>{t("transactions.dialog.recurring")}</span>
              <span className="text-xs font-normal text-muted-foreground">{t("transactions.dialog.recurring_hint")}</span>
            </span>
            <Switch id="add-tx-recurring" name="recurring" checked={recurring} onCheckedChange={setRecurring} />
          </Label>
          <Label htmlFor="add-tx-mandatory" className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border p-3">
            <span className="min-w-0">{t("transactions.dialog.mandatory")}</span>
            <Switch id="add-tx-mandatory" name="mandatory" checked={mandatory} onCheckedChange={setMandatory} />
          </Label>
        </div>
      )}

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>{t("transactions.dialog.cancel")}</Button>
        <Button type="submit" className="min-h-11" disabled={saving}>{saving ? t("transactions.dialog.saving") : t("transactions.dialog.save")}</Button>
      </div>
    </form>
  );
}

export function AddTransactionDialog({
  defaultType = "expense",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: AddTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  const { t } = useTranslation();
  const openerRef = useRef<HTMLElement | null>(null);
  const uncontrolled = controlledOpen === undefined;

  // Hotkey N only in trigger mode; defaultPrevented makes one press open one dialog.
  useEffect(() => {
    if (!uncontrolled || open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "n" || event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      setInternalOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [uncontrolled, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || <button type="button">{t("transactions.dialog.title")}</button>}
        </DialogTrigger>
      )}
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          openerRef.current = document.activeElement as HTMLElement | null;
          event.preventDefault();
          document.getElementById("add-tx-amount")?.focus();
        }}
        onCloseAutoFocus={(event) => {
          if (openerRef.current?.isConnected) { event.preventDefault(); openerRef.current.focus(); }
        }}
        className="left-0 top-0 grid-cols-1 overflow-x-hidden h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 gap-5 rounded-none border-0 bg-card p-4 data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-[464px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:p-6 sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]"
      >
        <DialogTitle className="pr-10 text-base font-semibold leading-6">{t("transactions.dialog.title")}</DialogTitle>
        <AddTransactionForm defaultType={defaultType} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
