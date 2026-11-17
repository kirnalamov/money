"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { convertCurrency } from "@/lib/utils";
import { fmtMoney, hashColor } from "@/lib/plutus-format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, Chip, CURRENCY_SYMBOL, Dot, evalAmount, Fld, fldInput, fldInputBig, GhostBtn, Hint, Lbl, ModalActions, Mono, Pick, PrimaryBtn, Suffix, DoneScreen } from "@/components/ui/modal-kit";
import type { Account, AccountType, Currency } from "@/types";

const TYPES: AccountType[] = ["bank", "cash", "savings", "brokerage"];
const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "RUB"];
const TYPE_COLOR: Record<AccountType, string> = { bank: "#C4B5FD", savings: "#7DD3FC", brokerage: "#C6F24E", cash: "#FBBF24" };
const BANKS: Record<string, string[]> = {
  RUB: ["Тинькофф", "Сбер", "Альфа-Банк", "ВТБ"],
  default: ["Chase", "Revolut", "Wise", "N26"],
};

export function AccountDialog({
  open,
  onOpenChange,
  account,
  openerRef,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  openerRef?: React.MutableRefObject<HTMLElement | null>;
  onError?: (message: string | null) => void;
}) {
  const { t } = useTranslation();
  const { defaultCurrency, addAccount, updateAccount } = useStore();
  const [type, setType] = useState<AccountType>("bank");
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [balance, setBalance] = useState("");
  const [provider, setProvider] = useState("");
  const [customProvider, setCustomProvider] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDone(null);
    setSaving(false);
    setType(account?.type ?? "bank");
    setCurrency(account?.currency ?? defaultCurrency);
    setBalance(account ? String(account.balance) : "");
    setProvider(account?.provider ?? "");
    setCustomProvider(false);
    setName(account?.name ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account]);

  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  const typeLabel = t(`accounts.types.${type}`);
  const autoName = `${provider || typeLabel} · ${sym}`;
  const finalName = name.trim() || autoName;
  const amount = evalAmount(balance);
  const balanceNum = balance.trim() === "" ? 0 : amount;
  const banks = BANKS[currency] ?? BANKS.default;
  const subs: Record<AccountType, string> = {
    bank: t("dialogs.acc_sub_bank", "Карта, вклад"),
    cash: t("dialogs.acc_sub_cash", "Наличные на руках"),
    savings: t("dialogs.acc_sub_savings", "Накопительный счёт"),
    brokerage: t("dialogs.acc_sub_brokerage", "Акции, ETF, крипта"),
  };
  const curTitle: Record<Currency, string> = {
    USD: t("dialogs.cur_USD", "Доллар"),
    EUR: t("dialogs.cur_EUR", "Евро"),
    GBP: t("dialogs.cur_GBP", "Фунт"),
    RUB: t("dialogs.cur_RUB", "Рубль"),
  };

  const save = async () => {
    if (saving) return;
    if (!Number.isFinite(balanceNum) || (balanceNum < 0 && balanceNum !== account?.balance)) {
      setError(t("accounts.validation.balance"));
      return;
    }
    if (account && balanceNum !== account.balance && !window.confirm(t("accounts.balance_change_warning"))) return;
    setSaving(true);
    setError(null);
    try {
      const details = { name: finalName, type, currency, provider: provider || undefined };
      if (account) {
        await updateAccount(account.id, balanceNum === account.balance ? details : { ...details, balance: balanceNum, expected_balance: account.balance });
        onError?.(null);
        onOpenChange(false);
      } else {
        await addAccount({ ...details, balance: balanceNum });
        onError?.(null);
        setDone(finalName);
      }
    } catch (saveError) {
      setError(axios.isAxiosError(saveError) && saveError.response?.status === 409
        ? t("accounts.edit_conflict")
        : saveError instanceof Error ? saveError.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const again = () => {
    setDone(null); setBalance(""); setName(""); setProvider(""); setCustomProvider(false);
  };

  const converted = convertCurrency(Number.isFinite(balanceNum) ? balanceNum : 0, currency, defaultCurrency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]"
        onCloseAutoFocus={(e) => {
          if (openerRef?.current?.isConnected) {
            e.preventDefault();
            openerRef.current.focus();
          }
        }}
      >
        <DialogHeader className="pr-10">
          <DialogTitle>{account ? t("accounts.edit_account") : t("accounts.add_account")}</DialogTitle>
          <DialogDescription>{t("dialogs.acc_desc", "Выберите тип и валюту, остальное можно не заполнять")}</DialogDescription>
        </DialogHeader>

        {done ? (
          <DoneScreen
            title={t("dialogs.acc_done", "Счёт добавлен")}
            lines={[done]}
            actions={
              <>
                <GhostBtn className="min-h-11" onClick={again}>{t("dialogs.add_more", "Добавить ещё")}</GhostBtn>
                <PrimaryBtn className="min-h-11" onClick={() => onOpenChange(false)}>{t("transactions.dialog.done")}</PrimaryBtn>
              </>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Lbl>{t("accounts.account_type")}</Lbl>
              <div role="group" aria-label={t("accounts.account_type")} className="grid grid-cols-2 gap-2">
                {TYPES.map((item) => (
                  <Pick key={item} active={type === item} className="min-h-11" onClick={() => setType(item)}>
                    <Dot color={TYPE_COLOR[item]} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold">{t(`accounts.types.${item}`)}</span>
                      <span className="block truncate text-xs text-[#8D9388]">{subs[item]}</span>
                    </span>
                  </Pick>
                ))}
              </div>
            </div>

            <div>
              <Lbl>{t("accounts.currency")}</Lbl>
              <div role="group" aria-label={t("accounts.currency")} className="flex gap-2">
                {CURRENCIES.map((cur) => (
                  <Pick key={cur} active={currency === cur} title={cur} className="min-h-11 flex-col justify-center gap-0.5 px-1.5 py-2.5" onClick={() => setCurrency(cur)}>
                    <span className="text-xl font-bold" style={currency === cur ? { color: "#C6F24E" } : undefined}>{CURRENCY_SYMBOL[cur]}</span>
                    <span className="text-[11.5px] text-[#8D9388]">{curTitle[cur]}</span>
                  </Pick>
                ))}
              </div>
            </div>

            <div>
              <Lbl htmlFor="account-balance">{account ? t("accounts.balance") : t("dialogs.acc_start_balance", "Начальный баланс")}</Lbl>
              <Fld big suffix={<Suffix big>{sym}</Suffix>}>
                <input
                  id="account-balance"
                  inputMode="decimal"
                  autoComplete="off"
                  className={fldInputBig}
                  placeholder="0"
                  value={balance}
                  onChange={(e) => { if (/^[\d\s.,+\-−]*$/.test(e.target.value)) setBalance(e.target.value); }}
                />
              </Fld>
              {type === "brokerage" && <Hint>{t("dialogs.acc_brokerage_hint", "Это свободные деньги на брокерском счёте. Бумаги добавляются отдельно.")}</Hint>}
            </div>

            <div>
              <Lbl hint={t("dialogs.optional", "необязательно")}>{type === "brokerage" ? t("dialogs.acc_broker", "Брокер") : t("dialogs.acc_bank", "Банк")}</Lbl>
              <div role="group" aria-label={t("accounts.provider")} className="flex flex-wrap gap-2">
                {banks.map((bank) => (
                  <Chip key={bank} active={provider === bank && !customProvider} className="min-h-11" onClick={() => { setProvider(provider === bank ? "" : bank); setCustomProvider(false); }}>{bank}</Chip>
                ))}
                <Chip dashed active={customProvider} className="min-h-11" onClick={() => setCustomProvider((v) => !v)}>{t("dialogs.acc_other", "+ Другой")}</Chip>
              </div>
              {customProvider && (
                <Fld className="mt-2.5">
                  <input className={fldInput} autoComplete="organization" aria-label={t("accounts.provider")} placeholder={t("accounts.provider_placeholder")} value={provider} onChange={(e) => setProvider(e.target.value)} />
                </Fld>
              )}
            </div>

            <div>
              <Lbl htmlFor="account-name" hint={t("dialogs.can_skip", "можно пропустить")}>{t("dialogs.acc_name", "Название")}</Lbl>
              <Fld>
                <input id="account-name" className={fldInput} autoComplete="off" placeholder={autoName} value={name} onChange={(e) => setName(e.target.value)} />
              </Fld>
            </div>

            <Card className="flex items-center gap-3">
              <Mono color={hashColor(String(account?.id ?? finalName))}>{finalName.slice(0, 2).toUpperCase()}</Mono>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{finalName}</span>
                <span className="block text-[12.5px] text-[#8D9388]">{typeLabel}{provider ? ` · ${provider}` : ""}</span>
              </span>
              <span className="text-right">
                <span className="block font-bold tabular-nums" style={balanceNum < 0 ? { color: "#F87171" } : undefined}>{fmtMoney(Number.isFinite(balanceNum) ? balanceNum : 0, currency)}</span>
                {currency !== defaultCurrency && <span className="block text-xs text-[#8D9388] tabular-nums">≈ {fmtMoney(converted, defaultCurrency)}</span>}
              </span>
            </Card>

            <ModalActions>
              <GhostBtn className="min-h-11" onClick={() => onOpenChange(false)}>{t("common.cancel")}</GhostBtn>
              <PrimaryBtn className="min-h-11" disabled={saving} onClick={save}>{account ? t("common.save") : t("dialogs.acc_add_btn", "Добавить счёт")}</PrimaryBtn>
            </ModalActions>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
