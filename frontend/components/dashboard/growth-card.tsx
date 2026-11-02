"use client";

import Link from "next/link";
import { subDays } from "date-fns";
import { ArrowRight, ChartNoAxesCombined, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { convertCurrency, formatCurrencyCompact } from "@/lib/utils";

export function GrowthCard() {
  const { t } = useTranslation();
  const { accounts, transactions, defaultCurrency } = useStore();
  const total = accounts.reduce((sum, account) => sum + convertCurrency(account.balance, account.currency, defaultCurrency), 0);
  const cutoff = subDays(new Date(), 30).getTime();
  const previousTotal = transactions.reduce((sum, transaction) => {
    if (new Date(transaction.date).getTime() <= cutoff) return sum;
    const amount = convertCurrency(transaction.amount, transaction.currency, defaultCurrency);
    if (transaction.type === "expense") return sum + amount;
    if (transaction.type === "income") return sum - amount;
    return sum;
  }, total);
  const change = total - previousTotal;
  const percent = previousTotal ? (change / previousTotal) * 100 : 0;

  return (
    <div className="relative min-h-[170px] overflow-hidden rounded-[20px] border bg-[linear-gradient(125deg,rgba(30,39,26,0.86),rgba(17,19,17,0.98))] p-6">
      <ChartNoAxesCombined className="absolute right-6 top-6 h-7 w-7 text-primary/80" aria-hidden="true" />
      <TrendingUp className="absolute -bottom-8 -right-1 h-40 w-40 rotate-[-18deg] text-primary/15" strokeWidth={5} aria-hidden="true" />
      <div className="relative z-10 flex h-full flex-col items-start">
        <h3 className="text-lg font-semibold">{t("dashboard.growth.title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.growth.description", { percent: Math.abs(percent).toFixed(2) })}</p>
        <Link href="/analytics" className="mt-auto inline-flex h-9 items-center rounded-full border border-border bg-background/30 px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t("dashboard.growth.action")} <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
      <span className="sr-only">{formatCurrencyCompact(change, defaultCurrency)}</span>
    </div>
  );
}
