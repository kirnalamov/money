"use client";

import { CreditCard, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { formatCurrency, convertCurrency } from "@/lib/utils";

import Link from "next/link";

export function KpiCardsGrid() {
  const { accounts, positions, defaultCurrency } = useStore();
  const { t } = useTranslation();

  // Calculate totals from store with currency conversion
  const totalCash = accounts
    .filter(a => a.type === 'bank' || a.type === 'cash')
    .reduce((sum, acc) => {
      const convertedBalance = convertCurrency(acc.balance, acc.currency, defaultCurrency);
      return sum + convertedBalance;
    }, 0);

  const totalInvested = positions.reduce((sum, pos) => {
    const val = pos.currentPrice * pos.quantity;
    return sum + convertCurrency(val, pos.currency, defaultCurrency);
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
      href: "/accounts",
    },
    {
      title: t("dashboard.kpi.invested_value"),
      value: formatCurrency(totalInvested, defaultCurrency),
      change: `+4.2% ${t("dashboard.kpi.all_time")}`,
      icon: TrendingUp,
      href: "/portfolio",
    },
    {
      title: t("dashboard.kpi.planned_savings"),
      value: formatCurrency(totalSavings, defaultCurrency),
      change: `${t("dashboard.kpi.target")}: ${formatCurrency(20000, defaultCurrency)}`,
      icon: PiggyBank,
      href: "/savings",
    },
    {
      title: t("dashboard.kpi.available_spend"),
      value: formatCurrency(Math.max(0, totalCash - 2000), defaultCurrency),
      change: `~${t("dashboard.kpi.budget_left")}`,
      icon: CreditCard,
      href: "/analytics",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Link
          key={kpi.title}
          href={kpi.href}
          className="block"
        >
          <div
            className="rounded-xl border glass-card premium-gradient p-6 group cursor-pointer hover:-translate-y-1 h-full"
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{kpi.title}</h3>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <kpi.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="pt-2">
              <div className="text-2xl md:text-3xl font-bold group-hover:text-glow transition-all duration-300">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.change}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
