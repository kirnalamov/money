"use client";

import { useMemo, useState } from "react";
import { useLivePortfolioValue } from "@/lib/live-portfolio";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useNotifications } from "@/lib/notifications";
import { isBalanceAdjustment } from "@/lib/capital";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { format, startOfMonth, startOfDay, subDays, subMonths } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, Bell, Calendar, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { DashboardDataSourceStatus } from "@/components/dashboard/data-source-status";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { CapitalChart } from "@/components/dashboard/capital-chart";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { useStore } from "@/lib/store";
import { cn, convertCurrency } from "@/lib/utils";
import { capitalBreakdown, capitalSeries, earliestTransactionDate } from "@/lib/capital";
import { limitDetail, limitTransactions, periodWindow } from "@/lib/limit-detail";
import { categoryEmoji, fmtMoney, goalColor, hashColor, MINUS, signedMoney, withAlpha } from "@/lib/plutus-format";
import type { Transaction } from "@/types";

const MINT = "#6EE7A0";
const RED = "#F87171";
const AMBER = "#FBBF24";
const PERIODS = ["7D", "30D", "3M", "6M", "1Y", "ALL"] as const;
type Period = (typeof PERIODS)[number];

const cardCls = "box-border rounded-[20px] border border-[#232721] bg-[#151714] px-6 py-[22px]";
const h2Cls = "text-xl font-semibold";
const moreCls = "text-[13px] font-semibold text-[#A2A89C] no-underline transition-colors hover:text-[#F1F3EE]";

export default function OverviewPage() {
  const { t, i18n } = useTranslation();
  const isRu = i18n.language?.startsWith("ru");
  const dateLocale = isRu ? ru : enUS;
  const { accounts, transactions, limits, goals, categories, recurringExpenses, toggleRecurringExpense, defaultCurrency } = useStore();

  const now = useMemo(() => new Date(), []);
  const [per, setPer] = useState<Period>("30D");
  const [activeType, setActiveType] = useState<"expense" | "income" | "transfer" | "trade" | null>(null);

  const conv = (v: number, cur: string) => convertCurrency(v, cur, defaultCurrency);
  const catColor = (name: string) => {
    const c = categories.find((x) => x.name === name);
    return c?.color && c.color.toLowerCase() !== "#666666" ? c.color : hashColor(name);
  };
  const catEmoji = (name: string) => categoryEmoji(name, categories.find((x) => x.name === name)?.icon);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- capital ----------
  const { value: positionsValue } = useLivePortfolioValue();
  const breakdown = useMemo(() => capitalBreakdown(accounts, defaultCurrency, positionsValue), [accounts, defaultCurrency, positionsValue]);
  const histStart = useMemo(() => earliestTransactionDate(transactions) || subDays(startOfDay(now), 30), [transactions, now]);

  const monthSeries = useMemo(
    () => capitalSeries(accounts, transactions, defaultCurrency, subDays(startOfDay(now), 30), now, positionsValue),
    [accounts, transactions, defaultCurrency, now, positionsValue]
  );
  const monthBase = monthSeries[0]?.value ?? breakdown.total;
  const monthChange = breakdown.total - monthBase;
  const monthPct = monthBase !== 0 ? (monthChange / Math.abs(monthBase)) * 100 : 0;

  const wanted = useMemo(() => {
    const today = startOfDay(now);
    switch (per) {
      case "7D": return subDays(today, 6);
      case "30D": return subDays(today, 30);
      case "3M": return subMonths(today, 3);
      case "6M": return subMonths(today, 6);
      case "1Y": return subMonths(today, 12);
      default: return histStart;
    }
  }, [per, now, histStart]);
  const effStart = wanted.getTime() < histStart.getTime() ? histStart : wanted;
  const truncated = per !== "7D" && per !== "30D" && wanted.getTime() < histStart.getTime();
  const points = useMemo(
    () => capitalSeries(accounts, transactions, defaultCurrency, effStart, now, positionsValue),
    [accounts, transactions, defaultCurrency, effStart, now]
  );

  const accountsOf = (type: string) => accounts.filter((a) => a.type === type);
  const names = (list: { name: string }[]) => (list.length === 1 ? list[0].name : `${list.length} ${t("overview.accounts_word", "счёта")}`);
  const share = (v: number) => (breakdown.total > 0 ? ((v / breakdown.total) * 100).toFixed(1).replace(".", ",") : "0");
  const negCash = accountsOf("cash").find((a) => a.balance < 0);
  const comp = [
    { label: t("overview.free", "Свободно"), v: breakdown.bank, color: "#C6F24E", sub: accountsOf("bank").length ? names(accountsOf("bank")) : "—", href: "/accounts" },
    { label: t("overview.investments", "Инвестиции"), v: breakdown.investments, color: "#38BDF8", sub: `${share(breakdown.investments)}% ${t("overview.of_capital", "капитала")}`, href: "/portfolio" },
    { label: t("overview.savings", "Накопления"), v: breakdown.savings, color: "#C4B5FD", sub: accountsOf("savings").length ? names(accountsOf("savings")) : "—", href: "/savings" },
    { label: t("overview.cash", "Наличные"), v: breakdown.cash, color: AMBER, sub: negCash ? `${negCash.name} ${t("overview.in_minus", "в минусе")}` : accountsOf("cash").length ? names(accountsOf("cash")) : "—", href: "/accounts" },
  ];
  const partsTotal = comp.filter((c) => c.v > 0).reduce((s, c) => s + c.v, 0);

  // ---------- month ----------
  const monthStart = startOfMonth(now);
  const month = useMemo(() => {
    const list = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return !isBalanceAdjustment(tx) && !Number.isNaN(d.getTime()) && d >= monthStart && d <= now;
    });
    let income = 0;
    let expense = 0;
    const byCat = new Map<string, number>();
    list.forEach((tx) => {
      const v = conv(tx.amount, tx.currency);
      if (tx.type === "income") income += v;
      else if (tx.type === "expense") {
        expense += v;
        byCat.set(tx.category, (byCat.get(tx.category) || 0) + v);
      }
    });
    const cats = Array.from(byCat.entries()).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v);
    return { list, income, expense, net: income - expense, cats };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, defaultCurrency, monthStart, now]);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const perDay = month.expense / Math.max(1, dayOfMonth);
  const forecast = perDay * daysInMonth;

  // ---------- limits / alerts ----------
  const limitViews = useMemo(
    () =>
      limits.map((l) => {
        const win = periodWindow(l.period, now);
        const items = limitTransactions(l, transactions, win, now);
        return { l, d: limitDetail(l.amount, items, win) };
      }),
    [limits, transactions, now]
  );

  const isPaidThisMonth = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
  };

  // уведомления: общий центр (колокольчик) и блок «Требует внимания» показывают одни и те же данные
  const { items: notifications, hide: hideNotification, markRead: readNotification } = useNotifications();
  const alerts = notifications.filter((n) => !n.read);

  // ---------- recent operations ----------
  const recent = useMemo(() => {
    const sorted = [...month.list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const rows = sorted.slice(0, 6);
    const days = new Map<string, Transaction[]>();
    rows.forEach((tx) => {
      const key = format(new Date(tx.date), "yyyy-MM-dd");
      days.set(key, [...(days.get(key) || []), tx]);
    });
    const groups = Array.from(days.entries()).map(([key, list]) => {
      const dayAll = sorted.filter((tx) => format(new Date(tx.date), "yyyy-MM-dd") === key);
      const inc = dayAll.filter((x) => x.type === "income" && !isBalanceAdjustment(x)).reduce((s, x) => s + conv(x.amount, x.currency), 0);
      const exp = dayAll.filter((x) => x.type === "expense" && !isBalanceAdjustment(x)).reduce((s, x) => s + conv(x.amount, x.currency), 0);
      const net = [inc > 0 ? `+${fmtMoney(inc, defaultCurrency)}` : "", exp > 0 ? `${MINUS}${fmtMoney(exp, defaultCurrency)}` : ""].filter(Boolean).join(" · ");
      return { key, date: new Date(key), list, net };
    });
    return { groups, rest: Math.max(0, sorted.length - rows.length) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month.list, defaultCurrency]);

  const monthlyLimits = limitViews.filter((x) => x.l.period === "monthly").sort((a, b) => b.d.pct - a.d.pct).slice(0, 3);
  const unpaidFirst = [...recurringExpenses].sort((a, b) => Number(isPaidThisMonth(a.lastPaidDate)) - Number(isPaidThisMonth(b.lastPaidDate)) || a.dueDay - b.dueDay);

  const donutCats = (() => {
    const top = month.cats.slice(0, 4);
    const rest = month.cats.slice(4).reduce((s, c) => s + c.v, 0);
    return rest > 0 ? [...top, { name: t("transactions.other", "Другое"), v: rest }] : top;
  })();
  const donutTotal = donutCats.reduce((s, c) => s + c.v, 0);
  const donutBg = (() => {
    if (donutTotal <= 0) return "#232721";
    let acc = 0;
    const stops = donutCats.map((c) => {
      const a0 = (acc / donutTotal) * 100;
      acc += c.v;
      return `${catColor(c.name)} ${a0.toFixed(2)}% ${((acc / donutTotal) * 100).toFixed(2)}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  })();

  const todayTxt = cap(format(now, "EEEE, d MMMM", { locale: dateLocale }));
  const monthTitle = cap(format(now, "LLLL yyyy", { locale: dateLocale }));
  const monthName = format(now, "LLLL", { locale: dateLocale });
  const savedPct = month.income > 0 ? Math.round((month.net / month.income) * 100) : 0;
  const expensePct = month.income > 0 ? Math.min(100, (month.expense / month.income) * 100) : 100;
  const rangeFrom = points[0]?.date;
  const kShort = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace(".", ",")} ${t("common.thousands_short", "тыс.")} ${defaultCurrency === "USD" ? "$" : defaultCurrency === "EUR" ? "€" : defaultCurrency === "RUB" ? "₽" : "£"}` : fmtMoney(v, defaultCurrency, 0));

  const quick = [
    { label: t("overview.q_expense", "Расход"), sub: t("overview.q_expense_sub", "записать трату"), icon: <ArrowUpRight className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />, color: RED, bg: "bg-[#F87171]/[0.12]", onClick: () => setActiveType("expense") },
    { label: t("overview.q_income", "Доход"), sub: t("overview.q_income_sub", "зарплата, подработка"), icon: <ArrowDownLeft className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />, color: MINT, bg: "bg-[#6EE7A0]/[0.12]", onClick: () => setActiveType("income") },
    { label: t("overview.q_transfer", "Перевод"), sub: t("overview.q_transfer_sub", "между счетами"), icon: "⇄", color: "#7DD3FC", bg: "bg-[#7DD3FC]/[0.12]", onClick: () => setActiveType("transfer") },
    { label: t("overview.q_trade", "Сделка"), sub: t("overview.q_trade_sub", "купить или продать"), icon: "$", color: "#C6F24E", bg: "bg-[#C6F24E]/[0.12]", onClick: () => setActiveType("trade") },
    { label: t("overview.q_save", "Отложить"), sub: t("overview.q_save_sub", "на цель"), icon: "+", color: "#C4B5FD", bg: "bg-[#C4B5FD]/[0.12]", href: "/savings" },
  ];

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-5 pb-20 text-[#F1F3EE] tabular-nums md:pb-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-bold tracking-[-0.02em]">{t("dashboard.title")}</h1>
            <p className="mt-1 text-sm text-[#8D9388]">
              {t("overview.subtitle", "Ваши финансы в одном месте")} · {todayTxt.toLowerCase()}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 items-center gap-2.5 rounded-xl border border-[#232721] bg-[#151714] px-4 text-[13.5px] font-semibold">
              <Calendar className="h-4 w-4" strokeWidth={1.8} />
              {monthTitle}
            </span>
            <NotificationBell />
          </div>
        </header>

        <DashboardDataSourceStatus />

        {accounts.length === 0 && (
          <DashboardEmptyState
            icon={Wallet}
            title={t("dashboard.empty.accounts_title")}
            description={t("dashboard.empty.accounts_description")}
            href="/accounts"
            action={t("dashboard.empty.accounts_action")}
          />
        )}

        {/* ALERTS */}
        {alerts.length > 0 && (
          <section id="alerts" aria-label={t("overview.attention", "Требует внимания")} className="flex flex-wrap gap-3">
            {alerts.map((al) => (
              <div
                key={al.id}
                className={cn(
                  "flex min-w-[260px] flex-[1_1_300px] items-center gap-3 rounded-[14px] border px-3.5 py-3",
                  al.tone === "red" ? "border-[#F87171]/30 bg-[#F87171]/[0.08]" : al.tone === "green" ? "border-[#6EE7A0]/30 bg-[#6EE7A0]/[0.08]" : "border-[#FBBF24]/30 bg-[#FBBF24]/[0.08]"
                )}
              >
                <span className={cn("flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-[13px] font-bold text-[#10170A]", al.tone === "red" ? "bg-[#F87171]" : al.tone === "green" ? "bg-[#6EE7A0]" : "bg-[#FBBF24]")}>{al.tone === "green" ? "✓" : "!"}</span>
                <Link href={al.href} onClick={() => readNotification(al.id)} className="min-w-0 flex-1 text-[#F1F3EE] no-underline">
                  <span className="block text-[13.5px] font-semibold">{al.title}</span>
                  <span className="block text-[12.5px] text-[#A2A89C]">{al.text}</span>
                </Link>
                <button
                  onClick={() => hideNotification(al.id)}
                  aria-label={t("overview.hide", "Скрыть")}
                  className="h-7 w-7 flex-none rounded-lg p-0 text-[#8D9388] transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE]"
                >
                  ×
                </button>
              </div>
            ))}
          </section>
        )}

        {/* CAPITAL */}
        <section
          aria-label={t("dashboard.net_worth_total")}
          className={cn(cardCls, "flex flex-wrap items-stretch gap-x-10 gap-y-6 bg-[linear-gradient(135deg,#171E10_0%,#151714_60%)]")}
        >
          <div className="flex min-w-[260px] flex-[1_1_280px] flex-col justify-center gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm font-semibold text-[#C9CEC3]">{t("dashboard.net_worth_total")}</span>
              {Math.abs(monthPct) > 0.005 && (
                <span
                  className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[12.5px] font-bold", monthChange >= 0 ? "bg-[#6EE7A0]/[0.14] text-[#6EE7A0]" : "bg-[#F87171]/[0.14] text-[#F87171]")}
                >
                  {monthChange >= 0 ? <TrendingUp className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /> : <TrendingDown className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />}
                  <span>
                    {monthChange >= 0 ? "+" : MINUS}
                    {Math.abs(monthPct).toFixed(1).replace(".", ",")}% {t("overview.per_month", "за месяц")}
                  </span>
                </span>
              )}
            </div>
            <div className="text-[46px] font-bold leading-[1.1] tracking-[-0.03em]">{fmtMoney(breakdown.total, defaultCurrency)}</div>
            <div className="text-[13.5px] text-[#A2A89C]">
              {t("overview.month_change", "За месяц")}:{" "}
              <b style={{ color: monthChange >= 0 ? MINT : RED }}>{signedMoney(monthChange, defaultCurrency)}</b> · {t("overview.on_date", "на")} {format(now, "d MMMM yyyy", { locale: dateLocale })}
            </div>
            <div className="mt-3.5 flex h-2 overflow-hidden rounded-[4px]" role="img" aria-label={t("overview.capital_parts", "Из чего состоит капитал")}>
              {comp.filter((c) => c.v > 0).map((c) => (
                <span key={c.label} className="border-r-2 border-[#151714]" style={{ flex: `${((c.v / (partsTotal || 1)) * 100).toFixed(2)} 1 0%`, background: c.color }} />
              ))}
            </div>
          </div>
          <div className="grid min-w-[280px] flex-[1_1_360px] grid-cols-2 gap-2.5">
            {comp.map((c) => (
              <Link key={c.label} href={c.href} className="block rounded-[14px] border border-[#232721] bg-[#121411] px-3.5 py-3 text-[#F1F3EE] no-underline transition-colors hover:border-[#4A5043] hover:bg-[#1A1D19]">
                <span className="flex items-center gap-2 text-[12.5px] text-[#8D9388]">
                  <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                  {c.label}
                </span>
                <span className="mt-1 block text-[19px] font-bold" style={{ color: c.v < 0 ? RED : "#F1F3EE" }}>
                  {c.v < 0 ? MINUS : ""}{fmtMoney(Math.abs(c.v), defaultCurrency)}
                </span>
                <span className="mt-px block text-xs text-[#8D9388]">{c.sub}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section aria-label={t("dashboard.quick_actions.title")}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
            {quick.map((qa) => {
              const body = (
                <>
                  <span className={cn("flex h-9 w-9 flex-none items-center justify-center rounded-[10px] text-[17px] font-bold", qa.bg)} style={{ color: qa.color }}>{qa.icon}</span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-semibold">{qa.label}</span>
                    <span className="block text-xs text-[#8D9388]">{qa.sub}</span>
                  </span>
                </>
              );
              const cls = "flex items-center gap-3 rounded-[14px] border border-[#232721] bg-[#151714] px-3.5 py-3 text-[#F1F3EE] no-underline transition-colors hover:border-[#4A5043] hover:bg-[#1A1D19]";
              return qa.href ? (
                <Link key={qa.label} href={qa.href} className={cls}>{body}</Link>
              ) : (
                <button key={qa.label} onClick={qa.onClick} className={cls}>{body}</button>
              );
            })}
          </div>
        </section>

        {/* CHART + CATEGORIES */}
        <div className="flex flex-wrap items-stretch gap-5">
          <section className={cn(cardCls, "min-w-0 flex-[2_1_520px]")} aria-label={t("overview.capital_dynamics", "Динамика капитала")}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
              <div>
                <h2 className={h2Cls}>{t("overview.capital_dynamics", "Динамика капитала")}</h2>
                <div className="mt-0.5 text-[12.5px] text-[#8D9388]">
                  {rangeFrom ? `${format(rangeFrom, "dd.MM.yyyy")} - ${format(now, "dd.MM.yyyy")}` : ""} · {t("overview.hover_chart", "наведите на график")}
                </div>
              </div>
              <div role="group" aria-label={t("overview.period", "Период")} className="flex gap-0.5 rounded-xl border border-[#232721] bg-[#0E0F0E] p-1">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPer(p)}
                    aria-pressed={per === p}
                    className={cn("h-[30px] rounded-lg px-3 text-[12.5px] font-semibold transition-colors", per === p ? "bg-[#2A2F27] text-[#F1F3EE]" : "text-[#A2A89C] hover:text-[#F1F3EE]")}
                  >
                    {p === "7D" ? t("overview.p7d", "7Д") : p === "30D" ? t("overview.p30d", "30Д") : p === "3M" ? t("overview.p3m", "3М") : p === "6M" ? t("overview.p6m", "6М") : p === "1Y" ? t("overview.p1y", "1Г") : t("overview.pall", "Все")}
                  </button>
                ))}
              </div>
            </div>
            <CapitalChart key={per} points={points} currency={defaultCurrency} height={260} glow />
            {truncated && (
              <div className="text-[12.5px] text-[#FBBF24]">
                {t("overview.no_history_before", "Истории до")} {format(histStart, "d MMMM", { locale: dateLocale })} {t("overview.no_history_after", "в приложении нет: график показывает всё, что есть.")}
              </div>
            )}
          </section>

          <section className={cn(cardCls, "flex min-w-0 flex-[1_1_320px] flex-col gap-[18px]")} aria-label={t("dashboard.charts.expenses_by_category", "Расходы по категориям")}>
            <div className="flex items-baseline justify-between">
              <h2 className={h2Cls}>{t("overview.expenses_by_cat", "Расходы по категориям")}</h2>
              <Link href="/analytics" className={moreCls}>{t("overview.more", "Подробнее")} →</Link>
            </div>
            {donutCats.length === 0 ? (
              <div className="py-6 text-center text-[13px] text-[#8D9388]">{t("overview.no_expenses", "В этом месяце расходов пока нет")}</div>
            ) : (
              <div className="flex flex-wrap items-center gap-5">
                <div className="relative h-[150px] w-[150px] flex-none rounded-full" style={{ background: donutBg }} role="img" aria-label={t("overview.cat_shares", "Доли категорий расходов")}>
                  <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-[#151714]">
                    <b className="text-base">{kShort(donutTotal)}</b>
                    <span className="text-[12.5px] text-[#8D9388]">{t("overview.for_month", "за")} {monthName}</span>
                  </div>
                </div>
                <div className="flex min-w-[150px] flex-[1_1_150px] flex-col gap-2.5">
                  {donutCats.map((c) => (
                    <div key={c.name} className="flex items-center gap-2.5 text-[13.5px]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: catColor(c.name) }} />
                      <span className="flex-1 truncate">{catEmoji(c.name) ? `${catEmoji(c.name)} ` : ""}{c.name}</span>
                      <b>{((c.v / donutTotal) * 100).toFixed(1).replace(".", ",")}%</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-auto rounded-xl border border-[#232721] bg-[#121411] px-3.5 py-3 text-[13px] text-[#C9CEC3]">
              {t("overview.forecast_end", "Прогноз расходов на конец месяца")}: <b className="text-[#F1F3EE]">{fmtMoney(forecast, defaultCurrency)}</b> {t("overview.at_pace", "при темпе")} {fmtMoney(perDay, defaultCurrency)} {t("overview.per_day_word", "в день")}.
            </div>
          </section>
        </div>

        {/* OPERATIONS + RIGHT COLUMN */}
        <div className="flex flex-wrap items-start gap-5">
          <section className={cn(cardCls, "min-w-0 flex-[2_1_520px]")} aria-label={t("dashboard.recent_transactions", "Последние операции")}>
            <div className="flex items-baseline justify-between">
              <h2 className={h2Cls}>{t("overview.recent_ops", "Последние операции")}</h2>
              <Link href="/transactions" className={moreCls}>{t("overview.view_all", "Смотреть все")} →</Link>
            </div>
            <div className="mt-2 flex flex-col">
              {recent.groups.length === 0 && <div className="py-6 text-center text-[13px] text-[#8D9388]">{t("overview.no_ops", "В этом месяце операций пока нет")}</div>}
              {recent.groups.map((g) => (
                <div key={g.key}>
                  <div className="flex justify-between px-1 pb-1.5 pt-3.5 text-xs font-bold uppercase tracking-[0.05em] text-[#8D9388]">
                    <span>{format(g.date, "d MMMM", { locale: dateLocale })}</span>
                    <span className="font-medium normal-case tracking-normal">{g.net}</span>
                  </div>
                  {g.list.map((tx) => {
                    const inc = tx.type === "income";
                    const exp = tx.type === "expense";
                    const emoji = tx.type === "transfer" ? "⇄" : catEmoji(tx.category) || (inc ? <ArrowDownLeft className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" /> : <ArrowUpRight className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />);
                    const accCur = accounts.find((a) => a.id === tx.accountId)?.currency || tx.currency;
                    const sign = inc ? "+" : exp ? MINUS : "";
                    return (
                      <Link key={tx.id} href="/transactions" className="flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-[#F1F3EE] no-underline transition-colors hover:bg-[#1A1D19]">
                        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl text-lg leading-none" style={{ background: tx.type === "transfer" ? "#1E211C" : withAlpha(catColor(tx.category), 0.14), color: tx.type === "transfer" ? "#7DD3FC" : catColor(tx.category) }}>{emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{tx.description || tx.category}</span>
                          <span className="block text-[12.5px] text-[#8D9388]">{tx.category}</span>
                        </span>
                        <span className="text-right">
                          <span className="block font-bold" style={{ color: inc ? MINT : exp ? RED : "#F1F3EE" }}>{sign}{fmtMoney(tx.amount, accCur)}</span>
                          {accCur !== defaultCurrency && <span className="block text-xs text-[#8D9388]">≈ {sign}{fmtMoney(conv(tx.amount, accCur), defaultCurrency)}</span>}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
            {recent.rest > 0 && (
              <Link href="/transactions" className="mt-2.5 flex h-10 items-center justify-center rounded-xl border border-[#2A2E27] text-[13.5px] font-semibold text-[#C9CEC3] no-underline transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE]">
                {t("overview.more_ops", "Ещё операций за")} {monthName}: {recent.rest}
              </Link>
            )}
          </section>

          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
            <section className={cardCls} aria-label={t("overview.month_result", "Итог месяца")}>
              <div className="flex items-baseline justify-between">
                <h2 className={h2Cls}>{t("overview.result_of", "Итог")} {format(now, "MMMM", { locale: dateLocale })}</h2>
                <Link href="/profile" className={moreCls}>{t("overview.profile", "Профиль")} →</Link>
              </div>
              <div className="mt-2 text-[28px] font-bold" style={{ color: month.net >= 0 ? MINT : RED }}>{signedMoney(month.net, defaultCurrency)}</div>
              <div className="mt-0.5 text-[12.5px] text-[#8D9388]">
                {month.income > 0 ? (month.net >= 0 ? `${t("overview.saved", "Вы отложили")} ${savedPct}% ${t("overview.of_income", "дохода")}` : t("overview.overspent", "Расходы превысили доходы")) : t("overview.no_income", "Доходов в этом месяце пока нет")}
              </div>
              <div className="mt-3.5 flex h-2 overflow-hidden rounded-[4px] bg-[#232721]">
                <span className="bg-[#F87171]" style={{ flex: `${expensePct.toFixed(1)} 1 0%` }} />
                <span className="bg-[#6EE7A0]" style={{ flex: `${(100 - expensePct).toFixed(1)} 1 0%` }} />
              </div>
              <div className="mt-2.5 flex justify-between text-[13px]">
                <span className="text-[#A2A89C]">{t("overview.expenses", "Расходы")} <b className="text-[#F1F3EE]">{fmtMoney(month.expense, defaultCurrency)}</b></span>
                <span className="text-[#A2A89C]">{t("overview.income", "Доходы")} <b className="text-[#F1F3EE]">{fmtMoney(month.income, defaultCurrency)}</b></span>
              </div>
            </section>

            <section className={cardCls} aria-label={t("dashboard.charts.monthly_limits")}>
              <div className="flex items-baseline justify-between">
                <h2 className={h2Cls}>{t("overview.monthly_limits", "Месячные лимиты")}</h2>
                <Link href="/limits" className={moreCls}>{t("overview.all", "Все")} →</Link>
              </div>
              <div className="mt-3.5 flex flex-col gap-4">
                {monthlyLimits.length === 0 && <div className="text-[13px] text-[#8D9388]">{t("dashboard.empty.limits_title")}</div>}
                {monthlyLimits.map((x) => {
                  const color = x.d.status === "over" ? RED : x.d.status === "warn" ? AMBER : "#C6F24E";
                  return (
                    <div key={x.l.id}>
                      <div className="flex justify-between text-[13.5px]">
                        <span className="font-semibold">{x.l.category}</span>
                        <span className="font-bold" style={{ color }}>{Math.round(x.d.pct)}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-[4px] bg-[#232721]">
                        <svg className="block h-2 w-full" aria-hidden="true"><rect width={`${Math.min(100, x.d.pct)}%`} height="8" fill={color} /></svg>
                      </div>
                      <div className="mt-1.5 text-[12.5px]" style={{ color: x.d.status === "over" ? RED : "#8D9388" }}>
                        {x.d.status === "over" ? `${t("limits.exceeded_by", "Превышено на")} ${fmtMoney(x.d.spent - x.l.amount, x.l.currency)}` : `${fmtMoney(x.d.spent, x.l.currency)} ${t("limits.of", "из")} ${fmtMoney(x.l.amount, x.l.currency)}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section id="payments" className={cardCls} aria-label={t("dashboard.mandatory_expenses.title")}>
              <h2 className={h2Cls}>{t("overview.mandatory", "Обязательные платежи")}</h2>
              <div className="mt-3 flex flex-col gap-2">
                {unpaidFirst.length === 0 && <div className="text-[13px] text-[#8D9388]">{t("dashboard.mandatory_expenses.empty")}</div>}
                {unpaidFirst.map((e) => {
                  const paid = isPaidThisMonth(e.lastPaidDate);
                  return (
                    <div key={e.id} className="flex items-center gap-3 rounded-xl border border-[#232721] bg-[#121411] px-3 py-2.5">
                      <button
                        onClick={() => void toggleRecurringExpense(e.id)}
                        aria-pressed={paid}
                        aria-label={t("overview.mark_paid", "Отметить оплаченным")}
                        className={cn("h-6 w-6 flex-none rounded-full border-2 p-0 text-[13px] font-bold text-[#10170A]", paid ? "border-[#6EE7A0] bg-[#6EE7A0]" : "border-[#C6F24E] bg-transparent")}
                      >
                        {paid ? "✓" : ""}
                      </button>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block font-semibold", paid && "line-through")}>{e.name}</span>
                        <span className="block text-[12.5px] text-[#8D9388]">{paid ? `${t("overview.paid_in", "Оплачено в")} ${monthName}` : `${t("overview.until_day", "до")} ${e.dueDay} ${t("overview.day_suffix", "числа")} · ${t("overview.required", "обязательный")}`}</span>
                      </span>
                      <b>{fmtMoney(e.amount, e.currency)}</b>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={cardCls} aria-label={t("dashboard.goals_title")}>
              <div className="flex items-baseline justify-between">
                <h2 className={h2Cls}>{t("overview.goals", "Цели")}</h2>
                <Link href="/savings" className={moreCls}>{t("overview.all", "Все")} →</Link>
              </div>
              <div className="mt-3.5 flex flex-col gap-4">
                {goals.length === 0 && <div className="text-[13px] text-[#8D9388]">{t("dashboard.empty.goals_title")}</div>}
                {goals.slice(0, 3).map((g, i) => {
                  const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
                  const color = goalColor(i);
                  return (
                    <div key={g.id}>
                      <div className="flex justify-between text-[13.5px]">
                        <span className="font-semibold">{g.name}</span>
                        <span className="text-[#A2A89C]">{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-[4px] bg-[#232721]">
                        <svg className="block h-2 w-full" aria-hidden="true"><rect width={`${pct}%`} height="8" fill={color} /></svg>
                      </div>
                      <div className="mt-1.5 flex justify-between text-[12.5px] text-[#8D9388]">
                        <span>{fmtMoney(g.currentAmount, g.currency)} {t("limits.of", "из")} {fmtMoney(g.targetAmount, g.currency)}</span>
                        <Link href="/savings" className="font-semibold text-[#C6F24E] no-underline hover:text-[#E2FF92]">+ {t("savings.top_up", "Пополнить")}</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        <AddTransactionDialog
          key={activeType ?? "none"}
          open={activeType !== null}
          onOpenChange={(open) => !open && setActiveType(null)}
          defaultType={activeType ?? "expense"}
          trigger={null}
        />
      </div>
    </ProtectedRoute>
  );
}
