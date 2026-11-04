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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TransactionType, Currency } from "@/types";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, FileText, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatCurrency, convertCurrency } from "@/lib/utils";
import { MultiSelectCreatable } from "@/components/ui/multi-select-creatable";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AddTransactionDialogProps {
  defaultType?: TransactionType;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

type Preset = { name: string; children: string[] };

const PRESETS: Record<"ru" | "en", Record<TransactionType, Preset[]>> = {
  ru: {
    expense: [
      { name: "Продукты", children: ["Супермаркет", "Рынок", "Доставка"] },
      { name: "Транспорт", children: ["Такси", "Метро", "Авиа", "Аренда авто"] },
      { name: "Кафе", children: ["Кофе", "Обед", "Ужин"] },
      { name: "Жильё", children: ["Аренда", "Коммуналка", "Ремонт"] },
      { name: "Покупки", children: ["Одежда", "Техника", "Подарки"] },
      { name: "Здоровье", children: ["Аптека", "Врач", "Спорт"] },
    ],
    income: ["Зарплата", "Подработка", "Проценты", "Подарок"].map((name) => ({ name, children: [] })),
    transfer: ["Накопления", "Инвестиции", "Наличные"].map((name) => ({ name, children: [] })),
  },
  en: {
    expense: [
      { name: "Groceries", children: ["Supermarket", "Market", "Delivery"] },
      { name: "Transport", children: ["Taxi", "Metro", "Flights", "Car rental"] },
      { name: "Cafes", children: ["Coffee", "Lunch", "Dinner"] },
      { name: "Housing", children: ["Rent", "Utilities", "Repairs"] },
      { name: "Shopping", children: ["Clothes", "Tech", "Gifts"] },
      { name: "Health", children: ["Pharmacy", "Doctor", "Sport"] },
    ],
    income: ["Salary", "Side job", "Interest", "Gift"].map((name) => ({ name, children: [] })),
    transfer: ["Savings", "Investments", "Cash"].map((name) => ({ name, children: [] })),
  },
};

const CURRENCY_SYMBOLS: Record<Currency, string> = { USD: "$", EUR: "€", GBP: "£", RUB: "₽" };
const CURRENCIES: Currency[] = ["USD", "EUR", "RUB", "GBP"];

function toLocalDateTimeInput(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function dateWithOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalDateTimeInput(date);
}

function formatTodayTime(date: string, language: string) {
  return new Date(date).toLocaleTimeString(language === "ru" ? "ru-RU" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AddTransactionDialog({
  defaultType = "expense",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: AddTransactionDialogProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language.startsWith("ru") ? "ru" : "en";
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [date, setDate] = useState(() => toLocalDateTimeInput(new Date()));
  const [tags, setTags] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isMandatory, setIsMandatory] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedSummary, setSavedSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { accounts, tags: tagsList, addTransaction, defaultCurrency, categories } = useStore();
  const selectedAccount = accounts.find((account) => account.id === Number(accountId));
  const destinationAccounts = accounts.filter((account) => (
    account.id !== Number(accountId) &&
    (!selectedAccount || account.currency === selectedAccount.currency)
  ));
  const presets = PRESETS[language][type];
  const categoryOptions = useMemo(() => type === "transfer"
    ? destinationAccounts.map((account) => account.name)
    : Array.from(new Set([...presets.map((item) => item.name), ...categories.map((item) => item.name)])),
    [categories, destinationAccounts, presets, type]);
  const selectedPreset = presets.find((item) => item.name === category);
  const destinationAccountFromChip = destinationAccounts.find((account) => account.name === category);
  const parsedAmount = Number(amount);
  const ready = parsedAmount > 0 && Boolean(accountId) && Boolean(category);
  const balanceIsInsufficient = type === "expense" && Boolean(
    selectedAccount && Number.isFinite(parsedAmount) && parsedAmount > selectedAccount.balance,
  );
  const typeTone = type === "expense" ? "#ff6f6a" : type === "income" ? "#c6f24e" : "#5aa9f0";
  const toneStyle = { "--operation-tone": typeTone } as CSSProperties;

  const resetForm = () => {
    setAmount("");
    setCurrency(defaultCurrency);
    setDescription("");
    setAccountId("");
    setToAccountId("");
    setCategory("");
    setSubcategory("");
    setDate(toLocalDateTimeInput(new Date()));
    setTags([]);
    setIsRecurring(false);
    setIsMandatory(false);
    setShowMore(false);
    setSaved(false);
    setSavedSummary("");
  };

  const changeType = (nextType: TransactionType) => {
    setType(nextType);
    setCategory("");
    setSubcategory("");
    if (nextType !== "transfer") setToAccountId("");
  };

  const changeAccount = (value: string) => {
    setAccountId(value);
    const nextAccount = accounts.find((account) => account.id === Number(value));
    const currentDestination = accounts.find((account) => account.id === Number(toAccountId));
    if (nextAccount) setCurrency(nextAccount.currency);
    if (!nextAccount || !currentDestination || currentDestination.id === nextAccount.id || currentDestination.currency !== nextAccount.currency) {
      setToAccountId("");
    }
  };

  const changeCurrency = () => {
    setCurrency(CURRENCIES[(CURRENCIES.indexOf(currency) + 1) % CURRENCIES.length]);
  };

  const chooseDate = (days: number) => setDate(dateWithOffset(days));

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError(null);
    const parsedDate = new Date(date);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return setError(t("transactions.validation.amount"));
    if (!selectedAccount) return setError(t("transactions.validation.account"));
    if (currency !== selectedAccount.currency) return setError(t("transactions.currency_account_mismatch", { currency: selectedAccount.currency }));
    if (type === "transfer") {
      if (!destinationAccountFromChip) return setError(t("transactions.validation.destination"));
      if (destinationAccountFromChip.currency !== selectedAccount.currency) return setError(t("transactions.validation.transfer_currency"));
    }
    if (!category.trim()) return setError(t("transactions.validation.category"));
    if (Number.isNaN(parsedDate.getTime())) return setError(t("transactions.validation.date"));

    setIsSubmitting(true);
    try {
      const finalCategory = subcategory ? `${category} / ${subcategory}` : category.trim();
      await addTransaction({
        type,
        amount: parsedAmount,
        currency,
        accountId: Number(accountId),
        toAccountId: type === "transfer" ? destinationAccountFromChip?.id : undefined,
        category: finalCategory,
        date: parsedDate.toISOString(),
        description,
        tags: tags.length > 0 ? tags : undefined,
        isRecurring: isRecurring || isMandatory,
        status: "completed",
      });
      setSavedSummary(`${type === "expense" ? "−" : type === "income" ? "+" : ""}${CURRENCY_SYMBOLS[currency]}${amount} · ${finalCategory} · ${selectedAccount.name}`);
      setSaved(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (isSubmitting && !value) return;
      setOpen?.(value);
      if (value) { setType(defaultType); setError(null); setSaved(false); }
    }}>
      {trigger !== null && <DialogTrigger asChild>{trigger || <Button><Plus className="mr-2 h-4 w-4" />{t("transactions.add_button")}</Button>}</DialogTrigger>}
      <DialogContent
        className="flex max-h-[min(94dvh,900px)] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-[28px] border-[rgba(200,240,90,.09)] bg-[#0f110d] p-0 text-[#f1f4ea] shadow-2xl sm:max-w-[440px] [&>button:last-child]:right-5 [&>button:last-child]:top-5 [&>button:last-child]:h-[34px] [&>button:last-child]:w-[34px] [&>button:last-child]:rounded-full [&>button:last-child]:bg-[#161913] [&>button:last-child]:text-[#8f9588] [&>button:last-child]:opacity-100 [&>button:last-child]:hover:bg-[#1e2218] [&>button:last-child]:hover:text-[#f1f4ea]"
        style={toneStyle}
      >
        {saved ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto mb-[18px] grid h-[60px] w-[60px] place-items-center rounded-full bg-[#c6f24e] text-2xl text-[#10160a]">✓</div>
            <DialogTitle className="text-[17px] font-semibold text-[#f1f4ea]">{t("transactions.saved_title")}</DialogTitle>
            <DialogDescription className="mt-2 text-[#8f9588]">{savedSummary}</DialogDescription>
            <Button type="button" variant="ghost" onClick={() => { resetForm(); setType(type); }} className="mt-[18px] text-[#c6f24e] hover:bg-transparent hover:text-[#d4fb58]">{t("transactions.add_another")}</Button>
          </div>
        ) : (
          <>
            <DialogHeader className="px-6 pb-2 pt-6 pr-12 text-left">
              <DialogTitle className="text-[17px] font-semibold tracking-tight text-[#f1f4ea]">{t("transactions.add_dialog_title")}</DialogTitle>
              <DialogDescription className="sr-only">{t("transactions.add_dialog_desc")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 space-y-5 overflow-y-auto px-6 pb-2">
                {error && <Alert variant="destructive" role="alert" className="border-[#ff6f6a]/30 bg-[#ff6f6a]/10 text-[#ffaaa6]"><AlertDescription>{error}</AlertDescription></Alert>}
                {accounts.length === 0 && <Alert className="border-[#c6f24e]/20 bg-[#161913] text-[#f1f4ea]"><AlertDescription>{t("transactions.validation.no_accounts")}</AlertDescription></Alert>}

                <fieldset>
                  <legend className="sr-only">{t("transactions.type")}</legend>
                  <div className="relative grid grid-cols-3 rounded-[14px] bg-[#161913] p-1">
                    <span aria-hidden="true" className="absolute bottom-1 top-1 w-[calc((100%-8px)/3)] rounded-[10px] bg-[#1e2218] transition-transform duration-200" style={{ transform: `translateX(${type === "expense" ? 0 : type === "income" ? 100 : 200}%)` }} />
                    {([["expense", ArrowUpRight], ["income", ArrowDownLeft], ["transfer", ArrowLeftRight]] as const).map(([value, Icon]) => <label key={value} className="relative z-10 cursor-pointer"><input type="radio" name="transaction-type" value={value} checked={type === value} onChange={() => changeType(value)} className="peer sr-only" /><span className="flex min-h-10 items-center justify-center gap-2 rounded-[10px] px-2 text-sm font-medium text-[#8f9588] transition-colors peer-checked:text-[var(--operation-tone)] peer-focus-visible:ring-2 peer-focus-visible:ring-[#c6f24e]"><Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{t(`transactions.types.${value}`)}</span></label>)}
                  </div>
                </fieldset>

                <div className="py-5 text-center">
                  <Label htmlFor="amount" className="sr-only">{t("transactions.amount")}</Label>
                  <div className="flex items-baseline justify-center text-[var(--operation-tone)]"><span className="mr-1 text-[32px] opacity-60">{type === "expense" ? "−" : type === "income" ? "+" : ""}</span><button type="button" title={t("transactions.change_currency")} aria-label={t("transactions.change_currency")} onClick={changeCurrency} className="mr-1 rounded-lg bg-transparent text-[28px] font-medium opacity-60 hover:bg-[#161913] hover:opacity-100">{CURRENCY_SYMBOLS[currency]}</button><Input id="amount" type="number" inputMode="decimal" step="0.01" min="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required placeholder="0" className="h-auto w-[min(8ch,100%)] min-w-0 rounded-lg border-0 bg-transparent px-0 text-center text-[56px] font-semibold leading-none tracking-[-0.05em] text-[var(--operation-tone)] shadow-none placeholder:text-[#262c20] focus-visible:ring-2 focus-visible:ring-[#c6f24e] focus-visible:ring-offset-0" /></div>
                  <p className={`mt-3 min-h-5 text-[13px] ${balanceIsInsufficient ? "text-[#ff6f6a]" : "text-[#8f9588]"}`} aria-live="polite">{selectedAccount && Number.isFinite(parsedAmount) && parsedAmount > 0 ? balanceIsInsufficient ? t("transactions.insufficient_balance", { amount: formatCurrency(parsedAmount - selectedAccount.balance, selectedAccount.currency) }) : t("transactions.available_balance", { amount: formatCurrency(selectedAccount.balance, selectedAccount.currency) }) : ""}</p>
                </div>

                <div className="overflow-hidden rounded-[18px] bg-[#161913]"><div className="flex min-h-[54px] items-center justify-between gap-3 px-[18px]"><Label htmlFor="account" className="text-[#8f9588]">{type === "transfer" ? t("transactions.from_account") : t("transactions.account")}</Label><Select value={accountId} onValueChange={changeAccount}><SelectTrigger id="account" className="h-auto w-auto min-w-0 justify-end gap-1 border-0 bg-transparent p-0 text-sm font-medium text-[#f1f4ea] shadow-none focus:ring-0"><SelectValue placeholder={t("transactions.placeholders.select_account")} /></SelectTrigger><SelectContent>{accounts.map((account) => { const convertedBalance = convertCurrency(account.balance, account.currency, defaultCurrency); return <SelectItem key={account.id} value={account.id.toString()}>{account.name} ({formatCurrency(account.balance, account.currency)}{account.currency !== defaultCurrency && ` ≈ ${formatCurrency(convertedBalance, defaultCurrency)}`})</SelectItem>; })}</SelectContent></Select></div></div>

                <div><p className="mb-2 ml-0.5 text-[13px] text-[#8f9588]">{type === "transfer" ? t("transactions.transfer_destination") : t("transactions.category")}</p><div className="flex flex-wrap gap-2">{categoryOptions.map((option) => <button key={option} type="button" aria-pressed={category === option} onClick={() => { setCategory(category === option ? "" : option); setSubcategory(""); }} className="rounded-full border border-transparent bg-[#161913] px-4 py-2 text-sm font-medium text-[#f1f4ea] transition-colors hover:bg-[#1e2218] aria-pressed:border-[var(--operation-tone)] aria-pressed:bg-transparent aria-pressed:text-[var(--operation-tone)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6f24e]">{option}</button>)}</div>{type !== "transfer" && selectedPreset && selectedPreset.children.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{selectedPreset.children.map((option) => <button key={option} type="button" aria-pressed={subcategory === option} onClick={() => setSubcategory(subcategory === option ? "" : option)} className="rounded-full border border-transparent bg-[#161913] px-[13px] py-[7px] text-[13px] text-[#8f9588] aria-pressed:border-[var(--operation-tone)] aria-pressed:bg-transparent aria-pressed:text-[var(--operation-tone)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6f24e]">{option}</button>)}</div>}</div>

                <div className="flex min-h-[54px] items-center justify-between gap-3 rounded-[18px] bg-[#161913] px-[18px]"><span className="text-[#8f9588]">{t("common.date")}</span><span className="flex items-center gap-1"><button type="button" aria-pressed={date.slice(0, 10) === dateWithOffset(0).slice(0, 10)} onClick={() => chooseDate(0)} className="rounded-full px-3 py-1.5 text-sm text-[#8f9588] aria-pressed:bg-[#1e2218] aria-pressed:text-[#f1f4ea]">{t("common.today")}{date.slice(0, 10) === dateWithOffset(0).slice(0, 10) && `, ${formatTodayTime(date, i18n.language)}`}</button><button type="button" aria-pressed={date.slice(0, 10) === dateWithOffset(-1).slice(0, 10)} onClick={() => chooseDate(-1)} className="rounded-full px-3 py-1.5 text-sm text-[#8f9588] aria-pressed:bg-[#1e2218] aria-pressed:text-[#f1f4ea]">{t("common.yesterday")}</button></span></div>

                <button type="button" className="w-fit border-0 bg-transparent px-0 pb-1 text-sm font-medium text-[#8f9588] hover:text-[#f1f4ea]" onClick={() => setShowMore(!showMore)}>{showMore ? "− " : "＋ "}{showMore ? t("transactions.hide_details") : t("transactions.more_details")}</button>
                {showMore && <div className="space-y-3"><div className="relative"><Label htmlFor="description" className="sr-only">{t("transactions.description")}</Label><Input id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={type === "income" ? t("transactions.placeholders.description_income") : t("transactions.placeholders.description")} className="h-12 rounded-[14px] border-transparent bg-[#161913] text-[#f1f4ea] placeholder:text-[#58615a] focus-visible:border-white/20 focus-visible:ring-0" /><FileText aria-hidden="true" className="pointer-events-none absolute right-4 top-3.5 h-4 w-4 text-[#8f9588]" /></div><div className="rounded-[18px] bg-[#161913] px-[18px] py-3"><Label id="new-transaction-tags-label" className="mb-2 block text-sm text-[#8f9588]">{t("transactions.tags")}</Label><MultiSelectCreatable options={tagsList.map((item) => ({ label: item.name, value: item.name }))} values={tags} onChange={setTags} aria-labelledby="new-transaction-tags-label" placeholder={t("transactions.placeholders.tags")} /></div></div>}

                <div className="flex items-center justify-between gap-4 px-0 py-1"><div><Label htmlFor="recurring" className="text-sm font-medium text-[#f1f4ea]">{t("transactions.recurring_monthly")}</Label>{isRecurring && <p className="text-xs text-[#8f9588]">{t("transactions.recurring_same_day")}</p>}</div><Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} className="h-[26px] w-11 data-[state=checked]:bg-[#c6f24e]" /></div>
                {type === "expense" && <div className="flex items-center justify-between gap-4 px-0 py-1"><Label htmlFor="mandatory" className="text-sm font-medium text-[#f1f4ea]">{t("transactions.mandatory_expense")}</Label><Switch id="mandatory" checked={isMandatory} onCheckedChange={setIsMandatory} className="h-[26px] w-11 data-[state=checked]:bg-[#c6f24e]" /></div>}
              </div>

              <DialogFooter className="gap-2 bg-gradient-to-t from-[#0f110d] via-[#0f110d] px-6 pb-6 pt-4 sm:flex-row sm:space-x-0"><Button type="button" variant="ghost" onClick={() => setOpen?.(false)} disabled={isSubmitting} className="h-12 rounded-[14px] px-4 text-[#8f9588] hover:bg-transparent hover:text-[#f1f4ea]">{t("common.cancel")}</Button><Button type="submit" className={`h-12 flex-1 rounded-[16px] text-[#10160a] ${ready ? "bg-[#c6f24e] hover:bg-[#d4fb58]" : "bg-[#161913] text-[#5b645c] hover:bg-[#161913]"}`} disabled={isSubmitting || accounts.length === 0}>{isSubmitting ? t("common.loading") : t("transactions.save_changes")}</Button></DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
