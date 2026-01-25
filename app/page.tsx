"use client";

import { useState } from "react";
import { KpiCardsGrid } from "@/components/dashboard/kpi-cards-grid";
import { NetWorthChart } from "@/components/dashboard/net-worth-chart";
import { ExpensesDonut } from "@/components/dashboard/expenses-donut";
import { LimitsSummary } from "@/components/dashboard/limits-summary";
import { DashboardFilter } from "@/components/dashboard/dashboard-filter";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { GoalsSummary } from "@/components/dashboard/goals-summary";
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
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Header & Filter */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h2>
          <p className="text-muted-foreground mt-1">Your financial health at a glance</p>
        </div>
        <DashboardFilter dateRange={dateRange} setDateRange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <KpiCardsGrid />

      {/* Main Charts Area */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        <div className="col-span-1 lg:col-span-4 space-y-6 h-full flex flex-col">
          <NetWorthChart dateRange={dateRange} />
          {/* Quick Actions (Mobile/Tablet friendly placement) */}
          <div className="lg:hidden">
            <QuickActions />
          </div>
        </div>
        <div className="col-span-1 lg:col-span-3 space-y-6">
          <ExpensesDonut />
          <RecentTransactions />
        </div>
      </div>

      {/* Secondary Info Area */}
      {/* Secondary Info Area */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-1 lg:col-span-2">
          <GoalsSummary />
        </div>
        <div className="col-span-1 lg:col-span-3">
          <LimitsSummary />
        </div>
        {/* Desktop Quick Actions */}
        <div className="hidden lg:block col-span-1 lg:col-span-2">
          <div className="rounded-xl border bg-card text-card-foreground shadow p-6 h-full">
            <h3 className="font-semibold leading-none tracking-tight mb-4">{t("common.actions")}</h3>
            <QuickActions />
          </div>
        </div>
      </div>

    </div>
  );
}
