"use client";
import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";
import { cn, formatMoney, formatMoneyCompact, convertCurrency } from "@/lib/utils";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval } from "date-fns";

// Цвета категорий циклически берутся из токенов chart-1..5
const CHART_COLORS = [1, 2, 3, 4, 5].map((n) => `hsl(var(--chart-${n}))`);

export function ExpensesDonut({ dateRange }: { dateRange?: DateRange }) {
    const { t, i18n } = useTranslation();
    const { transactions, defaultCurrency } = useStore();
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

        return sorted.map((item, index) => ({
            ...item,
            color: CHART_COLORS[index % CHART_COLORS.length]
        }));
    }, [transactions, defaultCurrency, dateRangeFrom, dateRangeTo]);

    const categoryName = (category: string) => {
        const key = category.toLowerCase();
        // Ключ только из букв/пробелов/_, иначе i18next разберёт "." и ":" как разделители
        return /^[\p{L}_ ]+$/u.test(key) ? t(`dashboard.categories.${key}`, { defaultValue: category }) : category;
    };
    const rangeQuery = dateRange?.from
        ? `&from=${format(dateRange.from, "yyyy-MM-dd")}${dateRange.to ? `&to=${format(dateRange.to, "yyyy-MM-dd")}` : ""}`
        : "";
    const total = React.useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);
    const totalLabel = formatMoneyCompact(total, defaultCurrency, i18n.language);
    const totalFontSize = totalLabel.length > 8 ? "text-base" : "text-xl";

    if (data.length === 0) {
        return (
        <div className="rounded-[1.5rem] border bg-card p-5 flex min-h-[303px] flex-col gap-5">
                <div className="flex items-center justify-between gap-3"><h3 className="font-semibold leading-snug text-lg">{t("dashboard.charts.expenses_title")}</h3><Link href="/analytics" className="text-sm text-muted-foreground hover:text-foreground hover:underline">{t("common.view_all")}</Link></div>
                <div className="rounded-2xl bg-muted/50 px-4 py-5 text-muted-foreground text-sm">{t("dashboard.empty.expenses_title")}</div>
            </div>
        );
    }

    return (
        <div className="rounded-[1.5rem] border bg-card flex min-h-[303px] flex-col">
            <div className="p-5 pb-0 mb-2 flex items-center justify-between gap-3">
                <h3 className="font-semibold leading-snug text-lg">{t("dashboard.charts.expenses_title")}</h3>
                <Link href="/analytics" className="text-sm text-muted-foreground hover:text-foreground hover:underline">{t("common.view_all")}</Link>
            </div>
            <div className="w-full flex flex-col sm:flex-row items-center justify-center px-4 pb-4 gap-3 sm:gap-6">
                <div ref={containerRef} role="img" aria-label={t("dashboard.charts.expenses_aria")} className="relative h-[160px] min-h-[160px] w-full min-w-0 max-w-[180px] flex-shrink-0">
                    {/* Center Text: диаметр внутреннего круга 2*58=116px, текст уже его */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                        <span className={cn("max-w-[88px] text-center whitespace-nowrap font-bold leading-none tracking-tight tabular-nums", totalFontSize)}>{totalLabel}</span>
                        <span className="text-xs text-muted-foreground mt-1">{t("dashboard.charts.total")}</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={160} initialDimension={{ width: 180, height: 160 }}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={58}
                                outerRadius={74}
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
                                            filter: activeIndex === index ? 'brightness(1.1)' : 'none',
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
                                                    <span className="text-sm font-semibold">{categoryName(payload[0].payload.nameKey)}</span>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-base font-bold tabular-nums">
                                                        {formatMoney(Number(payload[0].value), defaultCurrency, i18n.language)}
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
                <div className="flex min-w-0 flex-col gap-1 w-full md:w-auto md:min-w-[180px] md:max-w-[220px] overflow-y-auto max-h-[160px] md:max-h-full px-1 custom-scrollbar">
                    {data.map((item, index) => {
                        const percentage = Math.round((item.value / total) * 100);
                        const isHovered = activeIndex === index;
                        const isDimmed = activeIndex !== undefined && activeIndex !== index;

                        return (
                            <Link
                                key={item.nameKey}
                                href={`/transactions?type=expense&category=${encodeURIComponent(item.nameKey)}${rangeQuery}`}
                                className={cn(
                                    "flex min-h-11 items-center justify-between px-2.5 rounded-lg transition-all cursor-pointer border border-transparent select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isHovered ? "bg-accent border-border" : "hover:bg-accent",
                                    isDimmed && "opacity-40 grayscale-[0.5]"
                                )}
                                onMouseEnter={() => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(undefined)}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="h-3 w-3 rounded-full flex-shrink-0 ring-2 ring-transparent transition-all"
                                        style={{ backgroundColor: item.color, transform: isHovered ? 'scale(1.2)' : 'scale(1)' }}
                                    />
                                    <span className="text-sm font-medium truncate" title={categoryName(item.nameKey)}>{categoryName(item.nameKey)}</span>
                                </div>
                                <div className="text-xs font-semibold tabular-nums ml-2 flex-shrink-0">
                                    {percentage}%
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
