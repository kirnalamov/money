"use client";

import { ArrowUpRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { formatCurrencyCompact, convertCurrency } from "@/lib/utils";

export function NetWorthHeader() {
  const { accounts, defaultCurrency } = useStore();
  const { t } = useTranslation();
  
  // Конвертируем все балансы в валюту по умолчанию
  const totalNetWorth = accounts.reduce((sum, acc) => {
    const convertedBalance = convertCurrency(acc.balance, acc.currency, defaultCurrency);
    return sum + convertedBalance;
  }, 0);

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
      <div className="flex flex-col space-y-1.5">
        <h3 className="font-semibold leading-none tracking-tight text-muted-foreground">
          {t("dashboard.net_worth_total")}
        </h3>
      </div>
      <div className="mt-4 flex items-baseline space-x-3">
        <span className="text-4xl font-bold text-foreground">{formatCurrencyCompact(totalNetWorth, defaultCurrency)}</span>
        <div className="flex items-center text-sm text-plutus-green font-medium">
          <ArrowUpRight className="mr-1 h-4 w-4" />
          +2.5%
          <span className="ml-1 text-muted-foreground text-xs font-normal">
            {t("dashboard.vs_last_month")}
          </span>
        </div>
      </div>
    </div>
  );
}
