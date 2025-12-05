"use client";

import { useTranslation } from "react-i18next";

export default function PortfolioPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">{t("portfolio.title")}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI Placeholders */}
        <div className="p-6 border rounded-xl shadow-sm">{t("portfolio.total_value")}</div>
        <div className="p-6 border rounded-xl shadow-sm">{t("portfolio.day_pnl")}</div>
        <div className="p-6 border rounded-xl shadow-sm">{t("portfolio.total_pnl")}</div>
        <div className="p-6 border rounded-xl shadow-sm">{t("portfolio.ytd_return")}</div>
      </div>
      <div className="h-[400px] border rounded-xl p-6 flex items-center justify-center text-muted-foreground">
        {t("portfolio.chart_placeholder")}
      </div>
    </div>
  );
}
