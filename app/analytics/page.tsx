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

import { NetWorthStats } from "@/components/analytics/net-worth-stats";
import { AssetAllocation } from "@/components/analytics/asset-allocation";
import { AccountBreakdown } from "@/components/analytics/account-breakdown";

export default function AnalyticsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t } = useTranslation();

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

    return (
        <div className="space-y-6 pb-10">
            {/* Header & Filter */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('analytics.page_title')}</h2>
                    <p className="text-muted-foreground">{t('analytics.page_subtitle')}</p>
                </div>
                <div className="w-full md:w-auto">
                    <AnalyticsFilter dateRange={dateRange} setDateRange={setDateRange} />
                </div>
            </div>

            <div className="space-y-6">
                {/* Tabs Navigation */}
                <div className="flex w-full items-center justify-start overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground md:w-auto md:justify-center no-scrollbar">
                    <button
                        onClick={() => handleTabChange("net-worth")}
                        className={cn(
                            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-none md:flex-1",
                            activeTab === "net-worth" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50"
                        )}
                    >
                        {t("dashboard.charts.net_worth_title")}
                    </button>
                    <button
                        onClick={() => handleTabChange("expenses")}
                        className={cn(
                            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-none md:flex-1",
                            activeTab === "expenses" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50"
                        )}
                    >
                        {t("dashboard.charts.expenses_title")}
                    </button>
                    <button
                        onClick={() => handleTabChange("tags")}
                        className={cn(
                            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-none md:flex-1",
                            activeTab === "tags" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50"
                        )}
                    >
                        {t("dashboard.charts.tags_title")}
                    </button>
                </div>

                {/* Content Area */}
                <div className="min-h-[500px]">
                    {activeTab === "net-worth" && (
                        <div className="space-y-6 animate-in fade-in-50 duration-300">
                            <NetWorthStats />

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="rounded-xl border bg-card text-card-foreground shadow p-6 lg:col-span-2">
                                    <div className="h-[400px] w-full">
                                        <NetWorthChart dateRange={dateRange} />
                                    </div>
                                </div>

                                <div className="lg:col-span-1">
                                    <AssetAllocation />
                                </div>
                                <div className="lg:col-span-1">
                                    <AccountBreakdown />
                                </div>
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
        </div>
    )
}
