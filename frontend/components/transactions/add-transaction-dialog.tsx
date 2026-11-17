"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { format, isSameDay, subDays } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { useStore } from "@/lib/store";
import { cn, formatMoney } from "@/lib/utils";
import { hashColor } from "@/lib/plutus-format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card, Chip, CURRENCY_SYMBOL, CurBtn, Dot, DoneScreen, evalAmount, Fld, fldInput, fldInputBig, GhostBtn, Hint,
  Lbl, LinkBtn, ModalActions, parseRuDate, Pick, PrimaryBtn, Seg, Suffix, SwitchRow, TONE,
} from "@/components/ui/modal-kit";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TradeForm } from "@/components/trading/trade-form";
import { TransactionType } from "@/types";

export type DialogType = TransactionType | "trade";

interface AddTransactionDialogProps {
  defaultType?: DialogType;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

const TYPES: DialogType[] = ["expense", "income", "transfer", "trade"];
const SIGN: Record<TransactionType, string> = { expense: "−", income: "+", transfer: "" };

function AddTransactionForm({ defaultType, onClose }: { defaultType: DialogType; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const dateLocale = language === "ru" ? ru : enUS;
  const { accounts, categories, tags: tagsList, addTransaction } = useStore();

  const [type, setType] = useState<DialogType>(defaultType);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState(false);
  const [day, setDay] = useState(() => new Date());
  const [otherDate, setOtherDate] = useState(false);
  const [dateText, setDateText] = useState("");
  const [more, setMore] = useState(false);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [recurring, setRecurring] = useState(false);
  const [mandatory, setMandatory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string[] | null>(null);
  const savingRef = useRef(false);
  const againRef = useRef<HTMLButtonElement>(null);

  const flow: TransactionType | null = type === "trade" ? null : type;
  const parsed = evalAmount(amount);
  const hasAmount = Number.isFinite(parsed) && parsed > 0;
  const account = accounts.find((item) => item.id === Number(accountId)) ?? (accountId === "" ? (accounts.find((item) => item.type !== "brokerage") ?? accounts[0]) : undefined);
  const destinations = accounts.filter((item) => (
    item.id !== account?.id &&
    item.currency === account?.currency &&
    (item.type !== "brokerage" || accounts.length === 1)
  ));
  const toAccount = destinations.find((item) => item.id === Number(toAccountId)) ?? destinations[0];
  const currencies = Array.from(new Set(accounts.map((item) => item.currency)));
  const today = new Date();
  const isToday = !otherDate && isSameDay(day, today);
  const isYesterday = !otherDate && isSameDay(day, subDays(today, 1));

  useEffect(() => {
    if (saved) againRef.current?.focus();
  }, [saved]);

  const changeType = (next: DialogType) => {
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

  const pickCurrency = (currency: string) => {
    if (account?.currency === currency) return;
    const next = accounts.find((item) => item.currency === currency);
    if (next) changeAccount(String(next.id));
  };

  const swap = () => {
    if (!account || !toAccount) return;
    setAccountId(String(toAccount.id));
    setToAccountId(String(account.id));
  };

  const pickDate = (value: Date) => { setDay(value); setOtherDate(false); };

  const onDateText = (value: string) => {
    setDateText(value);
    const next = parseRuDate(value);
    if (next && next <= new Date()) setDay(next);
  };

  const toggleTag = (name: string) => setTags((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));

  const reset = () => {
    setAmount(""); setAccountId(""); setToAccountId(""); setCategory(""); setNewCategory(false);
    setDay(new Date()); setOtherDate(false); setDateText(""); setMore(false); setDescription(""); setTags([]);
    setRecurring(false); setMandatory(false); setError(null);
    savingRef.current = false; setSaving(false); setSaved(null);
    requestAnimationFrame(() => document.getElementById("add-tx-amount")?.focus());
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!flow || savingRef.current) return;
    setError(null);
    const destination = flow === "transfer" ? toAccount : undefined;
    const finalCategory = flow === "transfer" ? destination?.name : category.trim();

    if (!hasAmount || !account || (flow !== "transfer" && !finalCategory)) {
      setError(t("transactions.dialog.fill_required"));
      return;
    }
    if (flow === "transfer" && !destination) {
      setError(t("transactions.dialog.pick_destination"));
      return;
    }
    if (destination && destination.currency !== account.currency) {
      setError(t("transactions.dialog.currency_mismatch", { currency: account.currency }));
      return;
    }
    if (otherDate && (!parseRuDate(dateText) || (parseRuDate(dateText) as Date) > new Date())) {
      setError(t("transactions.dialog.bad_date"));
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
        type: flow,
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
      setSaved([
        `${SIGN[flow]}${formatMoney(parsed, account.currency, language)}`,
        flow === "transfer" ? `${account.name} → ${destination?.name}` : `${finalCategory} · ${account.name}`,
      ]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("transactions.dialog.save_failed"));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const typeTabs = (
    <div role="tablist" aria-label={t("transactions.dialog.title")} className="flex gap-1.5">
      {TYPES.map((item) => (
        <Seg
          key={item}
          role="tab"
          aria-selected={type === item}
          active={type === item}
          tone={TONE[item]}
          onClick={() => changeType(item)}
          className="min-h-11 px-1"
        >
          {t(`transactions.dialog.tab_${item}`)}
        </Seg>
      ))}
    </div>
  );

  if (saved && flow) {
    return (
      <DoneScreen
        title={t(`transactions.dialog.done_${flow}`)}
        lines={saved}
        actions={
          <>
            <GhostBtn ref={againRef} className="min-h-11" onClick={reset}>{t("transactions.dialog.add_another")}</GhostBtn>
            <PrimaryBtn className="min-h-11" onClick={onClose}>{t("transactions.dialog.done")}</PrimaryBtn>
          </>
        }
      />
    );
  }

  if (type === "trade") {
    return (
      <div className="grid min-w-0 grid-cols-1 gap-[18px]">
        {typeTabs}
        <TradeForm onClose={onClose} />
      </div>
    );
  }

  const short = !!account && flow !== "income" && hasAmount && account.balance < parsed;
  const balanceHint = account && flow !== "income"
    ? (short
      ? t("transactions.dialog.shortfall", { amount: formatMoney(parsed - account.balance, account.currency, language) })
      : t("transactions.dialog.available", { amount: formatMoney(account.balance, account.currency, language) }))
    : "";
  const sym = account ? CURRENCY_SYMBOL[account.currency] ?? account.currency : "";
  const accountOptions = (list: typeof accounts, value: string, onChange: (v: string) => void, label: string) => (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-11 w-full min-w-0 flex-1 cursor-pointer bg-transparent text-sm text-foreground outline-none [&>option]:bg-card"
    >
      {list.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatMoney(item.balance, item.currency, language)}</option>)}
    </select>
  );

  return (
    <form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-[18px]" noValidate>
      {typeTabs}

      {flow !== "transfer" ? (
        <>
          <div>
            <Lbl htmlFor="add-tx-amount" hint={t("transactions.dialog.amount_hint")}>{t("transactions.dialog.amount")}</Lbl>
            <Fld
              big
              prefix={<span className="shrink-0 text-[26px] font-bold" style={{ color: TONE[flow as "expense" | "income"] }} aria-hidden="true">{SIGN[flow as "expense" | "income"]}</span>}
              suffix={<Suffix big>{sym}</Suffix>}
            >
              <input
                id="add-tx-amount"
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                placeholder={t("transactions.dialog.amount_placeholder")}
                aria-describedby="add-tx-hint"
                onChange={(event) => {
                  const value = event.target.value;
                  if (/^[\d\s.,+\-−]*$/.test(value)) setAmount(value);
                }}
                className={cn(fldInputBig, "w-full")}
              />
            </Fld>
            {currencies.length > 1 && (
              <div role="group" aria-label={t("transactions.dialog.currency")} className="mt-2.5 flex flex-wrap gap-1.5">
                {currencies.map((cur) => (
                  <CurBtn key={cur} active={account?.currency === cur} title={cur} aria-label={cur} onClick={() => pickCurrency(cur)}>
                    {CURRENCY_SYMBOL[cur] ?? cur}
                  </CurBtn>
                ))}
              </div>
            )}
            <Hint id="add-tx-hint" tone={short ? "red" : "muted"}>
              {hasAmount && /[+\-−]/.test(amount.trim().replace(/^[+\-−]/, "")) ? `= ${formatMoney(parsed, account?.currency ?? "USD", language)}` : balanceHint}
            </Hint>
          </div>

          <div>
            <Lbl hint={t("transactions.dialog.account_hint")}>{t("transactions.dialog.account")}</Lbl>
            <div role="group" aria-label={t("transactions.dialog.account")} className="flex flex-col gap-1.5">
              {accounts.map((item) => (
                <Pick key={item.id} active={account?.id === item.id} className="min-h-11" onClick={() => changeAccount(String(item.id))}>
                  <Dot color={hashColor(String(item.id))} />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{item.name}</span>
                  <span className={cn("text-[13px] font-semibold tabular-nums", item.balance < 0 && "text-expense")}>{formatMoney(item.balance, item.currency, language)}</span>
                </Pick>
              ))}
            </div>
          </div>

          <div>
            <Lbl hint={t("transactions.dialog.category_hint")}>{t("transactions.dialog.category")}</Lbl>
            <div role="group" aria-label={t("transactions.dialog.category")} className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <Chip key={item.id} active={category === item.name} className="min-h-11" onClick={() => setCategory(category === item.name ? "" : item.name)}>
                  <Dot color={item.color || hashColor(item.name)} className="h-2 w-2" />
                  <span className="truncate">{item.name}</span>
                </Chip>
              ))}
              <Chip dashed className="min-h-11" onClick={() => setNewCategory((v) => !v)}>{t("transactions.dialog.new_category")}</Chip>
            </div>
            {(newCategory || categories.length === 0) && (
              <Fld className="mt-2.5">
                <input
                  className={fldInput}
                  autoComplete="off"
                  aria-label={t("transactions.dialog.new_category_label")}
                  placeholder={t("transactions.dialog.new_category_placeholder")}
                  value={categories.some((c) => c.name === category) ? "" : category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </Fld>
            )}
          </div>
        </>
      ) : (
        <>
          <div>
            <Lbl htmlFor="add-tx-from">{t("transactions.dialog.from_account")}</Lbl>
            <Fld>{accountOptions(accounts, String(account?.id ?? ""), changeAccount, t("transactions.dialog.from_account"))}</Fld>
          </div>
          <div className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <Chip small className="min-h-11" onClick={swap}>{t("transactions.dialog.swap")}</Chip>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div>
            <Lbl htmlFor="add-tx-to">{t("transactions.dialog.to_account")}</Lbl>
            <Fld>
              {destinations.length > 0
                ? accountOptions(destinations, String(toAccount?.id ?? ""), setToAccountId, t("transactions.dialog.to_account"))
                : <span className="min-h-11 flex-1 py-3 text-sm text-muted-foreground">{t("transactions.dialog.no_destination")}</span>}
            </Fld>
          </div>
          <div>
            <Lbl htmlFor="add-tx-amount">{t("transactions.dialog.transfer_amount")}</Lbl>
            <Fld big suffix={<Suffix big>{sym}</Suffix>}>
              <input
                id="add-tx-amount"
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                placeholder={t("transactions.dialog.amount_placeholder")}
                aria-describedby="add-tx-hint"
                onChange={(event) => {
                  const value = event.target.value;
                  if (/^[\d\s.,+\-−]*$/.test(value)) setAmount(value);
                }}
                className={cn(fldInputBig, "w-full")}
              />
            </Fld>
            <Hint id="add-tx-hint" tone={short ? "red" : "muted"}>{balanceHint}</Hint>
          </div>
        </>
      )}

      <div>
        <Lbl hint={format(day, "d MMMM yyyy", { locale: dateLocale })}>{t("transactions.dialog.date")}</Lbl>
        <div role="group" aria-label={t("transactions.dialog.date")} className="flex flex-wrap gap-2">
          <Chip active={isToday} className="min-h-11" onClick={() => pickDate(new Date())}>{t("transactions.dialog.today")}</Chip>
          <Chip active={isYesterday} className="min-h-11" onClick={() => pickDate(subDays(new Date(), 1))}>{t("transactions.dialog.yesterday")}</Chip>
          <Chip active={otherDate} className="min-h-11" onClick={() => { setOtherDate(true); setDateText(format(day, "dd.MM.yyyy")); }}>{t("transactions.dialog.pick_date")}</Chip>
        </div>
        {otherDate && (
          <Fld className="mt-2.5">
            <input className={fldInput} autoComplete="off" aria-label={t("transactions.dialog.date")} placeholder={t("transactions.dialog.date_placeholder")} value={dateText} onChange={(e) => onDateText(e.target.value)} />
          </Fld>
        )}
      </div>

      <div>
        <LinkBtn aria-expanded={more} className="min-h-11 text-[13.5px] !text-muted-foreground" onClick={() => setMore((value) => !value)}>
          {more ? t("transactions.dialog.less") : t("transactions.dialog.more")}
        </LinkBtn>
        {more && (
          <div className="mt-1 flex flex-col gap-2.5">
            <Fld>
              <input id="add-tx-description" name="description" className={fldInput} autoComplete="off" aria-label={t("transactions.dialog.description")} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("transactions.dialog.description_placeholder")} />
            </Fld>
            {tagsList.length > 0 && (
              <div role="group" aria-label={t("transactions.dialog.tags")} className="flex flex-wrap gap-2">
                {tagsList.map((tag) => (
                  <Chip key={tag.id} active={tags.includes(tag.name)} className="min-h-11" onClick={() => toggleTag(tag.name)}>#{tag.name}</Chip>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {flow === "expense" && (
        <div className="flex flex-col gap-2">
          <SwitchRow id="add-tx-recurring" title={t("transactions.dialog.recurring")} sub={t("transactions.dialog.recurring_hint")} checked={recurring} onChange={setRecurring} />
          <SwitchRow id="add-tx-mandatory" title={t("transactions.dialog.mandatory")} sub={t("transactions.dialog.mandatory_hint")} checked={mandatory} onChange={setMandatory} />
        </div>
      )}

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ModalActions>
        <GhostBtn className="min-h-11" onClick={onClose}>{t("transactions.dialog.cancel")}</GhostBtn>
        <PrimaryBtn type="submit" className="min-h-11" disabled={saving}>{saving ? t("transactions.dialog.saving") : t(`transactions.dialog.save_${flow}`)}</PrimaryBtn>
      </ModalActions>
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
        className="left-0 top-0 grid-cols-1 overflow-x-hidden h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-4 data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-[520px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[20px] sm:border sm:p-6 sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]"
      >
        <DialogTitle className="pr-10">{t("transactions.dialog.title")}</DialogTitle>
        <AddTransactionForm defaultType={defaultType} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
