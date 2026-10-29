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
import { MandatoryExpensesList } from "@/components/dashboard/mandatory-expenses-list";
import { DashboardDataSourceStatus } from "@/components/dashboard/data-source-status";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import ProtectedRoute from "@/components/auth/protected-route";
import { useTranslation } from "react-i18next";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
import { useStore } from "@/lib/store";
import { Wallet } from "lucide-react";

export default function OverviewPage() {
  const { t } = useTranslation();
  const { accounts } = useStore();

  // Default range: Last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  return (
    <ProtectedRoute>
      <div className="space-y-6 md:space-y-8 pb-10">
        {/* Header & Filter */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
            </div>
          </div>
          <DashboardFilter dateRange={dateRange} setDateRange={setDateRange} />
        </div>

        <DashboardDataSourceStatus />

        {accounts.length === 0 && (
          <DashboardEmptyState
            icon={Wallet}
            title={t("dashboard.empty.accounts_title")}
            description={t("dashboard.empty.accounts_description")}
            href="/accounts"
            action={t("dashboard.empty.accounts_action")}
          />
        )}

        {/* KPI Cards */}
        <KpiCardsGrid />

        {/* Quick Actions */}
        <QuickActions />

        {/* Main Charts Area */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
          <div className="col-span-1 lg:col-span-4 space-y-6">
            <NetWorthChart dateRange={dateRange} />
          </div>
          <div className="col-span-1 lg:col-span-3 space-y-6 h-full flex flex-col">
            <ExpensesDonut dateRange={dateRange} />
            <RecentTransactions />
          </div>
        </div>

        {/* Secondary Info Area */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-1 lg:col-span-2 space-y-6">
            <GoalsSummary />
            <MandatoryExpensesList />
          </div>
          <div className="col-span-1 lg:col-span-5">
            <LimitsSummary />
          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}
