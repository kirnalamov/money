"use client";

import { useState } from "react";
import { NetWorthHeader } from "@/components/dashboard/net-worth-header";
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
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GrowthCard } from "@/components/dashboard/growth-card";

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
      <div className="mx-auto space-y-5 pb-10 md:max-w-[1440px] md:px-4 xl:px-8">
        {/* Header & Filter */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-3xl md:text-[40px] font-bold tracking-tight leading-none">{t("dashboard.title")}</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3"><DatePickerWithRange date={dateRange} setDate={setDateRange} compactLabel /><Button variant="outline" size="icon" className="rounded-full" aria-label="Уведомления"><Bell className="h-4 w-4" /></Button></div>
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

        <NetWorthHeader />
        <QuickActions />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)] items-stretch">
          <div className="min-w-0"><NetWorthChart dateRange={dateRange} showAnalyticsLink periodControls={<DashboardFilter dateRange={dateRange} setDateRange={setDateRange} />} /></div>
          <ExpensesDonut dateRange={dateRange} />
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] items-start">
          <RecentTransactions />
          <GrowthCard />
        </div>
        <GoalsSummary />
        <div className="grid gap-5 lg:grid-cols-2 items-start">
          <MandatoryExpensesList />
          <LimitsSummary />
        </div>

      </div>
    </ProtectedRoute>
  );
}
