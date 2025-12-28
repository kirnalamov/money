"use client";

import { CreditCard, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { formatCurrency, convertCurrency } from "@/lib/utils";

export function KpiCardsGrid() {
  const { accounts, defaultCurrency } = useStore();
  const { t } = useTranslation();

  // Calculate totals from store with currency conversion
  const totalCash = accounts
    .filter(a => a.type === 'bank' || a.type === 'cash')
    .reduce((sum, acc) => {
      const convertedBalance = convertCurrency(acc.balance, acc.currency, defaultCurrency);
      return sum + convertedBalance;
    }, 0);
    
  const totalSavings = accounts
    .filter(a => a.type === 'savings')
    .reduce((sum, acc) => {
      const convertedBalance = convertCurrency(acc.balance, acc.currency, defaultCurrency);
      return sum + convertedBalance;
    }, 0);

  const kpis = [
    {
      title: t("dashboard.kpi.cash_balance"),
      value: formatCurrency(totalCash, defaultCurrency),
      change: t("dashboard.kpi.updated_now"),
      icon: Wallet,
    },
    {
      title: t("dashboard.kpi.invested_value"),
      value: formatCurrency(85300, defaultCurrency), // Placeholder for now
      change: `+5.2% ${t("dashboard.kpi.all_time")}`,
      icon: TrendingUp,
    },
    {
      title: t("dashboard.kpi.planned_savings"),
      value: formatCurrency(totalSavings, defaultCurrency),
      change: `${t("dashboard.kpi.target")}: ${formatCurrency(20000, defaultCurrency)}`,
      icon: PiggyBank,
    },
    {
      title: t("dashboard.kpi.available_spend"),
      value: formatCurrency(2100, defaultCurrency), // Placeholder
      change: `65% ${t("dashboard.kpi.budget_left")}`,
      icon: CreditCard,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.title} className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{kpi.title}</h3>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="pt-2">
            <div className="text-2xl font-bold">{kpi.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{kpi.change}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
