"use client";

import { useEffect, useMemo, useState } from "react";
import { usePref } from "@/lib/prefs";
import { isBalanceAdjustment } from "@/lib/capital";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, convertCurrency } from "@/lib/utils";
import { capitalBreakdown, capitalSeries, earliestTransactionDate } from "@/lib/capital";
import { CapitalChart } from "@/components/dashboard/capital-chart";
import {
  categoryEmoji,
  fmtMoney,
  fmtNum,
  hashColor,
  MINUS,
  plural,
  shortMoney,
  signedMoney,
} from "@/lib/plutus-format";

const MINT = "#6EE7A0";
const RED = "#F87171";
const PERIODS = ["7D", "1M", "3M", "6M", "1Y"] as const;
type Period = (typeof PERIODS)[number];
type Tab = "cap" | "cat" | "tag";

const card = "box-border rounded-[20px] border border-[#232721] bg-[#151714] px-6 py-[22px]";
const cap = "text-[12.5px] text-[#8D9388]";
const h2 = "text-xl font-semibold";
const MAND_KEY = "plutus-mandatory-categories" as const;
const HOUSING_RE = /жиль|аренд|ипотек|housing|rent|mortgage/i;

const TYPE_COLOR: Record<string, string> = { brokerage: "#C6F24E", savings: "#38BDF8", bank: "#C4B5FD", cash: "#FBBF24" };

export function AnalyticsView() {
  const { t, i18n } = useTranslation();
  const isRu = i18n.language?.startsWith("ru");
  const dateLocale = isRu ? ru : enUS;
  const params = useSearchParams();
  const { accounts, transactions, categories, tags, defaultCurrency } = useStore();

  const initialTab = ((): Tab => {
    const p = params.get("tab");
    return p === "categories" || p === "cat" ? "cat" : p === "tags" || p === "tag" ? "tag" : "cap";
  })();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [per, setPer] = useState<Period>("1M");
  const [view, setView] = useState<"pie" | "bar">("pie");
  const [excl, setExcl] = useState<Record<string, boolean>>({});
  const [mand, updateMand] = usePref<Record<string, boolean>>(MAND_KEY, {});

  const markMandatory = (name: string) => updateMand((prev) => ({ ...prev, [name]: true }));

  const now = useMemo(() => new Date(), []);
  const today = startOfDay(now);
  const conv = (v: number, cur: string) => convertCurrency(v, cur, defaultCurrency);
  const money = (v: number) => fmtMoney(v, defaultCurrency);
  const catColor = (name: string) => {
    const c = categories.find((x) => x.name === name);
    return c?.color && c.color.toLowerCase() !== "#666666" ? c.color : hashColor(name);
  };
  const catEmoji = (name: string) => categoryEmoji(name, categories.find((x) => x.name === name)?.icon);
  const catLabel = (name: string) => `${catEmoji(name) ? `${catEmoji(name)} ` : ""}${name}`;
  const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- range ----------
  const rangeStart = useMemo(() => {
    switch (per) {
      case "7D": return subDays(today, 6);
      case "1M": return startOfMonth(now);
      case "3M": return startOfMonth(subMonths(now, 2));
      case "6M": return startOfMonth(subMonths(now, 5));
      default: return startOfMonth(subMonths(now, 11));
    }
  }, [per, now, today]);
  const rangeTxt = `${format(rangeStart, "dd.MM.yyyy")} - ${format(now, "dd.MM.yyyy")}`;

  const expenses = useMemo(
    () =>
      transactions
        .filter((tx) => {
          const d = new Date(tx.date);
          return tx.type === "expense" && !isBalanceAdjustment(tx) && !Number.isNaN(d.getTime()) && d >= rangeStart && d <= now;
        })
        .map((tx) => ({ tx, v: convertCurrency(tx.amount, tx.currency, defaultCurrency) })),
    [transactions, rangeStart, now, defaultCurrency]
  );

  // ---------- capital tab ----------
  const breakdown = useMemo(() => capitalBreakdown(accounts, defaultCurrency), [accounts, defaultCurrency]);
  const histStart = useMemo(() => earliestTransactionDate(transactions) || subDays(today, 30), [transactions, today]);
  const effStart = rangeStart.getTime() < histStart.getTime() ? histStart : rangeStart;
  const truncated = rangeStart.getTime() < histStart.getTime() && per !== "7D" && per !== "1M";
  const points = useMemo(
    () => capitalSeries(accounts, transactions, defaultCurrency, effStart, now),
    [accounts, transactions, defaultCurrency, effStart, now]
  );
  const firstV = points[0]?.value ?? breakdown.total;
  const chg = breakdown.total - firstV;
  const chgPct = firstV !== 0 ? (chg / Math.abs(firstV)) * 100 : 0;

  const thirty = useMemo(() => {
    const from = subDays(today, 29);
    return transactions
      .filter((tx) => tx.type === "expense" && !isBalanceAdjustment(tx) && new Date(tx.date) >= from && new Date(tx.date) <= now)
      .reduce((s, tx) => s + convertCurrency(tx.amount, tx.currency, defaultCurrency), 0);
  }, [transactions, today, now, defaultCurrency]);
  const dailySpend = thirty / 30;

  const typeLabel = (type: string) => t(`accounts.types.${type}`);
  const partsTotal = accounts.filter((a) => conv(a.balance, a.currency) > 0).reduce((s, a) => s + conv(a.balance, a.currency), 0);
  const typeParts = ["brokerage", "savings", "bank", "cash"]
    .map((type) => {
      const sum = accounts.filter((a) => a.type === type && conv(a.balance, a.currency) > 0).reduce((s, a) => s + conv(a.balance, a.currency), 0);
      return { type, sum, share: partsTotal > 0 ? (sum / partsTotal) * 100 : 0 };
    })
    .filter((p) => p.sum > 0);
  const donutCap = (() => {
    let acc = 0;
    const stops = typeParts.map((p) => {
      const a0 = acc;
      acc += p.share;
      return `${TYPE_COLOR[p.type]} ${a0.toFixed(2)}% ${acc.toFixed(2)}%`;
    });
    return stops.length ? `conic-gradient(${stops.join(", ")})` : "#232721";
  })();
  const accRows = [...accounts].sort((a, b) => conv(b.balance, b.currency) - conv(a.balance, a.currency));
  const negAcc = accounts.filter((a) => a.balance < 0);
  const topAccount = accRows[0];
  const topShare = topAccount && partsTotal > 0 ? (conv(topAccount.balance, topAccount.currency) / partsTotal) * 100 : 0;
  const liquidPct = breakdown.total > 0 ? (breakdown.liquid / breakdown.total) * 100 : 0;
  const runwayDays = dailySpend > 0 && breakdown.liquid > 0 ? breakdown.liquid / dailySpend : null;
  const insights = [
    { icon: "%", tone: MINT, title: `${t("analytics.liquidity", "Ликвидность")} ${liquidPct.toFixed(1).replace(".", ",")}%`, text: `${t("analytics.liquid_now", "Сразу доступно")} ${money(breakdown.liquid)}. ${t("analytics.liquid_rest", "Остальное вложено в инвестиции.")}` },
    topShare >= 70
      ? { icon: "!", tone: "#FBBF24", title: `${Math.round(topShare)}% ${t("analytics.in_one_account", "в одном счёте")}`, text: `${t("analytics.concentration", "Почти весь капитал лежит на счёте")} «${topAccount?.name}». ${t("analytics.concentration2", "Запас других средств небольшой.")}` }
      : { icon: "✓", tone: MINT, title: t("analytics.diversified", "Капитал распределён"), text: t("analytics.diversified_text", "Ни один счёт не держит почти всё: риск концентрации невысок.") },
    runwayDays !== null
      ? { icon: String(Math.round(runwayDays)), tone: runwayDays < 30 ? RED : MINT, title: `${t("analytics.enough_for", "Хватит на")} ≈ ${Math.round(runwayDays)} ${plural(Math.round(runwayDays), t("analytics.day_one", "день"), t("analytics.day_few", "дня"), t("analytics.day_many", "дней"))}`, text: `${t("analytics.runway_text", "Ликвидных денег хватит примерно на столько при текущем темпе трат")} ${money(dailySpend)} ${t("analytics.per_day", "в день")}.` }
      : { icon: "∞", tone: MINT, title: t("analytics.no_spend", "Расходов за 30 дней нет"), text: t("analytics.no_spend_text", "Оценить запас по дням пока не из чего.") },
  ];

  // ---------- categories tab ----------
  const byCatAll = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach(({ tx, v }) => m.set(tx.category, (m.get(tx.category) || 0) + v));
    return Array.from(m.entries()).map(([name, amt]) => ({ name, amt })).sort((a, b) => b.amt - a.amt);
  }, [expenses]);
  const included = byCatAll.filter((c) => !excl[c.name]);
  const total = included.reduce((s, c) => s + c.amt, 0);
  const daysInRange = Math.max(1, differenceInCalendarDays(today, rangeStart) + 1);
  const perDay = total / daysInRange;
  const topCat = included[0];
  const isFixed = (tx: { category: string; isRecurring?: boolean }) => Boolean(tx.isRecurring) || Boolean(mand[tx.category]);
  const fixedAmt = expenses.filter(({ tx }) => !excl[tx.category] && isFixed(tx)).reduce((s, x) => s + x.v, 0);
  const suggestCat = included.find((c) => HOUSING_RE.test(c.name) && !mand[c.name] && !expenses.some(({ tx }) => tx.category === c.name && tx.isRecurring));
  const pctOf = (v: number, tot = total) => (tot > 0 ? (v / tot) * 100 : 0);
  const pct1 = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;

  const monthStart = startOfMonth(now);
  const dim = endOfMonth(now).getDate();
  const dom = now.getDate();
  const curMonthTx = transactions.filter((tx) => tx.type === "expense" && !isBalanceAdjustment(tx) && !excl[tx.category] && new Date(tx.date) >= monthStart && new Date(tx.date) <= now);
  const prevStart = startOfMonth(subMonths(now, 1));
  const prevMonthTx = transactions.filter((tx) => tx.type === "expense" && !isBalanceAdjustment(tx) && !excl[tx.category] && new Date(tx.date) >= prevStart && new Date(tx.date) < monthStart);
  const monthSpent = curMonthTx.reduce((s, tx) => s + conv(tx.amount, tx.currency), 0);
  const prevTotal = prevMonthTx.reduce((s, tx) => s + conv(tx.amount, tx.currency), 0);
  const monthPace = monthSpent / Math.max(1, dom);
  const forecast = monthPace * dim;

  const speed = useMemo(() => {
    const cumul = (list: typeof curMonthTx, start: Date, days: number, upTo: number) => {
      const per = new Array(days + 1).fill(0);
      list.forEach((tx) => {
        const d = new Date(tx.date).getDate();
        if (d >= 1 && d <= days) per[d] += convertCurrency(tx.amount, tx.currency, defaultCurrency);
      });
      const out: number[] = [];
      let c = 0;
      for (let d = 1; d <= upTo; d++) {
        c += per[d];
        out.push(c);
      }
      return out;
    };
    const cur = cumul(curMonthTx, monthStart, dim, dom);
    const prevDays = endOfMonth(prevStart).getDate();
    const prev = cumul(prevMonthTx, prevStart, prevDays, prevDays);
    const ymax = Math.max(forecast, prevTotal, monthSpent, 1) * 1.05;
    const X = (d: number) => (((d - 1) / Math.max(1, dim - 1)) * 100).toFixed(2);
    const Y = (v: number) => (100 - (v / ymax) * 100).toFixed(2);
    const curLine = cur.map((v, i) => `${X(i + 1)},${Y(v)}`).join(" ");
    const prevLine = prev.slice(0, dim).map((v, i) => `${X(i + 1)},${Y(v)}`).join(" ");
    const grid = [0, 1, 2, 3].map((k) => ({ top: k * 33.33, label: shortMoney(ymax * (1 - k / 3), i18n.language) }));
    const xs = Array.from(new Set([1, Math.round(dom / 2), dom, dim])).sort((a, b) => a - b);
    return {
      curLine,
      prevLine,
      fLine: `${X(dom)},${Y(monthSpent)} ${X(dim)},${Y(forecast)}`,
      todayX: X(dom),
      grid,
      xs: xs.map((d) => ({ left: X(d), label: `${t("analytics.day_word", "День")} ${d}` })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curMonthTx, prevMonthTx, forecast, prevTotal, monthSpent, dim, dom, i18n.language]);

  const dayBars = useMemo(() => {
    const span = Math.min(31, daysInRange);
    const days = Array.from({ length: span }, (_, i) => subDays(today, span - 1 - i));
    const sums = days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      return expenses
        .filter(({ tx }) => !excl[tx.category] && format(new Date(tx.date), "yyyy-MM-dd") === key)
        .reduce((s, x) => s + x.v, 0);
    });
    const max = Math.max(...sums, 1);
    const peakIdx = sums.indexOf(Math.max(...sums));
    return { days, sums, max, peakIdx: Math.max(...sums) > 0 ? peakIdx : -1 };
  }, [daysInRange, today, expenses, excl]);

  const donutCat = (() => {
    if (total <= 0) return "#232721";
    let acc = 0;
    const stops = included.map((c) => {
      const a0 = (acc / total) * 100;
      acc += c.amt;
      return `${catColor(c.name)} ${a0.toFixed(2)}% ${((acc / total) * 100).toFixed(2)}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  })();

  // ---------- tags tab ----------
  const tagStats = useMemo(() => {
    const byTag = new Map<string, { amt: number; count: number }>();
    let untagged = 0;
    let untaggedCount = 0;
    const untaggedByCat = new Map<string, number>();
    expenses.forEach(({ tx, v }) => {
      if (tx.tags && tx.tags.length) {
        tx.tags.forEach((tg) => {
          const e = byTag.get(tg) || { amt: 0, count: 0 };
          e.amt += v;
          e.count += 1;
          byTag.set(tg, e);
        });
      } else {
        untagged += v;
        untaggedCount += 1;
        untaggedByCat.set(tx.category, (untaggedByCat.get(tx.category) || 0) + v);
      }
    });
    const rows = Array.from(byTag.entries()).map(([name, e]) => ({ name, ...e })).sort((a, b) => b.amt - a.amt);
    const totalAll = expenses.reduce((s, x) => s + x.v, 0);
    const bigUntagged = Array.from(untaggedByCat.entries()).map(([name, amt]) => ({ name, amt })).sort((a, b) => b.amt - a.amt).slice(0, 3);
    const frequent = [...rows].sort((a, b) => b.count - a.count)[0] || null;
    return { rows, untagged, untaggedCount, totalAll, bigUntagged, frequent };
  }, [expenses]);

  const opsWord = (n: number) => `${n} ${plural(n, t("analytics.op_one", "операция"), t("analytics.op_few", "операции"), t("analytics.op_many", "операций"))}`;

  const tabs: { key: Tab; label: string }[] = [
    { key: "cap", label: t("analytics.tab_cap", "Динамика капитала") },
    { key: "cat", label: t("analytics.tab_cat", "Расходы по категориям") },
    { key: "tag", label: t("analytics.tab_tag", "Расходы по тегам") },
  ];
  const perLabel = (p: Period) => (p === "7D" ? t("overview.p7d", "7Д") : p === "1M" ? t("analytics.p1m", "1М") : p === "3M" ? t("overview.p3m", "3М") : p === "6M" ? t("overview.p6m", "6М") : t("overview.p1y", "1Г"));
  const monthGen = format(now, "MMMM", { locale: dateLocale });
  const unusedTags = tags.map((x) => x.name);
  const usedTags = new Set(tagStats.rows.map((r) => r.name));

  return (
    <div className="flex flex-col gap-5 pb-20 text-[#F1F3EE] tabular-nums md:pb-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.02em]">{t("common.analytics", "Аналитика")}</h1>
          <p className="mt-1 text-sm text-[#8D9388]">{t("analytics.subtitle", "Куда уходят деньги и как меняется капитал")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div role="group" aria-label={t("overview.period", "Период")} className="flex gap-0.5 rounded-xl border border-[#232721] bg-[#151714] p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPer(p)}
                aria-pressed={per === p}
                className={cn("h-[34px] rounded-[9px] px-3.5 text-[13px] font-semibold transition-colors", per === p ? "bg-[#2A2F27] text-[#F1F3EE]" : "text-[#A2A89C] hover:text-[#F1F3EE]")}
              >
                {perLabel(p)}
              </button>
            ))}
          </div>
          <span className="flex h-11 items-center gap-2.5 rounded-xl border border-[#232721] bg-[#151714] px-4 text-[13.5px] font-semibold">
            <Calendar className="h-4 w-4" strokeWidth={1.8} />
            {rangeTxt}
          </span>
        </div>
      </header>

      <div role="tablist" aria-label={t("analytics.sections", "Раздел аналитики")} className="flex gap-1 rounded-[14px] border border-[#232721] bg-[#151714] p-1">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            role="tab"
            aria-selected={tab === tb.key}
            onClick={() => setTab(tb.key)}
            className={cn("h-11 flex-1 rounded-[10px] text-sm font-semibold transition-colors", tab === tb.key ? "bg-[#0E0F0E] text-[#F1F3EE]" : "text-[#8D9388] hover:text-[#F1F3EE]")}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* ================= CAPITAL ================= */}
      {tab === "cap" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <div className={cn(card, "border-[#2C3A1C] bg-[linear-gradient(180deg,#171E10,#151714)]")}>
              <div className="text-[12.5px] font-semibold text-[#A8D95A]">{t("dashboard.net_worth_total")}</div>
              <div className="mt-1.5 text-[30px] font-bold tracking-[-0.02em] text-[#C6F24E]">{money(breakdown.total)}</div>
              <div className={cn(cap, "mt-1")}>{t("overview.on_date", "на")} {format(now, "dd.MM.yyyy")}</div>
            </div>
            <div className={card}>
              <div className={cn(cap, "font-semibold")}>{t("analytics.change", "Изменение за период")}</div>
              <div className="mt-1.5 text-[30px] font-bold tracking-[-0.02em]" style={{ color: chg < 0 ? RED : MINT }}>{signedMoney(chg, defaultCurrency)}</div>
              <div className={cn(cap, "mt-1")}>{chg < 0 ? MINUS : "+"}{Math.abs(chgPct).toFixed(1).replace(".", ",")}% {t("analytics.since", "с")} {points[0] ? format(points[0].date, "dd.MM.yyyy") : "—"}</div>
            </div>
            <div className={card}>
              <div className={cn(cap, "font-semibold")}>{t("analytics.liquid_assets", "Ликвидные активы")}</div>
              <div className="mt-1.5 text-[30px] font-bold tracking-[-0.02em]">{money(breakdown.liquid)}</div>
              <div className={cn(cap, "mt-1")}>{liquidPct.toFixed(1).replace(".", ",")}% {t("analytics.of_capital", "капитала")} · {t("analytics.free_money", "свободные деньги")}</div>
            </div>
            <div className={card}>
              <div className={cn(cap, "font-semibold")}>{t("analytics.accounts_title", "Счета")}</div>
              <div className="mt-1.5 text-[30px] font-bold tracking-[-0.02em]">{accounts.length}</div>
              <div className={cn(cap, "mt-1")} style={{ color: negAcc.length ? "#FCA5A5" : undefined }}>
                {negAcc.length ? `${negAcc.length} ${t("analytics.in_minus_n", "в минусе")}: ${negAcc.map((a) => a.name).join(", ")}` : t("analytics.no_negative", "Отрицательных балансов нет")}
              </div>
            </div>
          </div>

          <section className={card} aria-label={t("overview.capital_dynamics", "Динамика капитала")}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
              <div>
                <h2 className={h2}>{t("overview.capital_dynamics", "Динамика капитала")}</h2>
                <div className={cn(cap, "mt-0.5")}>{rangeTxt} · {t("analytics.hover_day", "наведите на график, чтобы увидеть день")}</div>
              </div>
              {truncated && <div className="text-[12.5px] text-[#FBBF24]">{t("analytics.history_from", "Истории до")} {format(histStart, "d MMMM", { locale: dateLocale })} {t("analytics.history_from2", "нет, график начинается с первого дня")}</div>}
            </div>
            <CapitalChart key={per} points={points} currency={defaultCurrency} height={300} gridInset={56} />
          </section>

          <div className="flex flex-wrap items-stretch gap-5">
            <section className={cn(card, "flex min-w-0 flex-[1_1_360px] flex-col gap-5")} aria-label={t("analytics.distribution", "Распределение капитала")}>
              <h2 className={h2}>{t("analytics.distribution", "Распределение капитала")}</h2>
              <div className="flex flex-wrap items-center gap-6">
                <div className="relative h-[170px] w-[170px] flex-none rounded-full" style={{ background: donutCap }} role="img" aria-label={t("analytics.shares_by_type", "Доли счетов по типам")}>
                  <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-[#151714]">
                    <b className="text-[19px]">{shortMoney(breakdown.total, i18n.language)}</b>
                    <span className={cap}>{t("analytics.total_word", "всего")}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 text-[13.5px]">
                  {typeParts.map((p) => (
                    <span key={p.type} className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[p.type] }} />
                      <span className="min-w-[130px] text-[#A2A89C]">{typeLabel(p.type)}</span>
                      <b>{pct1(p.share)}</b>
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className={cn(card, "min-w-0 flex-[2_1_520px]")} aria-label={t("analytics.by_accounts", "Состав по счетам")}>
              <h2 className={h2}>{t("analytics.by_accounts", "Состав по счетам")}</h2>
              <div className="mt-3 flex flex-col">
                <div className="grid grid-cols-[1.3fr_1fr_1.2fr_1fr] gap-3 px-2.5 py-2 text-xs font-semibold text-[#8D9388]">
                  <span>{t("analytics.col_account", "Счёт")}</span>
                  <span>{t("analytics.col_type", "Тип")}</span>
                  <span className="text-right">{t("analytics.col_balance", "Баланс")}</span>
                  <span className="text-right">{t("analytics.col_share", "Доля")}</span>
                </div>
                {accRows.map((a) => {
                  const v = conv(a.balance, a.currency);
                  const share = a.balance < 0 || partsTotal <= 0 ? 0 : (v / partsTotal) * 100;
                  return (
                    <Link key={a.id} href="/accounts" className="grid grid-cols-[1.3fr_1fr_1.2fr_1fr] items-center gap-3 rounded-lg border-t border-[#1E211C] px-2.5 py-3 text-[#F1F3EE] no-underline transition-colors hover:bg-[#1A1D19]">
                      <span className="truncate font-semibold">{a.name}</span>
                      <span><span className="inline-block rounded-full border border-[#2A2E27] bg-[#1B1E1A] px-2.5 py-[3px] text-xs text-[#C9CEC3]">{typeLabel(a.type)}</span></span>
                      <span className="text-right font-semibold" style={{ color: a.balance < 0 ? RED : "#F1F3EE" }}>
                        {a.balance < 0 ? MINUS : ""}{fmtMoney(Math.abs(a.balance), a.currency)}
                        {a.currency !== defaultCurrency && <span className="block text-xs font-normal text-[#8D9388]">≈ {signedMoney(v, defaultCurrency)}</span>}
                      </span>
                      <span className="text-right">
                        <span className="text-[13px] text-[#C9CEC3]">{a.balance < 0 && partsTotal > 0 ? `${MINUS}${Math.abs((v / partsTotal) * 100).toFixed(1).replace(".", ",")}%` : pct1(share)}</span>
                        <span className="mt-1.5 block h-1 overflow-hidden rounded-sm bg-[#232721]">
                          <svg className="block h-1 w-full" aria-hidden="true"><rect width={`${share.toFixed(1)}%`} height="4" fill={a.balance < 0 ? RED : TYPE_COLOR[a.type]} /></svg>
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
            {insights.map((ins) => (
              <div key={ins.title} className={cn(card, "flex items-start gap-3.5 px-5 py-[18px]")}>
                <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[10px] font-bold" style={{ background: `${ins.tone}24`, color: ins.tone }}>{ins.icon}</span>
                <span>
                  <span className="block text-sm font-bold">{ins.title}</span>
                  <span className="mt-[3px] block text-[13px] text-[#A2A89C]">{ins.text}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= CATEGORIES ================= */}
      {tab === "cat" && (
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex min-w-0 flex-[3_1_640px] flex-col gap-5">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <div className={card}>
                <div className={cn(cap, "font-semibold")}>{t("analytics.total_expenses", "Всего расходов")}</div>
                <div className="mt-1.5 text-[28px] font-bold tracking-[-0.02em]">{money(total)}</div>
                <div className={cn(cap, "mt-1")}>{t("analytics.from_to", "с")} {format(rangeStart, "d MMMM", { locale: dateLocale })} {t("analytics.to_word", "по")} {format(now, "d MMMM", { locale: dateLocale })}</div>
              </div>
              <div className={card}>
                <div className={cn(cap, "font-semibold")}>{t("analytics.per_day_avg", "В среднем в день")}</div>
                <div className="mt-1.5 text-[28px] font-bold tracking-[-0.02em]">{money(perDay)}</div>
                <div className={cn(cap, "mt-1")}>≈ {money(perDay * 30)} {t("analytics.per_month", "в месяц")}</div>
              </div>
              <div className={card}>
                <div className={cn(cap, "font-semibold")}>{t("analytics.top_category", "Главная категория")}</div>
                <div className="mt-1.5 truncate text-[28px] font-bold tracking-[-0.02em]">{topCat ? topCat.name : "—"}</div>
                <div className={cn(cap, "mt-1")}>{topCat ? `${pct1(pctOf(topCat.amt))} ${t("analytics.of_all", "от всех расходов")}` : t("analytics.no_data", "нет данных")}</div>
              </div>
            </div>

            <section className={card} aria-label={t("analytics.forecast_end", "Прогноз на конец месяца")}>
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div>
                  <div className={cn(cap, "font-semibold")}>{t("analytics.forecast_for", "Прогноз на конец")} {monthGen}</div>
                  <div className="mt-1 text-[32px] font-bold tracking-[-0.02em]">{money(forecast)}</div>
                </div>
                <div className={cn(cap, "text-right")}>
                  {t("analytics.pace", "Темп")}: {money(monthPace)} {t("analytics.per_day", "в день")}
                  <br />
                  {t("analytics.prev_month", "Прошлый месяц")}: {money(prevTotal)}
                </div>
              </div>
              <div className="mt-4 flex h-2.5 overflow-hidden rounded-[5px] bg-[#232721]">
                <span className="bg-[#C6F24E]" style={{ flex: `${forecast > 0 ? Math.min(100, (monthSpent / forecast) * 100).toFixed(1) : 0} 1 0%` }} />
                <span style={{ flex: `${forecast > 0 ? Math.max(0, 100 - (monthSpent / forecast) * 100).toFixed(1) : 100} 1 0%` }} />
              </div>
              <div className={cn(cap, "mt-2 flex justify-between")}>
                <span>{t("analytics.spent_already", "Уже потрачено")} {money(monthSpent)}</span>
                <span>{t("analytics.left_by_forecast", "Осталось по прогнозу")} {money(Math.max(0, forecast - monthSpent))}</span>
              </div>
            </section>

            <section className={card} aria-label={t("analytics.speed", "Скорость трат")}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
                <div>
                  <h2 className={h2}>{t("analytics.speed", "Скорость трат")}</h2>
                  <div className={cn(cap, "mt-0.5")}>{t("analytics.speed_hint", "Накопительно: этот месяц и прошлый")}</div>
                </div>
                <div className="flex gap-4 text-[12.5px] text-[#A2A89C]">
                  <span className="flex items-center gap-1.5"><span className="h-[3px] w-3.5 bg-[#C6F24E]" />{cap1(format(now, "LLLL", { locale: dateLocale }))}</span>
                  <span className="flex items-center gap-1.5"><span className="h-[3px] w-3.5 bg-[#8D9388]" />{cap1(format(prevStart, "LLLL", { locale: dateLocale }))}</span>
                  <span className="flex items-center gap-1.5"><span className="w-3.5 border-t-2 border-dashed border-[#C6F24E]" />{t("limits.forecast", "Прогноз")}</span>
                </div>
              </div>
              <div className="relative mb-7 ml-[52px] mt-[18px] h-[220px]">
                {speed.grid.map((g, i) => (
                  <div key={i} className="absolute left-0 right-0 border-t border-dashed border-[#20231E]" style={{ top: `${g.top}%` }}>
                    <span className="absolute -left-[52px] -top-[9px] w-11 text-right text-[11.5px] text-[#8D9388]">{g.label}</span>
                  </div>
                ))}
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                  <polyline points={speed.prevLine} fill="none" stroke="#8D9388" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                  <polyline points={speed.fLine} fill="none" stroke="#C6F24E" strokeWidth={2} strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
                  <polyline points={speed.curLine} fill="none" stroke="#C6F24E" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="absolute bottom-0 top-0 border-l border-dashed border-[#3A3F36]" style={{ left: `${speed.todayX}%` }} />
                <div className="absolute -top-1 -translate-x-1/2 bg-[#151714] px-1 text-[11px] text-[#8D9388]" style={{ left: `${speed.todayX}%` }}>{t("analytics.today_lc", "сегодня")}</div>
                <div className="absolute -bottom-[22px] left-0 right-0 h-4">
                  {speed.xs.map((x, i) => <span key={i} className="absolute -translate-x-1/2 text-[11.5px] text-[#8D9388]" style={{ left: `${x.left}%` }}>{x.label}</span>)}
                </div>
              </div>
            </section>

            <section className={card} aria-label={t("analytics.by_days", "Расходы по дням")}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
                <div>
                  <h2 className={h2}>{t("analytics.by_days", "Расходы по дням")}</h2>
                  <div className={cn(cap, "mt-0.5")}>{rangeTxt} · {t("analytics.hover_bar", "наведите на столбец")}</div>
                </div>
                {dayBars.peakIdx >= 0 && (
                  <span className="rounded-full bg-[#F87171]/[0.12] px-2.5 py-1 text-xs font-semibold text-[#FCA5A5]">
                    {t("analytics.peak", "Пик")}: {format(dayBars.days[dayBars.peakIdx], "EEEE, d MMMM", { locale: dateLocale })}
                  </span>
                )}
              </div>
              <div className="mt-4 flex h-[130px] items-end gap-1.5">
                {dayBars.sums.map((v, i) => (
                  <div key={i} title={`${format(dayBars.days[i], "dd.MM")}: ${money(v)}`} className="flex h-full flex-1 flex-col justify-end">
                    <svg className="block w-full" height={`${((v / dayBars.max) * 100).toFixed(1)}%`} style={{ minHeight: 3 }} aria-hidden="true">
                      <rect width="100%" height="100%" rx="4" fill={i === dayBars.peakIdx ? RED : v > 0 ? "#C26A6A" : "#232721"} />
                    </svg>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex gap-1.5">
                {dayBars.days.map((d, i) => <span key={i} className="flex-1 text-center text-[11px] text-[#8D9388]">{d.getDate() % 2 === 1 || dayBars.days.length <= 8 ? d.getDate() : ""}</span>)}
              </div>
            </section>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
              <div className={cn(card, "px-5 py-[18px]")}>
                <div className="flex justify-between gap-2.5"><span className="font-semibold">{t("analytics.fixed", "Постоянные расходы")}</span><span className={cap}>{t("analytics.mandatory_lc", "обязательные")}</span></div>
                <div className="mt-1.5 text-2xl font-bold">{money(fixedAmt)}</div>
                <div className={cn(cap, "mt-0.5")}>{pct1(pctOf(fixedAmt))} {t("analytics.of_expenses", "от расходов")}</div>
              </div>
              <div className={cn(card, "px-5 py-[18px]")}>
                <div className="flex justify-between gap-2.5"><span className="font-semibold">{t("analytics.variable", "Переменные расходы")}</span><span className={cap}>{t("analytics.optional_lc", "по желанию")}</span></div>
                <div className="mt-1.5 text-2xl font-bold">{money(total - fixedAmt)}</div>
                <div className={cn(cap, "mt-0.5")}>{pct1(pctOf(total - fixedAmt))} {t("analytics.of_expenses", "от расходов")}</div>
              </div>
            </div>

            {suggestCat && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[14px] border border-[#FBBF24]/30 bg-[#FBBF24]/[0.08] px-[18px] py-3.5">
                <span className="min-w-[240px] flex-[1_1_280px] text-[13.5px] text-[#C9CEC3]">
                  <b className="text-[#FBBF24]">{suggestCat.name}: {money(suggestCat.amt)}</b> {t("analytics.suggest_mandatory", "не отмечено обязательным. Отметьте, и постоянные расходы будут считаться точнее.")}
                </span>
                <button onClick={() => markMandatory(suggestCat.name)} className="h-9 rounded-[10px] border border-[#5A4A1A] bg-transparent px-3.5 text-[13px] font-semibold text-[#F1F3EE] transition-colors hover:bg-[#1B1E1A]">
                  {t("analytics.mark_mandatory", "Отметить обязательным")}
                </button>
              </div>
            )}

            <section className={card} aria-label={t("analytics.structure", "Структура расходов")}>
              <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
                <div>
                  <h2 className={h2}>{t("analytics.structure", "Структура расходов")}</h2>
                  <div className={cn(cap, "mt-0.5")}>{t("analytics.structure_hint", "Распределение по категориям")}</div>
                </div>
                <div className="flex gap-0.5 rounded-xl border border-[#232721] bg-[#0E0F0E] p-1">
                  {(["pie", "bar"] as const).map((v) => (
                    <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cn("h-8 rounded-[9px] px-3.5 text-[13px] font-semibold transition-colors", view === v ? "bg-[#2A2F27] text-[#F1F3EE]" : "text-[#A2A89C] hover:text-[#F1F3EE]")}>
                      {v === "pie" ? t("analytics.view_pie", "Круговая") : t("analytics.view_bar", "Столбчатая")}
                    </button>
                  ))}
                </div>
              </div>
              {included.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-[#8D9388]">{t("analytics.no_expenses", "За выбранный период расходов нет")}</div>
              ) : view === "pie" ? (
                <div className="mt-5 flex flex-wrap items-center gap-7">
                  <div className="relative h-[190px] w-[190px] flex-none rounded-full" style={{ background: donutCat }} role="img" aria-label={t("analytics.cat_shares", "Доли категорий")}>
                    <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-[#151714]">
                      <b className="text-[18px]">{money(total)}</b>
                      <span className={cap}>{t("analytics.expenses_lc", "расходов")}</span>
                    </div>
                  </div>
                  <div className="flex min-w-[260px] flex-[1_1_260px] flex-col gap-1.5">
                    {included.map((c) => (
                      <div key={c.name} className="flex items-center gap-2.5 border-b border-[#1E211C] py-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: catColor(c.name) }} />
                        <span className="flex-1 truncate font-medium">{catLabel(c.name)}</span>
                        <span className="text-[#A2A89C]">{money(c.amt)}</span>
                        <b className="min-w-[52px] text-right">{pct1(pctOf(c.amt))}</b>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-3.5">
                  {included.map((c) => (
                    <div key={c.name}>
                      <div className="mb-1.5 flex justify-between text-[13.5px]">
                        <span className="font-semibold">{catLabel(c.name)}</span>
                        <span className="text-[#A2A89C]">{money(c.amt)} · <b className="text-[#F1F3EE]">{pct1(pctOf(c.amt))}</b></span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-md bg-[#232721]">
                        <svg className="block h-3 w-full" aria-hidden="true"><rect width={`${pctOf(c.amt).toFixed(1)}%`} height="12" rx="6" fill={catColor(c.name)} /></svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className={cn(card, "flex min-w-0 max-w-[340px] flex-[1_1_260px] flex-col gap-3.5")} aria-label={t("analytics.what_to_count", "Что учитывать")}>
            <div>
              <h2 className={h2}>{t("analytics.what_to_count", "Что учитывать")}</h2>
              <div className={cn(cap, "mt-0.5")}>{t("analytics.what_to_count_hint", "Снимите галочку, чтобы исключить категорию из расчётов")}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              {byCatAll.map((c) => {
                const on = !excl[c.name];
                return (
                  <button
                    key={c.name}
                    onClick={() => setExcl((e) => ({ ...e, [c.name]: !e[c.name] }))}
                    aria-pressed={on}
                    className="flex w-full items-center gap-3 rounded-xl border border-[#232721] bg-transparent px-3 py-2.5 text-left text-sm text-[#F1F3EE] transition-colors hover:bg-[#1B1E1A]"
                  >
                    <span className={cn("flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 text-xs font-bold text-[#10170A]", on ? "border-[#C6F24E] bg-[#C6F24E]" : "border-[#3A3F36]")}>{on ? "✓" : ""}</span>
                    <span className="flex-1 truncate">{catLabel(c.name)}</span>
                    <span className={cap}>{money(c.amt)}</span>
                  </button>
                );
              })}
            </div>
            <div className={cn(cap, "border-t border-[#232721] pt-2")}>{t("analytics.filter_note", "Фильтр влияет на итоги, среднее, структуру и долю обязательных расходов.")}</div>
          </aside>
        </div>
      )}

      {/* ================= TAGS ================= */}
      {tab === "tag" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            <div className={card}>
              <div className={cn(cap, "font-semibold")}>{t("analytics.top_tag", "Главный тег по расходам")}</div>
              <div className="mt-1.5 truncate text-[28px] font-bold">{tagStats.rows[0] ? `#${tagStats.rows[0].name}` : "—"}</div>
              <div className={cn(cap, "mt-1")}>{tagStats.rows[0] ? `${money(tagStats.rows[0].amt)} ${t("analytics.total_lc", "всего")}` : t("analytics.no_tags_used", "Теги в расходах не используются")}</div>
            </div>
            <div className={card}>
              <div className={cn(cap, "font-semibold")}>{t("analytics.most_frequent", "Самый частый")}</div>
              <div className="mt-1.5 truncate text-[28px] font-bold">{tagStats.frequent ? `#${tagStats.frequent.name}` : "—"}</div>
              <div className={cn(cap, "mt-1")}>{tagStats.frequent ? `${t("analytics.used_in", "использован в")} ${tagStats.frequent.count} ${plural(tagStats.frequent.count, t("analytics.in_op_one", "операции"), t("analytics.in_op_few", "операциях"), t("analytics.in_op_many", "операциях"))}` : "—"}</div>
            </div>
            <div className={card}>
              <div className={cn(cap, "font-semibold")}>{t("analytics.untagged_share", "Расходов без тега")}</div>
              <div className="mt-1.5 text-[28px] font-bold text-[#FBBF24]">{pct1(pctOf(tagStats.untagged, tagStats.totalAll))}</div>
              <div className={cn(cap, "mt-1")}>{money(tagStats.untagged)} {t("limits.of", "из")} {money(tagStats.totalAll)}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-5">
            <section className={cn(card, "min-w-0 flex-[2_1_520px]")} aria-label={t("analytics.by_tags", "Расходы по тегам")}>
              <h2 className={h2}>{t("analytics.by_tags", "Расходы по тегам")}</h2>
              <div className={cn(cap, "mt-0.5")}>{t("analytics.by_tags_hint", "Сколько потрачено с каждым тегом и без него")}</div>
              <div className="mt-[22px] flex flex-col gap-[18px]">
                {[...tagStats.rows.map((r) => ({ key: r.name, name: `#${r.name}`, amt: r.amt, count: r.count, color: "#C6F24E" })), { key: "__none", name: t("analytics.no_tag", "Без тега"), amt: tagStats.untagged, count: tagStats.untaggedCount, color: "#4A5043" }]
                  .filter((r) => r.amt > 0)
                  .map((r) => {
                    const share = pctOf(r.amt, tagStats.totalAll);
                    return (
                      <div key={r.key}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="font-semibold">{r.name}</span>
                          <span className="text-[#A2A89C]">{money(r.amt)} · <b className="text-[#F1F3EE]">{pct1(share)}</b> · {opsWord(r.count)}</span>
                        </div>
                        <div className="h-4 overflow-hidden rounded-lg bg-[#232721]">
                          <svg className="block h-4 w-full" aria-hidden="true"><rect width={`${Math.max(share, 1).toFixed(1)}%`} height="16" rx="8" fill={r.color} /></svg>
                        </div>
                      </div>
                    );
                  })}
                {tagStats.totalAll === 0 && <div className="py-6 text-center text-[13px] text-[#8D9388]">{t("analytics.no_expenses", "За выбранный период расходов нет")}</div>}
              </div>
            </section>

            <section className={cn(card, "flex min-w-0 flex-[1_1_300px] flex-col gap-3.5")} aria-label={t("analytics.untagged_big", "Крупное без тегов")}>
              <div>
                <h2 className={h2}>{t("analytics.untagged_big", "Крупное без тегов")}</h2>
                <div className={cn(cap, "mt-0.5")}>{t("analytics.untagged_hint", "Присвойте теги, и анализ станет полезнее")}</div>
              </div>
              {tagStats.bigUntagged.map((u) => (
                <Link key={u.name} href="/transactions" className="flex items-center gap-3 rounded-xl border border-[#232721] px-3 py-2.5 text-[#F1F3EE] no-underline transition-colors hover:bg-[#1A1D19]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: catColor(u.name) }} />
                  <span className="flex-1 truncate font-medium">{catLabel(u.name)}</span>
                  <b>{money(u.amt)}</b>
                </Link>
              ))}
              <div className={cn(cap, "border-t border-[#232721] pt-2")}>
                {unusedTags.length > 0 ? `${t("analytics.your_tags", "Ваши метки в Настройках")}: ${unusedTags.map((x) => `#${x}`).join(", ")}. ` : ""}
                {usedTags.size > 0 ? `${t("analytics.used_only", "Пока используется")}: ${Array.from(usedTags).map((x) => `#${x}`).join(", ")}.` : t("analytics.none_used", "Пока ни одна метка не используется в расходах.")}
              </div>
              <Link href="/transactions" className="flex h-10 items-center justify-center rounded-xl border border-[#2A2E27] text-[13.5px] font-semibold text-[#F1F3EE] no-underline transition-colors hover:bg-[#1B1E1A]">
                {t("analytics.assign_tags", "Расставить теги в операциях")}
              </Link>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
