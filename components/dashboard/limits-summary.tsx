"use client";

import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { formatCurrency, convertCurrency } from "@/lib/utils";

const colorMap: Record<string, string> = {
  "dashboard.categories.groceries": "bg-plutus-green",
  "dashboard.categories.dining_out": "bg-plutus-amber",
  "dashboard.categories.entertainment": "bg-plutus-blue",
  "dashboard.categories.transport": "bg-plutus-green",
  "dashboard.categories.shopping": "bg-destructive",
  "dashboard.categories.housing": "bg-plutus-green",
  "dashboard.categories.food": "bg-plutus-blue",
  "dashboard.categories.utilities": "bg-plutus-amber",
};

export function LimitsSummary() {
  const { t } = useTranslation();
  const { limits, defaultCurrency } = useStore();

  return (
    <div className="rounded-xl border glass-card premium-gradient text-card-foreground shadow-lg p-6 h-full transition-all duration-300 hover:shadow-xl">
      <h3 className="font-semibold leading-none tracking-tight mb-6">{t("dashboard.charts.monthly_limits")}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
        {limits.filter(limit => limit.period === 'monthly').map((limit) => {
          const percentage = Math.min(100, (limit.spent / limit.amount) * 100);
          const convertedSpent = convertCurrency(limit.spent, limit.currency, defaultCurrency);
          const convertedLimit = convertCurrency(limit.amount, limit.currency, defaultCurrency);
          const color = colorMap[limit.category] || "bg-plutus-green";

          return (
            <div key={limit.id} className="p-4 border rounded-lg bg-background">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm truncate pr-2">{t(limit.category)}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{Math.round(percentage)}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full ${color}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-muted-foreground flex justify-between items-center">
                <span>{formatCurrency(convertedSpent, defaultCurrency)} / {formatCurrency(convertedLimit, defaultCurrency)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
