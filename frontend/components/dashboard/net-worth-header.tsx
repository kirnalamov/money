"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { formatMoneyCompact, formatPercent, convertCurrency } from "@/lib/utils";
import { getFinancialHealth } from "@/lib/financial-health";
import { ChevronRight, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { format, subDays } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

type MiniPoint = {
  date: string;
  value: number;
  event?: string;
};

function MiniChartTooltip({
  active,
  payload,
  currency,
  language,
}: {
  active?: boolean;
  payload?: Array<{ payload: MiniPoint }>;
  currency: string;
  language: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">{point.date}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-foreground">{formatMoneyCompact(point.value, currency, language)}</p>
      {point.event && <p className="mt-1 max-w-40 truncate text-muted-foreground">{point.event}</p>}
    </div>
  );
}

export function NetWorthHeader() {
  const { accounts, transactions, defaultCurrency } = useStore();
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  // Конвертируем все балансы в валюту по умолчанию
  const totalNetWorth = accounts.reduce((sum, acc) => {
    const convertedBalance = convertCurrency(acc.balance, acc.currency, defaultCurrency);
    return sum + convertedBalance;
  }, 0);
  const free = accounts.filter((acc) => acc.type === "bank" || acc.type === "cash").reduce((sum, acc) => sum + convertCurrency(acc.balance, acc.currency, defaultCurrency), 0);
  const cash = accounts.filter((acc) => acc.type === "cash").reduce((sum, acc) => sum + convertCurrency(acc.balance, acc.currency, defaultCurrency), 0);
  const available = free - cash;
  const savings = accounts.filter((acc) => acc.type === "savings").reduce((sum, acc) => sum + convertCurrency(acc.balance, acc.currency, defaultCurrency), 0);
  const investments = Math.max(0, totalNetWorth - free - savings);
  const chartData = useMemo<MiniPoint[]>(() => Array.from({ length: 31 }, (_, index) => {
    const date = subDays(new Date(), 30 - index);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const balances = Object.fromEntries(accounts.map((account) => [account.id, account.balance]));

    [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach((transaction) => {
        if (new Date(transaction.date).getTime() <= endOfDay.getTime()) return;
        if (transaction.type === "expense") balances[transaction.accountId] = (balances[transaction.accountId] || 0) + transaction.amount;
        if (transaction.type === "income") balances[transaction.accountId] = (balances[transaction.accountId] || 0) - transaction.amount;
        if (transaction.type === "transfer") {
          balances[transaction.accountId] = (balances[transaction.accountId] || 0) + transaction.amount;
          if (transaction.toAccountId) balances[transaction.toAccountId] = (balances[transaction.toAccountId] || 0) - transaction.amount;
        }
      });

    const value = accounts.reduce((total, account) => {
      if (account.created_at && new Date(account.created_at).getTime() > endOfDay.getTime()) return total;
      return total + convertCurrency(balances[account.id] || 0, account.currency, defaultCurrency);
    }, 0);

    const events = transactions
      .filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getTime() > new Date(date).setHours(0, 0, 0, 0) && transactionDate.getTime() <= endOfDay.getTime();
      })
      .map((transaction) => transaction.description || transaction.category)
      .filter(Boolean)
      .slice(0, 1)
      .join(", ");

    return { date: format(date, "d MMM", { locale: language === "ru" ? ru : enUS }), value, event: events || undefined };
  }), [accounts, transactions, defaultCurrency, language]);
  const change = totalNetWorth - (chartData[0]?.value || totalNetWorth);
  const changePercent = chartData[0]?.value ? (change / chartData[0].value) * 100 : 0;
  const isPositive = change >= 0;
  const hasChange = Math.abs(changePercent) > 0.005;
  const financialHealth = getFinancialHealth(transactions, defaultCurrency, subDays(new Date(), 30), new Date());
  const capitalChartColor = financialHealth === "negative" ? "hsl(var(--expense))" : financialHealth === "positive" ? "hsl(var(--income))" : "hsl(var(--chart-4))";
  const chartBounds = useMemo(() => {
    const values = chartData.map((point) => point.value);
    const min = Math.min(...values, totalNetWorth);
    const max = Math.max(...values, totalNetWorth);
    const range = max - min;
    const padding = range > 0 ? range * 0.25 : Math.max(Math.abs(max) * 0.02, 1);
    return [min - padding, max + padding * 0.5] as [number, number];
  }, [chartData, totalNetWorth]);
  const breakdown = [
    { label: t("dashboard.net_worth_breakdown.available"), value: available, color: "bg-chart-1", href: "/accounts" },
    { label: t("accounts.types.cash"), value: cash, color: "bg-chart-4", href: "/accounts" },
    { label: t("dashboard.net_worth_breakdown.investments"), value: investments, color: "bg-chart-2", href: "/portfolio" },
    { label: t("dashboard.net_worth_breakdown.savings"), value: savings, color: "bg-chart-3", href: "/savings" },
  ];
  // Маске важна только альфа, цвет не влияет
  const mask = "linear-gradient(90deg, transparent 0px, transparent 160px, hsl(0 0% 0% / .35) 240px, hsl(0 0% 0% / .75) 330px, black 420px, black 100%)";

  return (
    <div className="relative grid gap-x-6 overflow-hidden rounded-2xl border bg-card p-4 text-card-foreground [isolation:isolate] md:grid-cols-[minmax(0,1fr)_264px] lg:p-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      {/* График-фон */}
      <div
        role="img"
        aria-label={t("dashboard.charts.net_worth_mini_aria")}
        className="absolute bottom-[12%] left-0 right-0 top-[12%] z-0 min-h-[96px] min-w-0 md:right-[calc(264px+1rem+12px)] lg:right-[calc(264px+1.25rem+12px)] xl:right-[calc(330px+1.25rem+12px)]"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={96} initialDimension={{ width: 320, height: 96 }}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="capital-mini-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={capitalChartColor} stopOpacity="0.22" />
                <stop offset="45%" stopColor={capitalChartColor} stopOpacity="0.05" />
                <stop offset="100%" stopColor={capitalChartColor} stopOpacity="0" />
              </linearGradient>
              <filter id="capital-mini-glow" x="-5%" y="-30%" width="110%" height="160%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <YAxis hide domain={chartBounds} />
            <Tooltip content={<MiniChartTooltip currency={defaultCurrency} language={language} />} cursor={{ stroke: capitalChartColor, strokeOpacity: 0.35, strokeDasharray: "3 3" }} />
            <Area
              type="monotone"
              dataKey="value"
              baseValue={chartBounds[0]}
              stroke="none"
              fill="url(#capital-mini-fill)"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="value"
              baseValue={chartBounds[0]}
              stroke={capitalChartColor}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              filter="url(#capital-mini-glow)"
              dot={({ cx, cy, index }) => index === chartData.length - 1
                ? <circle key="end" cx={cx} cy={cy} r={4.5} fill="hsl(var(--foreground))" stroke={capitalChartColor} strokeWidth={2} />
                : <g key={index} />}
              activeDot={{ r: 4, fill: capitalChartColor, stroke: "hsl(var(--card))", strokeWidth: 2 }}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Текст */}
      <div className="relative z-10 flex min-w-0 -translate-y-2 flex-col justify-center">
        <div className="flex flex-col items-start gap-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold leading-5 text-foreground">{t("dashboard.net_worth_total")}</h3>
            {hasChange && <span className={isPositive ? "inline-flex items-center gap-1 rounded-full bg-income/10 px-2.5 py-1 text-xs font-semibold text-income" : "inline-flex items-center gap-1 rounded-full bg-expense/10 px-2.5 py-1 text-xs font-semibold text-expense"}>
              {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />}
              {formatPercent(changePercent, language, true, 2)}
            </span>}
          </div>
          <div className="text-[40px] font-bold leading-none tracking-tight tabular-nums text-foreground">{formatMoneyCompact(totalNetWorth, defaultCurrency, language)}</div>
          <p className="text-sm leading-5 text-muted-foreground">{t("dashboard.net_worth_breakdown.month_change")} <span className={isPositive ? "font-medium tabular-nums text-income" : "font-medium tabular-nums text-expense"}>{formatMoneyCompact(change, defaultCurrency, language, true)}</span></p>
        </div>
      </div>
      {/* Правая панель */}
      <div className="relative z-10 mt-4 flex -translate-y-1 flex-col justify-center self-stretch border-l pl-5 max-md:border-l-0 max-md:border-t max-md:pl-0 max-md:pt-3 lg:mt-0">
        {breakdown.map((item) => <Link key={item.href + item.label} href={item.href} className="group grid min-h-11 grid-cols-[12px_minmax(0,1fr)_auto_16px] items-center gap-2 rounded-lg px-2 text-sm transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className={`h-3 w-3 shrink-0 rounded-full ${item.color}`} aria-hidden="true" />
          <span className="truncate font-medium text-muted-foreground transition-colors group-hover:text-foreground">{item.label}</span>
          <strong className="text-sm font-semibold tabular-nums text-foreground">{formatMoneyCompact(item.value, defaultCurrency, language)}</strong>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
        </Link>)}
      </div>
    </div>
  );
}
