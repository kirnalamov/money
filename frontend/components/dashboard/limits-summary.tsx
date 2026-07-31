"use client";

import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { formatCurrency, convertCurrency } from "@/lib/utils";

// Categories are now fetched from store with their colors

export function LimitsSummary() {
  const { t } = useTranslation();
  const { limits, transactions, defaultCurrency, categories } = useStore();

  return (
    <div className="rounded-xl border glass-card premium-gradient text-card-foreground shadow-lg px-4 py-3 transition-all duration-300 hover:shadow-xl">
      <h3 className="font-semibold leading-none tracking-tight mb-3">{t("dashboard.charts.monthly_limits")}</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {limits.filter(limit => limit.period === 'monthly').map((limit) => {

          // Calculate dynamically from current month's transactions
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();

          const matchingTransactions = transactions.filter(t =>
            t.type === 'expense' &&
            t.category === limit.category &&
            new Date(t.date).getMonth() === currentMonth &&
            new Date(t.date).getFullYear() === currentYear
          );

          const calculatedSpent = matchingTransactions.reduce((acc, tx) => {
            return acc + convertCurrency(tx.amount, tx.currency, defaultCurrency);
          }, 0);

          const convertedLimit = convertCurrency(limit.amount, limit.currency, defaultCurrency);
          const percentage = convertedLimit > 0 ? Math.min(100, (calculatedSpent / convertedLimit) * 100) : 0;
          
          // Try to find category in store for color
          const storeCategory = categories.find(c => c.name === limit.category);
          const categoryColor = storeCategory?.color || "#10b981"; // Fallback to green

          return (
            <div key={limit.id} className="p-2 border rounded-lg bg-background/50">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-sm truncate max-w-[100px] pr-2">{t(limit.category)}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{Math.round(percentage)}%</span>
              </div>
              <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${percentage}%`, backgroundColor: categoryColor }}
                />
              </div>
              <div className="mt-1 text-xs text-muted-foreground flex justify-between items-center">
                <span>{formatCurrency(calculatedSpent, defaultCurrency)} / {formatCurrency(convertedLimit, defaultCurrency)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
