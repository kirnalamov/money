"use client";

import { useState } from "react";
import { NetWorthHeader } from "@/components/dashboard/net-worth-header";
import { KpiCardsGrid } from "@/components/dashboard/kpi-cards-grid";
import { NetWorthChart } from "@/components/dashboard/net-worth-chart";
import { ExpensesDonut } from "@/components/dashboard/expenses-donut";
import { LimitsSummary } from "@/components/dashboard/limits-summary";
import { DashboardFilter } from "@/components/dashboard/dashboard-filter";
import { useTranslation } from "react-i18next";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

export default function OverviewPage() {
  const { t } = useTranslation();
  
  // Default range: Last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("dashboard.title")}</h2>
      </div>
      
      {/* Filter Bar */}
      <DashboardFilter dateRange={dateRange} setDateRange={setDateRange} />

      <NetWorthHeader />
      
      <KpiCardsGrid />

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-1 md:col-span-2 lg:col-span-4">
          <NetWorthChart dateRange={dateRange} />
        </div>
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          <ExpensesDonut />
        </div>
      </div>

      <LimitsSummary />
    </div>
  );
}
