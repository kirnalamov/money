"use client";

import { CreditCard, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { formatCurrency, convertCurrency } from "@/lib/utils";

import Link from "next/link";
import { cn } from "@/lib/utils";

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
      change: t("dashboard.kpi.all_time"),
      icon: TrendingUp,
      href: "/portfolio",
    },
    {
      title: t("dashboard.kpi.planned_savings"),
      value: formatCurrency(totalSavings, defaultCurrency),
      change: t("dashboard.kpi.total_savings"),
      icon: PiggyBank,
      href: "/savings",
    },
    {
      title: t("dashboard.kpi.available_spend"),
      value: formatCurrency(totalCash, defaultCurrency),
      change: t("dashboard.kpi.total_available"),
      icon: CreditCard,
      href: "/analytics",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => (
        <Link
          key={kpi.title}
          href={kpi.href}
          className="block rounded-[1.5rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div
            className={cn("rounded-[1.5rem] border bg-card p-5 group h-full transition-colors hover:bg-accent", index === 0 && "border-transparent bg-gradient-to-br from-[#d9fa46] to-[#8edc55] text-[#11180a] hover:from-[#e4ff70] hover:to-[#a1e66c]")}
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className={cn("tracking-tight text-sm font-medium text-muted-foreground", index === 0 && "text-[#263718]")}>{kpi.title}</h3>
              <div className={cn("h-10 w-10 rounded-2xl bg-muted flex items-center justify-center", index === 0 && "bg-black/10")}>
                <kpi.icon aria-hidden="true" className={cn("h-5 w-5 text-foreground", index === 0 && "text-[#11180a]")} />
              </div>
            </div>
            <div className="pt-2">
              <div className="text-2xl md:text-3xl font-bold tracking-tight break-words">{kpi.value}</div>
              <p className={cn("text-xs text-muted-foreground mt-1", index === 0 && "text-[#263718]")}>{kpi.change}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
