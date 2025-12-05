"use client";

import { useTranslation } from "react-i18next";

const limits = [
  { category: "Groceries", spent: 450, limit: 600, color: "bg-plutus-green" },
  { category: "Dining Out", spent: 280, limit: 300, color: "bg-plutus-amber" },
  { category: "Entertainment", spent: 150, limit: 200, color: "bg-plutus-blue" },
  { category: "Transport", spent: 180, limit: 250, color: "bg-plutus-green" },
  { category: "Shopping", spent: 320, limit: 300, color: "bg-destructive" },
];

export function LimitsSummary() {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
      <h3 className="font-semibold leading-none tracking-tight mb-4">{t("dashboard.charts.monthly_limits")}</h3>
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {limits.map((limit) => {
          const percentage = Math.min(100, (limit.spent / limit.limit) * 100);
          return (
            <div key={limit.category} className="min-w-[200px] p-4 border rounded-lg bg-background">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">{limit.category}</span>
                <span className="text-xs text-muted-foreground">{Math.round(percentage)}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className={`h-full ${limit.color}`} 
                  style={{ width: `${percentage}%` }} 
                />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                ${limit.spent} / ${limit.limit}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
