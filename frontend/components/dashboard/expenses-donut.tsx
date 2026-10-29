"use client";
import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";
import { cn, formatCurrency, convertCurrency } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { DateRange } from "react-day-picker";
import { isWithinInterval } from "date-fns";

export function ExpensesDonut({ dateRange }: { dateRange?: DateRange }) {
    const { t } = useTranslation();
    const { transactions, defaultCurrency } = useStore();
    const router = useRouter();
    const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const dateRangeFrom = dateRange?.from?.getTime() ?? null;
    const dateRangeTo = dateRange?.to?.getTime() ?? null;
    const data = React.useMemo(() => {
        const categoryMap = new Map<string, number>();

        transactions
            .filter(t => t.type === 'expense')
            .filter(t => {
                if (dateRangeFrom === null) return true;
                const txDate = new Date(t.date);
                if (dateRangeTo !== null) {
                    return isWithinInterval(txDate, { start: new Date(dateRangeFrom), end: new Date(dateRangeTo) });
                }
                return txDate.getTime() >= dateRangeFrom;
            })
            .forEach(t => {
                const amount = convertCurrency(t.amount, t.currency, defaultCurrency);
                const category = t.category || "Uncategorized";
                categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
            });

        const sorted = Array.from(categoryMap.entries())
            .map(([name, value]) => ({ nameKey: name, value }))
            .sort((a, b) => b.value - a.value);

        // Predefined colors
        const colors = ["#00C853", "#2979FF", "#FFB300", "#F44336", "#AB47BC", "#EC407A", "#7E57C2"];

        return sorted.map((item, index) => ({
            ...item,
            color: colors[index % colors.length]
        }));
    }, [transactions, defaultCurrency, dateRangeFrom, dateRangeTo]);

    const total = React.useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);

    if (data.length === 0) {
        return (
            <div
                onClick={() => router.push("/analytics")}
                className="rounded-xl border glass-card premium-gradient h-[350px] md:h-[350px] flex flex-col items-center justify-center transition-all duration-200 hover:shadow-lg cursor-pointer group"
            >
                <div className="p-6 pb-0 mb-4 absolute top-0 left-0">
                    <h3 className="font-semibold leading-none tracking-tight text-lg">{t("dashboard.charts.expenses_title")}</h3>
                </div>
                <div className="text-muted-foreground text-sm">{t("dashboard.empty.expenses_title")}</div>
            </div>
        );
    }

    return (
        <div
            onClick={() => router.push("/analytics")}
            className="rounded-xl border glass-card premium-gradient h-[350px] md:h-[350px] flex flex-col transition-all duration-200 hover:shadow-lg cursor-pointer group"
        >
            <div className="p-6 pb-0 mb-4">
                <h3 className="font-semibold leading-none tracking-tight text-lg">{t("dashboard.charts.expenses_title")}</h3>
            </div>
            <div className="flex-1 w-full min-h-0 flex flex-col md:flex-row items-center justify-center px-4 pb-6 gap-8">
                <div ref={containerRef} className="relative w-full h-full max-w-[280px] max-h-[280px] flex-shrink-0">
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 p-4">
                        <span className="text-2xl font-bold tracking-tight">{formatCurrency(total, defaultCurrency)}</span>
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
                                                    <span className="text-sm font-semibold">{t(payload[0].payload.nameKey) || payload[0].payload.nameKey}</span>
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
                <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[180px] md:max-w-[220px] overflow-y-auto max-h-[160px] md:max-h-full pr-2 custom-scrollbar">
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
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="h-3 w-3 rounded-full flex-shrink-0 ring-2 ring-transparent transition-all"
                                        style={{ backgroundColor: item.color, transform: isHovered ? 'scale(1.2)' : 'scale(1)' }}
                                    />
                                    <span className="text-sm font-medium truncate" title={t(item.nameKey)}>{t(item.nameKey)}</span>
                                </div>
                                <div className="text-xs font-semibold tabular-nums ml-2 opacity-80 flex-shrink-0">
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
