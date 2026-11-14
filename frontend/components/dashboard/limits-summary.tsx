"use client";

import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { formatMoney, formatPercent, convertCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { calculateLimitSpent } from "@/lib/limit-utils";

export function LimitsSummary() {
  const { t, i18n } = useTranslation();
  const { limits, transactions, defaultCurrency } = useStore();

  return (
    <div className="rounded-[1.5rem] border bg-card p-5 text-card-foreground">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold leading-snug">{t("dashboard.charts.monthly_limits")}</h3>
      </div>
      {limits.filter(limit => limit.period === 'monthly').length === 0 ? (
        <div className="py-2 text-sm text-muted-foreground">
          <p>{t("dashboard.empty.limits_title")}</p>
          <Button variant="link" size="sm" asChild className="mt-1 min-h-[44px] px-0">
            <Link href="/limits">{t("dashboard.empty.limits_action")}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3 overflow-hidden">
          {limits.filter(limit => limit.period === 'monthly').map((limit) => {
          const spentInLimitCurrency = calculateLimitSpent(limit, transactions);
          const calculatedSpent = convertCurrency(spentInLimitCurrency, limit.currency, defaultCurrency);

          const convertedLimit = convertCurrency(limit.amount, limit.currency, defaultCurrency);
          // Реальный процент (может быть >100), полоса ограничена 100% визуально
          const percentage = convertedLimit > 0 ? (calculatedSpent / convertedLimit) * 100 : 0;
          const over = percentage > 100;
          const warn = percentage >= 80 && !over;
          const barColor = over ? "bg-expense" : warn ? "bg-warning" : "bg-primary";
          const textColor = over ? "text-expense" : warn ? "text-warning" : "text-muted-foreground";
          const key = limit.category.toLowerCase();
          const name = /^[\p{L}_ ]+$/u.test(key) ? t(`dashboard.categories.${key}`, { defaultValue: limit.category }) : limit.category;
          const money = (value: number) => formatMoney(value, defaultCurrency, i18n.language);
          const caption = over
            ? t("dashboard.limit_status.exceeded", { amount: money(calculatedSpent - convertedLimit) })
            : warn
              ? t("dashboard.limit_status.remaining", { amount: money(convertedLimit - calculatedSpent) })
              : t("dashboard.limit_status.of", { spent: money(calculatedSpent), limit: money(convertedLimit) });

           return (
             <div key={limit.id} className="space-y-1">
               <div className="flex justify-between gap-2 text-sm">
                 <span className="truncate font-medium" title={name}>{name}</span>
                 <span className={`shrink-0 font-medium tabular-nums ${textColor}`}>{formatPercent(percentage, i18n.language, false, 0)}</span>
               </div>
               <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                 <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, percentage)}%` }} />
               </div>
               <p className={`text-sm tabular-nums ${textColor}`}>{caption}</p>
             </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
