"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { addMonths, differenceInCalendarDays, endOfDay, format, startOfDay, subDays, subMonths } from "date-fns";
import type { DateRange } from "react-day-picker";
import { ArrowLeft, HandCoins, Minus, Pencil, Plus, ShoppingCart, TrendingDown, TrendingUp } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { CapitalChart } from "@/components/dashboard/capital-chart";
import { PeriodBar } from "@/components/ui/period-bar";
import { SecurityLogo } from "@/components/portfolio/security-logo";
import { PositionDialog } from "@/components/portfolio/position-dialog";
import { AccountDialog } from "@/components/accounts/account-dialog";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import type { TradePreset } from "@/components/trading/trade-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { capitalSeries, earliestTransactionDate } from "@/lib/capital";
import { useLivePortfolioValue } from "@/lib/live-portfolio";
import { fmtMoney, fmtNum, hashColor, MINUS, signedMoney, signedPct } from "@/lib/plutus-format";
import { changeTone, TONE_COLOR } from "@/lib/tone";
import { hintFor } from "@/lib/ticker";
import { cn, convertCurrency } from "@/lib/utils";
import type { Position } from "@/types";

const PERIODS = ["7D", "30D", "3M", "6M", "1Y", "ALL"] as const;
type Period = (typeof PERIODS)[number];

const card = "rounded-[20px] border border-[#232721] bg-[#151714]";

/** Страница брокерского счёта: состав, свободные деньги и график стоимости счёта. */
export default function BrokerAccountPage() {
  const { t, i18n } = useTranslation();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const { accounts, transactions, defaultCurrency, dataReady } = useStore();
  const account = accounts.find((a) => a.id === id);

  const { positions, value: heldAll, valueAt } = useLivePortfolioValue(Number.isFinite(id) ? id : undefined);
  const [per, setPer] = useState<Period>("30D");
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [editOpen, setEditOpen] = useState(false);
  const [posOpen, setPosOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [trade, setTrade] = useState<TradePreset | null>(null);

  const now = useMemo(() => new Date(), []);
  const own = useMemo(() => transactions.filter((tx) => tx.accountId === id || tx.toAccountId === id), [transactions, id]);
  const histStart = useMemo(() => earliestTransactionDate(own) || subDays(startOfDay(now), 30), [own, now]);

  const wanted = useMemo(() => {
    if (range?.from) return startOfDay(range.from);
    const today = startOfDay(now);
    switch (per) {
      case "7D": return subDays(today, 6);
      case "30D": return subDays(today, 30);
      case "3M": return subMonths(today, 3);
      case "6M": return subMonths(today, 6);
      case "1Y": return subMonths(today, 12);
      default: return histStart;
    }
  }, [per, range, now, histStart]);
  const end = useMemo(() => {
    if (!range?.from) return now;
    const e = endOfDay(range.to ?? range.from);
    return e.getTime() > now.getTime() ? now : e;
  }, [range, now]);
  const effStart = wanted.getTime() < histStart.getTime() ? histStart : wanted;

  const points = useMemo(
    () => (account ? capitalSeries([account], own, defaultCurrency, effStart, end, valueAt) : []),
    [account, own, defaultCurrency, effStart, end, valueAt]
  );

  if (!account) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col gap-4 text-[#F1F3EE]">
          <Link href="/accounts" className="inline-flex items-center gap-2 text-sm text-[#8D9388] no-underline hover:text-[#F1F3EE]"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("accounts.title")}</Link>
          {dataReady ? <p className="text-[15px] text-[#A2A89C]">{t("accounts.not_found", "Счёт не найден")}</p> : <Skeleton className="h-[240px] w-full rounded-[20px]" />}
        </div>
      </ProtectedRoute>
    );
  }

  if (account.type !== "brokerage") {
    return (
      <ProtectedRoute>
        <div className="flex flex-col gap-4 text-[#F1F3EE]">
          <Link href="/accounts" className="inline-flex items-center gap-2 text-sm text-[#8D9388] no-underline hover:text-[#F1F3EE]"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("accounts.title")}</Link>
          <p className="text-[15px] text-[#A2A89C]">{t("accounts.only_brokerage", "Подробная страница есть только у брокерских счетов.")}</p>
        </div>
      </ProtectedRoute>
    );
  }

  const cashNative = account.balance;
  const heldNative = positions.reduce((s, p) => s + convertCurrency(p.quantity * p.currentPrice, p.currency, account.currency), 0);
  const totalNative = cashNative + heldNative;
  const cost = positions.reduce((s, p) => s + convertCurrency(p.quantity * p.avgPrice, p.currency, defaultCurrency), 0);
  const pnl = heldAll - cost;
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

  const first = points[0]?.value ?? 0;
  const last = points[points.length - 1]?.value ?? 0;
  const chg = last - first;
  const chgPct = first !== 0 ? (chg / Math.abs(first)) * 100 : 0;
  const days = Math.max(1, differenceInCalendarDays(end, effStart) + 1);
  const tone = changeTone(chgPct, days);
  const toneColor = TONE_COLOR[tone];

  const totalDefault = convertCurrency(totalNative, account.currency, defaultCurrency);
  const rows = positions
    .map((p) => {
      const valueDefault = convertCurrency(p.quantity * p.currentPrice, p.currency, defaultCurrency);
      const costDefault = convertCurrency(p.quantity * p.avgPrice, p.currency, defaultCurrency);
      return { p, valueDefault, pl: valueDefault - costDefault, plPct: costDefault > 0 ? ((valueDefault - costDefault) / costDefault) * 100 : 0 };
    })
    .sort((a, b) => b.valueDefault - a.valueDefault);
  const cashDefault = convertCurrency(cashNative, account.currency, defaultCurrency);
  const weight = (v: number) => (totalDefault > 0 ? Math.max(0, (v / totalDefault) * 100) : 0);

  const perLabel = (p: Period) => (p === "7D" ? t("overview.p7d", "7Д") : p === "30D" ? t("overview.p30d", "30Д") : p === "3M" ? t("overview.p3m", "3М") : p === "6M" ? t("overview.p6m", "6М") : p === "1Y" ? t("overview.p1y", "1Г") : t("overview.pall", "Все"));
  const dateLabel = `${format(effStart, "dd.MM.yyyy")} — ${format(end, "dd.MM.yyyy")}`;
  const hasForeign = account.currency !== defaultCurrency;

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-5 pb-20 text-[#F1F3EE] tabular-nums md:pb-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/accounts" className="inline-flex min-h-9 items-center gap-2 text-sm text-[#8D9388] no-underline hover:text-[#F1F3EE]">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("accounts.title")}
            </Link>
            <h1 className="mt-1 text-[30px] font-bold tracking-[-0.02em]">{account.name}</h1>
            <p className="mt-1 text-sm text-[#8D9388]">
              {t("accounts.types.brokerage")}{account.provider ? ` · ${account.provider}` : ""} · {account.currency}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={() => setTrade({ side: "buy", accountId: account.id })} className="flex h-[42px] items-center gap-2 rounded-xl border border-[#2A2E27] px-4 text-sm font-semibold hover:border-[#6EE7A0] hover:text-[#6EE7A0]">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />{t("dialogs.buy", "Купить")}
            </button>
            <button onClick={() => setTrade({ side: "sell", accountId: account.id })} disabled={positions.length === 0} className="flex h-[42px] items-center gap-2 rounded-xl border border-[#2A2E27] px-4 text-sm font-semibold hover:border-[#F87171] hover:text-[#F87171] disabled:opacity-50">
              <HandCoins className="h-4 w-4" aria-hidden="true" />{t("portfolio.sell", "Продать")}
            </button>
            <button onClick={() => { setEditingPos(null); setPosOpen(true); }} className="flex h-[42px] items-center gap-2 rounded-xl bg-[#C6F24E] px-4 text-sm font-semibold text-[#10170A]">
              <Plus className="h-4 w-4" aria-hidden="true" />{t("portfolio.add_position")}
            </button>
            <button onClick={() => setEditOpen(true)} aria-label={t("common.edit")} className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-[#2A2E27] text-[#C9CEC3] hover:bg-[#1B1E1A]">
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* VALUE + CHART */}
        <section className={cn(card, "p-6")} aria-label={t("accounts.account_value", "Стоимость счёта")}>
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
            <div>
              <div className="text-[13px] font-medium text-[#8D9388]">{t("accounts.account_value", "Стоимость счёта")}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-2">
                <span className="text-[42px] font-bold leading-[1.1] tracking-[-0.03em]">{fmtMoney(totalNative, account.currency)}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[12.5px] font-bold" style={{ background: `${toneColor}24`, color: toneColor }}>
                  {tone === "up" ? <TrendingUp className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /> : tone === "down" ? <TrendingDown className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /> : <Minus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />}
                  {chg >= 0 ? "+" : MINUS}{Math.abs(chgPct).toFixed(1).replace(".", ",")}%
                </span>
              </div>
              <div className="mt-1 text-[13.5px] text-[#A2A89C]">
                {hasForeign && <>≈ {fmtMoney(totalDefault, defaultCurrency)} · </>}
                {t("analytics.change", "Изменение за период")}: <b style={{ color: toneColor }}>{signedMoney(chg, defaultCurrency)}</b>
              </div>
            </div>
            <PeriodBar presets={PERIODS.map((p) => ({ key: p, label: perLabel(p) }))} value={per} onPreset={setPer} range={range} onRange={setRange} />
          </div>
          <div className="mt-1 text-[12.5px] text-[#8D9388]">{dateLabel} · {t("overview.hover_chart", "наведите на график")}</div>
          <CapitalChart key={`${per}-${range?.from?.getTime() ?? 0}-${range?.to?.getTime() ?? 0}`} points={points} currency={defaultCurrency} height={240} glow />
        </section>

        {/* TILES */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
          <div className={cn(card, "px-5 py-4")}>
            <div className="flex items-center gap-2 text-[12.5px] text-[#8D9388]"><span className="h-2 w-2 rounded-full bg-[#C6F24E]" />{t("accounts.free_cash", "Свободно")}</div>
            <div className="mt-1 text-[22px] font-bold" style={{ color: cashNative < 0 ? "#F87171" : undefined }}>{fmtMoney(cashNative, account.currency)}</div>
            <div className="text-xs text-[#8D9388]">{fmtNum(weight(cashDefault), 1)}% {t("accounts.of_account", "счёта")}</div>
          </div>
          <div className={cn(card, "px-5 py-4")}>
            <div className="flex items-center gap-2 text-[12.5px] text-[#8D9388]"><span className="h-2 w-2 rounded-full bg-[#38BDF8]" />{t("accounts.in_securities", "В бумагах")}</div>
            <div className="mt-1 text-[22px] font-bold">{fmtMoney(heldNative, account.currency)}</div>
            <div className="text-xs text-[#8D9388]">{positions.length} {t("accounts.positions_word", "поз.")}</div>
          </div>
          <div className={cn(card, "px-5 py-4")}>
            <div className="text-[12.5px] text-[#8D9388]">{t("portfolio.total_pnl_label", "Общий PnL")}</div>
            <div className="mt-1 text-[22px] font-bold" style={{ color: pnl >= 0 ? "#6EE7A0" : "#F87171" }}>{signedMoney(pnl, defaultCurrency)}</div>
            <div className="text-xs" style={{ color: pnl >= 0 ? "#6EE7A0" : "#F87171" }}>{signedPct(pnlPct)}</div>
          </div>
        </div>

        {/* COMPOSITION */}
        <section className={cn(card, "overflow-hidden")} aria-label={t("accounts.composition_title", "Состав счёта")}>
          <div className="flex flex-wrap items-baseline justify-between gap-3 px-6 pb-3 pt-5">
            <h2 className="text-xl font-semibold">{t("accounts.composition_title", "Состав счёта")}</h2>
            <span className="text-[13px] text-[#8D9388]">{fmtMoney(totalDefault, defaultCurrency)}</span>
          </div>
          <div className="mx-6 mb-4 flex h-2 gap-[3px] overflow-hidden rounded-[4px]" role="img" aria-label={t("portfolio.allocation_title")}>
            {cashDefault > 0 && <span className="rounded-[3px] bg-[#C6F24E]" style={{ flex: `${weight(cashDefault)} 1 0%` }} />}
            {rows.map(({ p, valueDefault }) => (
              <span key={p.symbol} className="rounded-[3px]" style={{ flex: `${weight(valueDefault)} 1 0%`, background: hashColor(p.symbol) }} />
            ))}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3.5 border-t border-[#1E211C] px-6 py-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#C6F24E]/10 text-[#C6F24E]"><HandCoins className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold">{t("accounts.free_cash", "Свободно")}</span>
                <span className="block text-[12.5px] text-[#8D9388]">{t("accounts.cash_hint", "Деньги на брокерском счёте")}</span>
              </span>
              <span className="text-right">
                <span className="block text-[14.5px] font-bold">{fmtMoney(cashNative, account.currency)}</span>
                <span className="block text-xs text-[#8D9388]">{fmtNum(weight(cashDefault), 1)}%</span>
              </span>
            </div>
            {rows.map(({ p, valueDefault, pl, plPct }) => (
              <div key={p.symbol} className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-[#1E211C] px-6 py-3 hover:bg-[#1A1D19]">
                <SecurityLogo symbol={p.symbol} hint={hintFor(p)} size={40} radius={12} color={hashColor(p.symbol)} />
                <span className="min-w-[140px] flex-1">
                  <span className="block text-[14.5px] font-semibold">{p.symbol}</span>
                  <span className="block truncate text-[12.5px] text-[#8D9388]">{p.name} · {fmtNum(p.quantity, p.quantity % 1 ? 2 : 0)} {t("dialogs.pcs", "шт")} × {fmtMoney(p.currentPrice, p.currency)}</span>
                </span>
                <span className="w-[120px] text-right">
                  <span className="block text-[14.5px] font-bold">{fmtMoney(valueDefault, defaultCurrency)}</span>
                  <span className="block text-xs text-[#8D9388]">{fmtNum(weight(valueDefault), 1)}%</span>
                </span>
                <span className="w-[110px] text-right">
                  <span className="block text-[13.5px] font-semibold" style={{ color: pl >= 0 ? "#6EE7A0" : "#F87171" }}>{signedMoney(pl, defaultCurrency)}</span>
                  <span className="block text-xs font-semibold" style={{ color: pl >= 0 ? "#6EE7A0" : "#F87171" }}>{signedPct(plPct)}</span>
                </span>
                <span className="flex gap-1">
                  <button
                    aria-label={`${t("portfolio.sell", "Продать")} ${p.symbol}`}
                    onClick={() => setTrade({ side: "sell", accountId: account.id, symbol: p.symbol, hint: hintFor(p), asset_class: (p.assetClass as TradePreset["asset_class"]) || "stock" })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D9388] hover:bg-[#232721] hover:text-[#F87171]"
                  >
                    <HandCoins className="h-[15px] w-[15px]" strokeWidth={1.8} />
                  </button>
                  <button
                    aria-label={`${t("common.edit")} ${p.symbol}`}
                    onClick={() => { setEditingPos(p); setPosOpen(true); }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D9388] hover:bg-[#232721] hover:text-[#F1F3EE]"
                  >
                    <Pencil className="h-[15px] w-[15px]" strokeWidth={1.8} />
                  </button>
                </span>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="border-t border-[#1E211C] px-6 py-6 text-[13.5px] text-[#8D9388]">{t("accounts.no_securities", "Бумаг на этом счёте пока нет")}</div>
            )}
          </div>
        </section>

        <AccountDialog open={editOpen} onOpenChange={setEditOpen} account={account} />
        <PositionDialog open={posOpen} onOpenChange={setPosOpen} editing={editingPos} defaultAccountId={account.id} />
        {trade && (
          <AddTransactionDialog
            key={`${trade.symbol ?? "any"}-${trade.side}`}
            open
            onOpenChange={(open) => !open && setTrade(null)}
            defaultType="trade"
            tradePreset={trade}
            trigger={null}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
