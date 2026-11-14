"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { DetailedExpenses } from "@/components/analytics/detailed-expenses";
import { DetailedTags } from "@/components/analytics/detailed-tags";
import { AnalyticsFilter } from "@/components/analytics/analytics-filter";
import { NetWorthChart } from "@/components/dashboard/net-worth-chart";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { startOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { NetWorthStats } from "@/components/analytics/net-worth-stats";
import { AssetAllocation } from "@/components/analytics/asset-allocation";
import { AccountBreakdown } from "@/components/analytics/account-breakdown";

const TABS = [
    { id: "net-worth", label: "dashboard.charts.net_worth_title" },
    { id: "expenses", label: "dashboard.charts.expenses_title" },
    { id: "tags", label: "dashboard.charts.tags_title" },
] as const;

export function AnalyticsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t } = useTranslation();
    const { accounts, transactions, isLoading, dataError, dataErrors, fetchAllData } = useStore();

    // Use state for tabs, default to URL param or 'net-worth'
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "net-worth");

    // Global Date State
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date(),
    });

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        router.replace(`/analytics?tab=${tab}`);
    };

    const hasLoadError = (dataError || dataErrors.accounts || dataErrors.transactions) && accounts.length === 0 && transactions.length === 0;

    return (
        <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-5 pb-20 md:px-4 md:pb-6 xl:px-8">
            {/* Header & Filter */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight">{t('analytics.page_title')}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t('analytics.page_subtitle')}</p>
                </div>
                <div className="w-full md:w-auto">
                    <AnalyticsFilter dateRange={dateRange} setDateRange={setDateRange} />
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4" role="status" aria-label={t("common.loading")}>
                    <Skeleton className="h-11 w-full rounded-xl md:w-96" />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {[0, 1, 2].map((item) => <Skeleton key={item} className="h-28 rounded-2xl" />)}
                    </div>
                    <Skeleton className="h-[330px] rounded-2xl" />
                </div>
            ) : hasLoadError ? (
                <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center" role="alert">
                    <h3 className="text-base font-semibold">{t("common.data_load_failed_title")}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t("common.data_load_failed")}</p>
                    <Button type="button" variant="outline" onClick={() => void fetchAllData()} className="mt-5 h-11">{t("common.retry")}</Button>
                </div>
            ) : (
            <div className="space-y-5">
                {/* Tabs Navigation */}
                <div role="tablist" aria-label={t('analytics.page_title')} className="flex w-full items-center overflow-x-auto rounded-xl bg-muted p-1 text-muted-foreground md:w-auto md:justify-center no-scrollbar">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            id={`analytics-tab-${tab.id}`}
                            aria-selected={activeTab === tab.id}
                            aria-controls="analytics-panel"
                            onClick={() => handleTabChange(tab.id)}
                            className={cn(
                                "inline-flex min-h-11 min-w-11 flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                activeTab === tab.id ? "bg-background text-foreground" : "hover:bg-background/50"
                            )}
                        >
                            {t(tab.label)}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div id="analytics-panel" role="tabpanel" aria-labelledby={`analytics-tab-${activeTab}`} className="min-h-[500px]">
                    {activeTab === "net-worth" && (
                        <div className="space-y-5 animate-in fade-in-50 duration-300">
                            <NetWorthStats />

                            <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
                                <div className="lg:col-span-2">
                                    <NetWorthChart dateRange={dateRange} />
                                </div>
                                <AssetAllocation />
                                <AccountBreakdown />
                            </div>
                        </div>
                    )}

                    {activeTab === "expenses" && (
                        <div className="animate-in fade-in-50 duration-300">
                            <DetailedExpenses dateRange={dateRange} />
                        </div>
                    )}

                    {activeTab === "tags" && (
                        <div className="animate-in fade-in-50 duration-300">
                            <DetailedTags dateRange={dateRange} />
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
    )
}
