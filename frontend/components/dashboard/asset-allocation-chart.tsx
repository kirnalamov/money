"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";
import { cn, convertCurrency, formatCurrency } from "@/lib/utils";
import { useStore } from "@/lib/store";

interface AssetAllocationChartProps {
    className?: string;
}

export function AssetAllocationChart({ className }: AssetAllocationChartProps) {
    const { t } = useTranslation();
    const { positions, defaultCurrency, accounts } = useStore();
    const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Calculate allocation by asset class
    const data = React.useMemo(() => {
        const allocation: Record<string, number> = {};

        // Add positions
        positions.forEach(pos => {
            const value = pos.quantity * pos.currentPrice;
            const valueInDefault = convertCurrency(value, pos.currency, defaultCurrency);
            allocation[pos.assetClass || 'stock'] = (allocation[pos.assetClass || 'stock'] || 0) + valueInDefault;
        });

        // Add Cash from accounts
        const cashAccounts = accounts.filter(a => a.type === 'cash' || a.type === 'bank' || a.type === 'savings');
        cashAccounts.forEach(acc => {
            const balanceInDefault = convertCurrency(acc.balance, acc.currency, defaultCurrency);
            allocation['cash'] = (allocation['cash'] || 0) + balanceInDefault;
        });

        // Transform to array
        const COLORS = {
            stock: "#00C853", // Green
            crypto: "#FFB300", // Amber
            etf: "#2979FF",    // Blue
            bond: "#AB47BC",   // Purple
            cash: "#00E5FF",   // Cyan
        };

        return Object.entries(allocation).map(([key, value]) => ({
            nameKey: `portfolio.asset_classes.${key}`,
            value,
            color: COLORS[key as keyof typeof COLORS] || "#9E9E9E",
            assetClass: key
        })).sort((a, b) => b.value - a.value);

    }, [positions, accounts, defaultCurrency]);

    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    if (total === 0) return null;

    return (
        <div className={cn("rounded-xl border bg-card text-card-foreground shadow h-[400px] flex flex-col transition-all duration-200 hover:shadow-md", className)}>
            <div className="p-6 pb-0 mb-4">
                <h3 className="font-semibold leading-none tracking-tight text-lg">{t("portfolio.allocation_title")}</h3>
            </div>
            <div className="flex-1 w-full min-h-0 flex flex-col md:flex-row items-center justify-center px-4 pb-6 gap-8">
                <div ref={containerRef} className="relative w-full h-full max-w-[280px] max-h-[280px] flex-shrink-0">
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 p-4">
                        <span className="text-3xl font-bold tracking-tight">{formatCurrency(total, defaultCurrency)}</span>
                        <span className="text-sm text-muted-foreground mt-1 font-medium transform uppercase tracking-wider text-[10px]">{t("dashboard.charts.total")}</span>
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
                                stroke="hsl(var(--card))"
                                strokeWidth={2}
                                cornerRadius={6}
                                onMouseEnter={(_, index) => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(undefined)}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        className="transition-all duration-300 outline-none cursor-pointer"
                                        style={{
                                            filter: activeIndex === index ? 'brightness(1.1) drop-shadow(0 0 8px rgba(0,0,0,0.2))' : 'none',
                                            transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                                            transformOrigin: 'center',
                                            opacity: activeIndex !== undefined && activeIndex !== index ? 0.3 : 1
                                        }}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="rounded-xl border bg-popover p-3 shadow-lg ring-1 ring-black/5">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <div
                                                        className="h-2.5 w-2.5 rounded-full ring-2 ring-background"
                                                        style={{ backgroundColor: payload[0].payload.color }}
                                                    />
                                                    <span className="text-sm font-semibold">{t(payload[0].payload.nameKey)}</span>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xl font-bold tabular-nums">
                                                        {formatCurrency(Number(payload[0].value), defaultCurrency)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-medium">
                                                        ({Math.round((Number(payload[0].value) / total) * 100)}%)
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Custom Legend */}
                <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[180px] overflow-y-auto max-h-[160px] md:max-h-full pr-2 custom-scrollbar">
                    {data.map((item, index) => {
                        const percentage = Math.round((item.value / total) * 100);
                        const isHovered = activeIndex === index;
                        const isDimmed = activeIndex !== undefined && activeIndex !== index;

                        return (
                            <div
                                key={item.nameKey}
                                className={cn(
                                    "flex items-center justify-between p-2.5 rounded-lg transition-all cursor-pointer border border-transparent select-none",
                                    isHovered ? "bg-accent/80 border-border/50 shadow-sm transform scale-[1.02]" : "hover:bg-accent/40",
                                    isDimmed && "opacity-40 grayscale-[0.5]"
                                )}
                                onMouseEnter={() => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(undefined)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-3 w-3 rounded-full flex-shrink-0 ring-2 ring-transparent transition-all"
                                        style={{ backgroundColor: item.color, transform: isHovered ? 'scale(1.2)' : 'scale(1)' }}
                                    />
                                    <span className="text-sm font-medium truncate">{t(item.nameKey)}</span>
                                </div>
                                <div className="text-xs font-semibold tabular-nums ml-3 opacity-80">
                                    {percentage}%
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
