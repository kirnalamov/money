"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { formatCurrencyCompact, convertCurrency } from "@/lib/utils";
import { ChevronRight, Circle, TrendingUp } from "lucide-react";
import { subDays } from "date-fns";

export function NetWorthHeader() {
  const { accounts, transactions, defaultCurrency } = useStore();
  const { t } = useTranslation();

  // Конвертируем все балансы в валюту по умолчанию
  const totalNetWorth = accounts.reduce((sum, acc) => {
    const convertedBalance = convertCurrency(acc.balance, acc.currency, defaultCurrency);
    return sum + convertedBalance;
  }, 0);
  const free = accounts.filter((acc) => acc.type === "bank" || acc.type === "cash").reduce((sum, acc) => sum + convertCurrency(acc.balance, acc.currency, defaultCurrency), 0);
  const savings = accounts.filter((acc) => acc.type === "savings").reduce((sum, acc) => sum + convertCurrency(acc.balance, acc.currency, defaultCurrency), 0);
  const investments = Math.max(0, totalNetWorth - free - savings);
  const breakdown = [
    { label: "Свободно", value: free, color: "#C0F05C" },
    { label: "Инвестиции", value: investments, color: "#55BCEB" },
    { label: "Накопления", value: savings, color: "#A987E8" },
  ];
  const chartValues = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const date = subDays(new Date(), 11 - index);
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

    return accounts.reduce((total, account) => {
      if (account.created_at && new Date(account.created_at).getTime() > endOfDay.getTime()) return total;
      return total + convertCurrency(balances[account.id] || 0, account.currency, defaultCurrency);
    }, 0);
  }), [accounts, transactions, defaultCurrency]);
  const chartMin = Math.min(...chartValues, totalNetWorth);
  const chartMax = Math.max(...chartValues, totalNetWorth);
  const chartRange = chartMax - chartMin || 1;
  const chartPath = chartValues.map((value, index) => `${(index / (chartValues.length - 1)) * 480} ${108 - ((value - chartMin) / chartRange) * 94}`).join(" L");
  const chartAreaPath = `${chartPath} L480 120 L0 120 Z`;
  const change = chartValues.at(-1)! - chartValues[0];
  const changePercent = chartValues[0] ? (change / chartValues[0]) * 100 : 0;

  return (
    <div className="relative grid min-h-[170px] overflow-hidden rounded-[22px] border bg-[linear-gradient(110deg,rgba(192,240,92,0.11),rgba(17,19,17,0.96)_48%,rgba(17,19,17,0.98))] p-7 text-card-foreground lg:grid-cols-[30%_47%_23%]">
      <div className="relative z-10">
        <div className="flex items-center gap-2"><h3 className="font-semibold">{t("dashboard.net_worth_total")}</h3>{changePercent !== 0 && <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary"><TrendingUp className="h-3 w-3" />{changePercent > 0 ? "+" : ""}{changePercent.toFixed(2)}%</span>}</div>
        <div className="mt-1 text-4xl font-bold tracking-tight tabular-nums md:text-[48px]">{formatCurrencyCompact(totalNetWorth, defaultCurrency)}</div>
        <p className="mt-1 text-sm text-muted-foreground">Изменение за месяц: <span className={change >= 0 ? "text-primary" : "text-destructive"}>{change >= 0 ? "+" : ""}{formatCurrencyCompact(change, defaultCurrency)}</span></p>
      </div>
      <div className="relative hidden min-h-[112px] lg:block">
        <svg viewBox="0 0 480 120" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="capital-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C0F05C" stopOpacity=".3" /><stop offset="1" stopColor="#C0F05C" stopOpacity="0" /></linearGradient></defs>
          <path d={`M${chartAreaPath}`} fill="url(#capital-fill)" />
          <path d={`M${chartPath}`} fill="none" stroke="#C0F05C" strokeWidth="2.5" />
        </svg>
      </div>
      <div className="mt-5 divide-y divide-border border-l border-border pl-6 lg:mt-0">
        {breakdown.map((item) => <div key={item.label} className="flex h-10 items-center gap-2 text-sm"><Circle className="h-3 w-3 fill-current" style={{ color: item.color }} /><span className="flex-1 text-muted-foreground">{item.label}</span><strong className="tabular-nums">{formatCurrencyCompact(item.value, defaultCurrency)}</strong><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>)}
      </div>
    </div>
  );
}
