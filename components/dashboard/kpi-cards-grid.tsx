"use client";

import { CreditCard, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";

export function KpiCardsGrid() {
  const { accounts } = useStore();
  const { t } = useTranslation();

  // Calculate totals from store
  const totalCash = accounts
    .filter(a => a.type === 'bank' || a.type === 'cash')
    .reduce((sum, acc) => sum + acc.balance, 0);
    
  const totalSavings = accounts
    .filter(a => a.type === 'savings')
    .reduce((sum, acc) => sum + acc.balance, 0);

  const kpis = [
    {
      title: t("dashboard.kpi.cash_balance"),
      value: `$${totalCash.toLocaleString()}`,
      change: t("dashboard.kpi.updated_now"),
      icon: Wallet,
    },
    {
      title: t("dashboard.kpi.invested_value"),
      value: "$85,300.00", // Placeholder for now
      change: `+5.2% ${t("dashboard.kpi.all_time")}`,
      icon: TrendingUp,
    },
    {
      title: t("dashboard.kpi.planned_savings"), // Corrected from Total Savings based on earlier context, but let's stick to 'Planned Savings' or 'Total Savings' logic. Earlier code used Total Savings. 
      // Wait, earlier code had "Planned Savings" in first version but "Total Savings" in second version.
      // Translation key is "planned_savings". Let's align with the translation key intent or update key. 
      // The key is "planned_savings".
      value: `$${totalSavings.toLocaleString()}`,
      change: `${t("dashboard.kpi.target")}: $20,000`,
      icon: PiggyBank,
    },
    {
      title: t("dashboard.kpi.available_spend"),
      value: "$2,100.00", // Placeholder
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
