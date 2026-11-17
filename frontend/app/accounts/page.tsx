"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/auth/protected-route";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { cn, convertCurrency, getCurrencySymbol, getExchangeRate } from "@/lib/utils";
import { fmtMoney, fmtNum, plural, MINUS } from "@/lib/plutus-format";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Landmark,
  Layers,
  TrendingUp,
  Banknote,
} from "lucide-react";
import { Account, AccountType, Currency } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AccountDialog } from "@/components/accounts/account-dialog";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { format } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const NBSP = " ";
const MASK = "•••••";

const TYPE_ORDER: AccountType[] = ["bank", "savings", "brokerage", "cash"];
const TYPE_COLOR: Record<AccountType, string> = {
  bank: "#C4B5FD",
  savings: "#7DD3FC",
  brokerage: "#C6F24E",
  cash: "#FBBF24",
};
const TYPE_ICON: Record<AccountType, typeof Landmark> = {
  bank: Landmark,
  savings: Layers,
  brokerage: TrendingUp,
  cash: Banknote,
};

export default function AccountsPage() {
  const { t, i18n } = useTranslation();
  const { accounts, defaultCurrency, isLoading, dataError, dataErrors, fetchAllData, addAccount, updateAccount, deleteAccount } = useStore();
  const dateLocale = i18n.language === "ru" ? ru : enUS;
  const opener = useRef<HTMLElement | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | AccountType>("all");
  const [hide, setHide] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "transfer">("income");
  const handleOpenDialog = (account?: Account, trigger?: HTMLElement) => {
    opener.current = trigger ?? null;
    setError(null);
    setEditingAccount(account ?? null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm(t("accounts.delete_confirmation"))) {
      setError(null);
      try {
        await deleteAccount(id);
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : t("common.error"));
      }
    }
  };

  const toDefault = (a: Account) => convertCurrency(a.balance, a.currency, defaultCurrency);
  const money = (v: number, cur: Currency | string) =>
    hide ? `${MASK}${NBSP}${getCurrencySymbol(cur)}` : `${v < 0 ? MINUS : ""}${fmtMoney(Math.abs(v), cur)}`;

  const summary = useMemo(() => {
    const total = accounts.reduce((s, a) => s + toDefault(a), 0);
    const posTotal = accounts.filter((a) => toDefault(a) > 0).reduce((s, a) => s + toDefault(a), 0);

    const byCur = new Map<string, { code: Currency; amount: number; converted: number; count: number }>();
    accounts.forEach((a) => {
      const cur = byCur.get(a.currency) || { code: a.currency, amount: 0, converted: 0, count: 0 };
      cur.amount += a.balance;
      cur.converted += toDefault(a);
      cur.count += 1;
      byCur.set(a.currency, cur);
    });

    const parts = TYPE_ORDER.map((type) => {
      const sum = accounts
        .filter((a) => a.type === type && toDefault(a) > 0)
        .reduce((s, a) => s + toDefault(a), 0);
      return { type, sum, share: posTotal > 0 ? (sum / posTotal) * 100 : 0 };
    }).filter((p) => p.sum > 0);

    const negative = accounts.find((a) => a.balance < 0) || null;
    return { total, posTotal, currencies: Array.from(byCur.values()), parts, negative };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, defaultCurrency]);

  const countWord = (n: number) =>
    `${n} ${plural(
      n,
      t("accounts.count_one", "счёт"),
      t("accounts.count_few", "счёта"),
      t("accounts.count_many", "счетов")
    )}`;

  const tabs: { key: "all" | AccountType; label: string; count: number }[] = [
    { key: "all", label: t("accounts.tabs.all", "Все"), count: accounts.length },
    ...TYPE_ORDER.map((type) => ({
      key: type,
      label: t(`accounts.tabs.${type}`),
      count: accounts.filter((a) => a.type === type).length,
    })),
  ];

  const visible = accounts.filter((a) => tab === "all" || a.type === tab);

  const openTx = (type: "income" | "transfer") => {
    setTxType(type);
    setTxOpen(true);
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-5 pb-20 text-[#F1F3EE] tabular-nums md:pb-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-bold tracking-[-0.02em]">{t("accounts.title")}</h1>
            <p className="mt-1 text-sm text-[#8D9388]">{t("accounts.subtitle")}</p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setHide(!hide)}
              aria-pressed={hide}
              className="flex h-[42px] items-center gap-2 rounded-xl border border-[#2A2E27] bg-transparent px-4 text-sm font-medium text-[#C9CEC3] transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE]"
            >
              {hide ? <EyeOff className="h-4 w-4" strokeWidth={1.8} /> : <Eye className="h-4 w-4" strokeWidth={1.8} />}
              {hide ? t("accounts.show_amounts", "Показать суммы") : t("accounts.hide_amounts", "Скрыть суммы")}
            </button>
            <button
              onClick={(e) => handleOpenDialog(undefined, e.currentTarget)}
              className="flex h-[42px] items-center gap-2 rounded-xl bg-[#C6F24E] pl-4 pr-[18px] text-sm font-semibold text-[#10170A]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.2} />
              {t("accounts.add_account")}
            </button>
          </div>
        </header>

        {error && !isDialogOpen && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label={t("common.loading")}>
            {[0, 1, 2].map((item) => <Skeleton key={item} className="h-40 rounded-[20px]" />)}
          </div>
        ) : (dataError || dataErrors.accounts) && accounts.length === 0 ? (
          <div className="rounded-[20px] border border-[#232721] bg-[#151714] px-6 py-12 text-center" role="alert">
            <h3 className="text-base font-semibold">{t("common.data_load_failed_title")}</h3>
            <p className="mt-1 text-sm text-[#8D9388]">{t("common.data_load_failed")}</p>
            <Button type="button" variant="outline" onClick={() => void fetchAllData()} className="mt-5 h-11">{t("common.retry")}</Button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[20px] border border-dashed border-[#2A2E27] p-10 text-center text-sm text-[#8D9388]">
            {t("accounts.no_accounts")}
            <button
              onClick={(e) => handleOpenDialog(undefined, e.currentTarget)}
              className="flex h-11 items-center gap-2 rounded-xl bg-[#C6F24E] px-4 text-sm font-semibold text-[#10170A]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.2} />
              {t("accounts.add_account")}
            </button>
          </div>
        ) : (
          <>
            {/* SUMMARY */}
            <section className="flex flex-col gap-[22px] rounded-[20px] border border-[#232721] bg-[#151714] px-7 py-6">
              <div className="flex flex-wrap items-end justify-between gap-x-14 gap-y-6">
                <div>
                  <div className="text-[13px] font-medium text-[#8D9388]">
                    {t("accounts.total_on_accounts", "Всего на счетах")}
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
                    <span className="text-[44px] font-bold leading-[1.1] tracking-[-0.03em]">
                      {hide ? `${MASK}${NBSP}${getCurrencySymbol(defaultCurrency)}` : `≈ ${money(summary.total, defaultCurrency)}`}
                    </span>
                    <span className="text-sm text-[#8D9388]">
                      {countWord(accounts.length)} · {t("accounts.converted_note", "в пересчёте на")} {defaultCurrency}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {summary.currencies.map((cu) => {
                    const foreign = cu.code !== defaultCurrency;
                    return (
                      <div
                        key={cu.code}
                        className="min-w-[180px] rounded-[14px] border border-[#232721] bg-[#121411] px-4 py-3.5"
                      >
                        <div className="flex items-center justify-between gap-2.5 text-[12.5px] text-[#8D9388]">
                          <span className="font-bold text-[#C9CEC3]">{cu.code}</span>
                          <span>{countWord(cu.count)}</span>
                        </div>
                        <div
                          className="mt-1.5 text-lg font-bold"
                          style={{ color: cu.amount < 0 ? "#F87171" : "#F1F3EE" }}
                        >
                          {money(cu.amount, cu.code)}
                        </div>
                        <div className="mt-0.5 text-xs text-[#8D9388]">
                          {foreign
                            ? `≈ ${money(cu.converted, defaultCurrency)} · 1${NBSP}${getCurrencySymbol(defaultCurrency)} = ${fmtNum(getExchangeRate(defaultCurrency, cu.code), 2)}${NBSP}${getCurrencySymbol(cu.code)}`
                            : t("accounts.base_currency", "базовая валюта")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {summary.parts.length > 0 && (
                <div>
                  <div className="flex h-2.5 overflow-hidden rounded-[5px]" role="img" aria-label={t("accounts.shares_label", "Доли счетов в общей сумме")}>
                    {summary.parts.map((p) => (
                      <span
                        key={p.type}
                        className="border-r-2 border-[#151714]"
                        style={{ flex: `${p.share.toFixed(2)} 1 0%`, background: TYPE_COLOR[p.type] }}
                      />
                    ))}
                  </div>
                  <div className="mt-3.5 flex flex-wrap gap-x-7 gap-y-2.5 text-[13px]">
                    {summary.parts.map((p) => (
                      <span key={p.type} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: TYPE_COLOR[p.type] }} />
                        <span className="text-[#8D9388]">{t(`accounts.tabs.${p.type}`)}</span>
                        <b className="font-semibold">{p.share.toFixed(1).replace(".", ",")}%</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ALERT */}
            {summary.negative && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3.5 rounded-2xl border border-[#F87171]/30 bg-[#F87171]/[0.08] px-5 py-4" role="alert">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#F87171] font-bold text-[#10170A]">!</span>
                <div className="min-w-[260px] flex-[1_1_320px]">
                  <div className="font-bold text-[#F87171]">
                    {summary.negative.name} {t("accounts.in_minus", "в минусе")}: {money(summary.negative.balance, summary.negative.currency)}
                    {summary.negative.currency !== defaultCurrency && ` (≈ ${money(toDefault(summary.negative), defaultCurrency)})`}
                  </div>
                  <div className="mt-0.5 text-[13.5px] text-[#C9CEC3]">
                    {t(
                      "accounts.negative_hint",
                      "Баланс ушёл в минус. Пополните счёт или проверьте последние операции: возможно, трата записана не на тот счёт."
                    )}
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => openTx("income")}
                    className="h-[38px] rounded-[10px] bg-[#F87171] px-4 text-[13.5px] font-bold text-[#10170A]"
                  >
                    {t("accounts.top_up", "Пополнить")}
                  </button>
                  <Link
                    href="/transactions"
                    className="flex h-[38px] items-center rounded-[10px] border border-[#4A2F2F] px-4 text-[13.5px] font-semibold text-[#F1F3EE] no-underline transition-colors hover:bg-[#1B1E1A]"
                  >
                    {t("common.transactions")}
                  </Link>
                </div>
              </div>
            )}

            {/* FILTER */}
            <div role="group" aria-label={t("accounts.account_type")} className="flex flex-wrap gap-0.5 self-start rounded-xl border border-[#232721] bg-[#151714] p-1">
              {tabs.map((tb) => (
                <button
                  key={tb.key}
                  onClick={() => setTab(tb.key)}
                  aria-pressed={tab === tb.key}
                  className={cn(
                    "h-9 rounded-[9px] px-4 text-[13.5px] font-semibold transition-colors",
                    tab === tb.key ? "bg-[#2A2F27] text-[#F1F3EE]" : "text-[#A2A89C] hover:text-[#F1F3EE]"
                  )}
                >
                  {tb.label} {tb.count}
                </button>
              ))}
            </div>

            {/* CARDS */}
            <div className="flex flex-wrap items-stretch gap-5">
              {visible.map((account) => {
                const converted = toDefault(account);
                const foreign = account.currency !== defaultCurrency;
                const neg = account.balance < 0;
                const share = neg || summary.posTotal <= 0 ? 0 : (converted / summary.posTotal) * 100;
                const color = TYPE_COLOR[account.type];
                const Icon = TYPE_ICON[account.type];
                const changed = account.updated_at || account.lastSync;
                return (
                  <article
                    key={account.id}
                    className="flex min-w-0 max-w-[560px] flex-[1_1_340px] flex-col gap-5 rounded-[20px] border border-[#232721] bg-[#151714] p-6 transition-colors hover:border-[#3A3F36]"
                  >
                    <div className="flex items-start gap-3.5">
                      <span
                        className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#1E211C]"
                        style={{ color }}
                      >
                        <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[17px] font-semibold" title={account.name}>{account.name}</h3>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-[#1E211C] px-2 py-0.5 text-[11.5px] font-semibold text-[#C9CEC3]">
                            {t(`accounts.types.${account.type}`)}
                          </span>
                          <span className="rounded-full bg-[#1E211C] px-2 py-0.5 text-[11.5px] font-semibold text-[#C9CEC3]">
                            {account.currency}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        <button
                          aria-label={`${t("common.edit")}: ${account.name}`}
                          onClick={(e) => handleOpenDialog(account, e.currentTarget)}
                          className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[#8D9388] transition-colors hover:bg-[#232721] hover:text-[#F1F3EE]"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                        <button
                          aria-label={`${t("common.delete")}: ${account.name}`}
                          onClick={() => void handleDelete(account.id)}
                          className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[#8D9388] transition-colors hover:bg-[#232721] hover:text-[#F87171]"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-[12.5px] text-[#8D9388]">{t("accounts.balance")}</div>
                      <div
                        className="mt-0.5 text-[34px] font-bold leading-[1.15] tracking-[-0.02em]"
                        style={{ color: neg ? "#F87171" : "#F1F3EE" }}
                      >
                        {money(account.balance, account.currency)}
                      </div>
                      {foreign && (
                        <div className="mt-0.5 text-[13px] text-[#8D9388]">
                          ≈ {money(converted, defaultCurrency)}
                        </div>
                      )}
                    </div>

                    <div>
                      {!neg ? (
                        <>
                          <div className="mb-2 flex justify-between text-[12.5px] text-[#8D9388]">
                            <span>{t("accounts.share_of_total", "Доля всех средств")}</span>
                            <span className="font-bold text-[#F1F3EE]">{share.toFixed(1).replace(".", ",")}%</span>
                          </div>
                          <div className="h-1.5 rounded-[3px] bg-[#232721]">
                            <div className="h-1.5 rounded-[3px]" style={{ width: `${share.toFixed(2)}%`, background: color }} />
                          </div>
                        </>
                      ) : (
                        <div className="inline-block rounded-full bg-[#F87171]/[0.12] px-2.5 py-1 text-[12.5px] font-bold text-[#F87171]">
                          {t("accounts.negative_badge", "Отрицательный баланс")}
                        </div>
                      )}
                    </div>

                    {account.type === "savings" && account.interest_rate ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[#6EE7A0]/[0.08] px-3.5 py-2.5 text-[13px]">
                        <span className="font-bold text-[#6EE7A0]">{String(account.interest_rate).replace(".", ",")}% {t("accounts.per_year", "годовых")}</span>
                        <span className="text-[#A2A89C]">
                          ≈ {fmtMoney((Math.max(account.balance, 0) * account.interest_rate) / 1200, account.currency)} {t("accounts.per_month", "в месяц")}
                        </span>
                      </div>
                    ) : null}

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#232721] pt-4">
                      <span className="text-[12.5px] text-[#8D9388]">
                        {changed
                          ? `${t("accounts.last_updated")}: ${format(new Date(changed), "d MMM yyyy", { locale: dateLocale })}`
                          : account.provider || ""}
                      </span>
                      <span className="flex gap-2">
                        <Link
                          href="/transactions"
                          className="flex h-[34px] items-center rounded-[10px] border border-[#2A2E27] px-3.5 text-[13px] font-semibold text-[#C9CEC3] no-underline transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE]"
                        >
                          {t("common.transactions")}
                        </Link>
                        <button
                          onClick={() => openTx("transfer")}
                          className="h-[34px] rounded-[10px] border border-[#2A2E27] bg-transparent px-3.5 text-[13px] font-semibold text-[#C9CEC3] transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE]"
                        >
                          {t("accounts.transfer", "Перевод")}
                        </button>
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        <AddTransactionDialog open={txOpen} onOpenChange={setTxOpen} defaultType={txType} trigger={null} />

        <AccountDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} account={editingAccount} openerRef={opener} onError={setError} />
      </div>
    </ProtectedRoute>
  );
}
