"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";
import { cn, convertCurrency, formatMoney } from "@/lib/utils";
import { useStore } from "@/lib/store";

interface AssetAllocationChartProps {
    className?: string;
}

const chartColors = [
    ["fill-chart-1", "bg-chart-1"],
    ["fill-chart-2", "bg-chart-2"],
    ["fill-chart-3", "bg-chart-3"],
    ["fill-chart-4", "bg-chart-4"],
    ["fill-chart-5", "bg-chart-5"],
] as const;

export function AssetAllocationChart({ className }: AssetAllocationChartProps) {
    const { t, i18n } = useTranslation();
    const { positions, defaultCurrency, accounts, isLoading, dataReady, dataError } = useStore();
    const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);

    const data = React.useMemo(() => {
        const allocation: Record<string, number> = {};

        positions.forEach(pos => {
            const value = pos.quantity * pos.currentPrice;
            const valueInDefault = convertCurrency(value, pos.currency, defaultCurrency);
            allocation[pos.assetClass || 'stock'] = (allocation[pos.assetClass || 'stock'] || 0) + valueInDefault;
        });

        const cashAccounts = accounts.filter(a => a.type === 'cash' || a.type === 'bank' || a.type === 'savings');
        cashAccounts.forEach(acc => {
            const balanceInDefault = convertCurrency(acc.balance, acc.currency, defaultCurrency);
            allocation['cash'] = (allocation['cash'] || 0) + balanceInDefault;
        });

        return Object.entries(allocation).map(([key, value], index) => ({
            nameKey: `portfolio.asset_classes.${key}`,
            value,
            colorClass: chartColors[index % chartColors.length][0],
            backgroundClass: chartColors[index % chartColors.length][1],
            assetClass: key
        })).sort((a, b) => b.value - a.value);
    }, [positions, accounts, defaultCurrency]);

    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    const statusClass = "rounded-xl border bg-card text-card-foreground p-5 min-h-[240px] flex flex-col justify-center";

    if (isLoading || !dataReady) {
        return <div className={cn(statusClass, className)} role="status">{t("common.loading")}</div>;
    }

    if (dataError) {
        return <div className={cn(statusClass, className)} role="alert"><p className="text-base font-semibold">{t("common.data_load_failed_title")}</p><p className="mt-1 text-sm text-muted-foreground">{t("common.data_load_failed")}</p></div>;
    }

    if (total === 0) {
        return <div className={cn(statusClass, className)}><h3 className="text-lg font-semibold">{t("portfolio.allocation_title")}</h3><p className="mt-3 text-sm text-muted-foreground">{t("portfolio.no_positions")}</p></div>;
    }

    return (
        <div className={cn("rounded-xl border bg-card text-card-foreground h-[400px] flex flex-col", className)}>
            <div className="p-6 pb-0 mb-4">
                <h3 className="font-semibold leading-none tracking-tight text-lg">{t("portfolio.allocation_title")}</h3>
            </div>
            <div className="flex-1 w-full min-h-0 flex flex-col md:flex-row items-center justify-center px-4 pb-6 gap-8" aria-label={t("portfolio.allocation_title")}>
                <div className="relative w-full h-full max-w-[280px] max-h-[280px] flex-shrink-0">
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 p-4">
                        <span className="text-3xl font-bold tracking-tight tabular-nums">{formatMoney(total, defaultCurrency, i18n.language)}</span>
                        <span className="text-sm text-muted-foreground mt-1 font-medium uppercase tracking-wider">{t("dashboard.charts.total")}</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={65}
                                outerRadius={95}
                                paddingAngle={3}
                                dataKey="value"
                                className="stroke-card"
                                strokeWidth={2}
                                cornerRadius={6}
                                onMouseEnter={(_, index) => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(undefined)}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        className={cn(entry.colorClass, "outline-none cursor-pointer transition-opacity", activeIndex !== undefined && activeIndex !== index && "opacity-40")}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) => active && payload?.length ? (
                                    <div className="rounded-xl border bg-popover p-3 ring-1 ring-border">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className={cn("h-2.5 w-2.5 rounded-full ring-2 ring-background", payload[0].payload.backgroundClass)} />
                                            <span className="text-sm font-semibold">{t(payload[0].payload.nameKey)}</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xl font-bold tabular-nums">{formatMoney(Number(payload[0].value), defaultCurrency, i18n.language)}</span>
                                            <span className="text-xs text-muted-foreground font-medium">({Math.round((Number(payload[0].value) / total) * 100)}%)</span>
                                        </div>
                                    </div>
                                ) : null}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[180px] overflow-y-auto max-h-[160px] md:max-h-full pr-2" aria-label={t("portfolio.allocation_title")}>
                    {data.map((item, index) => {
                        const percentage = Math.round((item.value / total) * 100);
                        const isHovered = activeIndex === index;
                        return (
                            <button
                                type="button"
                                key={item.nameKey}
                                className={cn("flex items-center justify-between p-2.5 rounded-lg transition-colors cursor-pointer border border-transparent select-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isHovered ? "bg-accent border-border" : "hover:bg-accent/40", activeIndex !== undefined && activeIndex !== index && "opacity-40")}
                                onMouseEnter={() => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(undefined)}
                                onFocus={() => setActiveIndex(index)}
                                onBlur={() => setActiveIndex(undefined)}
                                aria-label={`${t(item.nameKey)}: ${percentage}%`}
                            >
                                <span className="flex items-center gap-3 min-w-0">
                                    <span className={cn("h-3 w-3 rounded-full flex-shrink-0", item.backgroundClass)} />
                                    <span className="text-sm font-medium truncate">{t(item.nameKey)}</span>
                                </span>
                                <span className="text-xs font-semibold tabular-nums ml-3">{percentage}%</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <ul className="sr-only" aria-label={t("portfolio.allocation_title")}>
                {data.map(item => <li key={`text-${item.nameKey}`}>{t(item.nameKey)}: {formatMoney(item.value, defaultCurrency, i18n.language)}</li>)}
            </ul>
        </div>
    );
}
