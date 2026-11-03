"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { formatCurrencyCompact, convertCurrency } from "@/lib/utils";
import { getFinancialHealth, getFinancialHealthColor } from "@/lib/financial-health";
import { ChevronRight, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { format, subDays } from "date-fns";
import { ru } from "date-fns/locale";
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
}: {
  active?: boolean;
  payload?: Array<{ payload: MiniPoint }>;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-[10px] border border-[#303830] bg-[#191D1A] px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground">{point.date}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-foreground">{formatCurrencyCompact(point.value, currency)}</p>
      {point.event && <p className="mt-1 max-w-40 truncate text-muted-foreground">{point.event}</p>}
    </div>
  );
}

export function NetWorthHeader() {
  const { accounts, transactions, defaultCurrency } = useStore();
  const { t } = useTranslation();

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

    return { date: format(date, "d MMM", { locale: ru }), value, event: events || undefined };
  }), [accounts, transactions, defaultCurrency]);
  const change = totalNetWorth - (chartData[0]?.value || totalNetWorth);
  const changePercent = chartData[0]?.value ? (change / chartData[0].value) * 100 : 0;
  const isPositive = change >= 0;
  const hasChange = Math.abs(changePercent) > 0.005;
  const financialHealth = getFinancialHealth(transactions, defaultCurrency, subDays(new Date(), 30), new Date());
  const capitalChartColor = getFinancialHealthColor(financialHealth);
  const capitalCardBackground = financialHealth === "negative"
    ? "linear-gradient(115deg,#261619 0%,#111311 65%,#101210 100%)"
    : financialHealth === "positive"
      ? "linear-gradient(115deg,#171D11 0%,#111311 65%,#101210 100%)"
      : "linear-gradient(115deg,#242012 0%,#111311 65%,#101210 100%)";
  const chartBounds = useMemo(() => {
    const values = chartData.map((point) => point.value);
    const min = Math.min(...values, totalNetWorth);
    const max = Math.max(...values, totalNetWorth);
    const range = max - min;
    const padding = range > 0 ? range * 0.25 : Math.max(Math.abs(max) * 0.02, 1);
    return [min - padding, max + padding * 0.5] as [number, number];
  }, [chartData, totalNetWorth]);
  const breakdown = [
    { label: "Свободно", value: available, color: "#C0F05C", href: "/accounts" },
    { label: t("accounts.types.cash"), value: cash, color: "#F2C45E", href: "/accounts" },
    { label: "Инвестиции", value: investments, color: "#55BCEB", href: "/portfolio" },
    { label: "Накопления", value: savings, color: "#A987E8", href: "/savings" },
  ];
  const mask = "linear-gradient(90deg, transparent 0px, transparent 160px, rgba(0,0,0,.35) 240px, rgba(0,0,0,.75) 330px, black 420px, black 100%)";

  return (
    <div className="relative grid gap-x-6 overflow-hidden rounded-[20px] border border-[#282E28] p-4 text-card-foreground [isolation:isolate] md:grid-cols-[minmax(0,1fr)_264px] lg:p-5 xl:grid-cols-[minmax(0,1fr)_330px]" style={{ background: capitalCardBackground }}>
      {/* График-фон */}
      <div
        className="absolute bottom-[12%] left-0 right-0 top-[12%] z-0 md:right-[calc(264px+1rem+12px)] lg:right-[calc(264px+1.25rem+12px)] xl:right-[calc(330px+1.25rem+12px)]"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <ResponsiveContainer width="100%" height="100%">
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
            <Tooltip content={<MiniChartTooltip currency={defaultCurrency} />} cursor={{ stroke: capitalChartColor, strokeOpacity: 0.35, strokeDasharray: "3 3" }} />
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
                ? <circle key="end" cx={cx} cy={cy} r={4.5} fill="#F5F7F4" stroke={capitalChartColor} strokeWidth={2} />
                : <g key={index} />}
              activeDot={{ r: 4, fill: capitalChartColor, stroke: "#111311", strokeWidth: 2 }}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Текст */}
      <div className="relative z-10 flex min-w-0 -translate-y-2 flex-col justify-center">
        <div className="flex flex-col items-start gap-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold leading-5 text-[#F5F7F4]">{t("dashboard.net_worth_total")}</h3>
            {hasChange && <span className={isPositive ? "inline-flex items-center gap-1 rounded-full bg-[rgba(192,240,92,0.12)] px-2.5 py-1 text-xs font-semibold text-[#C0F05C]" : "inline-flex items-center gap-1 rounded-full bg-[rgba(242,118,131,0.12)] px-2.5 py-1 text-xs font-semibold text-[#F27683]"}>
              {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
            </span>}
          </div>
          <div className="text-[40px] font-bold leading-none tracking-[-1.4px] tabular-nums text-[#F5F7F4] md:text-[44px]">{formatCurrencyCompact(totalNetWorth, defaultCurrency)}</div>
          <p className="text-[13px] leading-5 text-[#A0A7A2]">Изменение за месяц: <span className={isPositive ? "font-medium text-[#C0F05C]" : "font-medium text-[#F27683]"}>{isPositive ? "+" : ""}{formatCurrencyCompact(change, defaultCurrency)}</span></p>
        </div>
      </div>
      {/* Правая панель */}
      <div className="relative z-10 mt-4 flex -translate-y-1 flex-col justify-center self-stretch border-l border-[rgba(150,160,150,0.2)] pl-5 max-md:border-l-0 max-md:border-t max-md:border-t-[#292F2B] max-md:pt-3 lg:mt-0">
        {breakdown.map((item) => <Link key={item.label} href={item.href} className="group grid h-[32px] grid-cols-[11px_minmax(0,1fr)_auto_16px] items-center gap-2 rounded-lg px-2 text-[18px] transition-colors duration-150 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="h-[11px] w-[11px] shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="truncate font-semibold  text-[#A0A7A2] transition-colors group-hover:text-[#F5F7F4]">{item.label}</span>
          <strong className="font-[Inter,ui-sans-serif,system-ui,sans-serif] text-[16px] font-[650] tabular-nums text-[#F5F7F4]">{formatCurrencyCompact(item.value, defaultCurrency)}</strong>
          <ChevronRight className="h-4 w-4 text-[#89928B] transition-colors group-hover:text-[#C0F05C]" />
        </Link>)}
      </div>
    </div>
  );
}
