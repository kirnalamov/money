"use client";

import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { formatCurrency, convertCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { calculateLimitSpent } from "@/lib/limit-utils";

// Categories are now fetched from store with their colors

export function LimitsSummary() {
  const { t } = useTranslation();
  const { limits, transactions, defaultCurrency, categories } = useStore();

  return (
    <div className="rounded-[1.5rem] border bg-card p-5 text-card-foreground">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold leading-snug">{t("dashboard.charts.monthly_limits")}</h3>
      </div>
      {limits.filter(limit => limit.period === 'monthly').length === 0 ? (
        <div className="py-2 text-sm text-muted-foreground">
          <p>{t("dashboard.empty.limits_title")}</p>
          <Button variant="link" size="sm" asChild className="mt-1 h-auto px-0">
            <Link href="/limits">{t("dashboard.empty.limits_action")}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3 overflow-hidden">
          {limits.filter(limit => limit.period === 'monthly').map((limit) => {
          const spentInLimitCurrency = calculateLimitSpent(limit, transactions);
          const calculatedSpent = convertCurrency(spentInLimitCurrency, limit.currency, defaultCurrency);

          const convertedLimit = convertCurrency(limit.amount, limit.currency, defaultCurrency);
          const percentage = convertedLimit > 0 ? Math.min(100, (calculatedSpent / convertedLimit) * 100) : 0;
          
          // Try to find category in store for color
          const storeCategory = categories.find(c => c.name === limit.category);
          const categoryColor = storeCategory?.color || "#10b981"; // Fallback to green

           return (
             <div key={limit.id} className="space-y-1">
               <div className="flex justify-between text-sm">
                 <span className="truncate font-medium" title={limit.category}>{t(limit.category, { defaultValue: limit.category })}</span>
                 <span className="text-muted-foreground">{Math.round(percentage)}%</span>
               </div>
               <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                 <div
                   className="h-full"
                   style={{ width: `${percentage}%`, backgroundColor: categoryColor }}
                 />
               </div>
               <div className="flex flex-wrap justify-between gap-x-2 text-sm text-muted-foreground">
                 <span>{formatCurrency(calculatedSpent, defaultCurrency)}</span>
                 <span>{formatCurrency(convertedLimit, defaultCurrency)}</span>
               </div>
             </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
