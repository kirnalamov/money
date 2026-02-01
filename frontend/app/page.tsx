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
import { useTranslation } from "react-i18next";
import { DateRange } from "react-day-picker";
import { addDays, subDays } from "date-fns";
import { useStore } from "@/lib/store";
import { Account, Transaction } from "@/types";
import { Button } from "@/components/ui/button";

export default function OverviewPage() {
  const { t } = useTranslation();
  const { addAccount, addTransaction } = useStore();

  // Default range: Last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const handleSeedData = () => {
    // 1. Create Test Accounts
    const checkingAccount: Account = {
      id: `seed_${Date.now()}_check`,
      name: "Primary Checking",
      type: "bank",
      balance: 5000,
      currency: "USD",
      provider: "Chase",
      lastSync: new Date().toISOString(),
    };
    const savingsAccount: Account = {
      id: `seed_${Date.now()}_save`,
      name: "High Yield Savings",
      type: "savings",
      balance: 15000,
      currency: "USD",
      provider: "Ally",
      lastSync: new Date().toISOString(),
    };
    addAccount(checkingAccount);
    addAccount(savingsAccount);

    // 2. Create Sample Transactions
    const categories = [
      "dashboard.categories.groceries",
      "dashboard.categories.dining_out",
      "dashboard.categories.transport",
      "dashboard.categories.entertainment",
      "dashboard.categories.shopping",
      "dashboard.categories.utilities",
      "dashboard.categories.housing"
    ];

    const transactions: Transaction[] = Array.from({ length: 40 }).map((_, i) => {
      const isExpense = Math.random() > 0.3;
      const category = categories[Math.floor(Math.random() * categories.length)];
      // Make housing/utilities larger amounts
      let amount = isExpense ? Math.floor(Math.random() * 100) + 10 : Math.floor(Math.random() * 2000) + 1000;
      if (category === "dashboard.categories.housing") amount = 1200 + Math.floor(Math.random() * 100);
      if (category === "dashboard.categories.utilities") amount = 150 + Math.floor(Math.random() * 100);

      return {
        id: `seed_${Date.now()}_tx_${i}`,
        accountId: checkingAccount.id,
        type: isExpense ? "expense" : "income",
        amount: amount,
        currency: "USD",
        category: isExpense ? category : "Income",
        date: subDays(new Date(), Math.floor(Math.random() * 60)).toISOString(),
        description: isExpense ? `Bill/Expense ${i + 1}` : `Paycheck ${i + 1}`,
        status: "completed",
        isRecurring: category === "dashboard.categories.housing" || category === "dashboard.categories.utilities",
      };
    });

    transactions.forEach(tx => addTransaction(tx));
    alert("Seed data added! Refreshing charts...");
    window.location.reload(); // Simple reload to refresh charts if they don't auto-update
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Header & Filter */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">Your financial health at a glance</p>
            <Button variant="outline" size="sm" onClick={handleSeedData}>
              Seed Data
            </Button>
          </div>
        </div>
        <DashboardFilter dateRange={dateRange} setDateRange={setDateRange} />
      </div>

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
          <ExpensesDonut />
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
  );
}
