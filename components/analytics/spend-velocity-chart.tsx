"use client";

import { useStore } from "@/lib/store";
import { convertCurrency, formatCurrency } from "@/lib/utils";
import { format, differenceInDays, startOfMonth, subMonths, getDaysInMonth, addDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function SpendVelocityChart() {
    const { transactions, defaultCurrency, accounts } = useStore();
    const { t } = useTranslation();

    // Base logic: Compare Current Month vs Previous Month Cumulative Spend
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const prevMonthStart = startOfMonth(subMonths(today, 1));
    const daysInCurrentMonth = getDaysInMonth(today);
    const daysInPrevMonth = getDaysInMonth(prevMonthStart);

    // Helper to get cumulative data for a month
    const getMonthData = (monthStart: Date, daysInMonth: number) => {
        const dailyTotals = new Array(daysInMonth).fill(0);

        transactions.filter(tx => tx.type === 'expense').forEach(tx => {
            const date = new Date(tx.date);
            // Check if tx is in this specific month
            if (date.getMonth() === monthStart.getMonth() && date.getFullYear() === monthStart.getFullYear()) {
                const dayIndex = date.getDate() - 1;
                const account = accounts.find(a => a.id === tx.accountId);
                if (account) {
                    dailyTotals[dayIndex] += convertCurrency(tx.amount, account.currency, defaultCurrency);
                }
            }
        });

        // Compute cumulative
        const cumulative = [];
        let runningTotal = 0;
        for (let i = 0; i < daysInMonth; i++) {
            // For current month, don't project into future days (flatline or stop?)
            // Usually simpler to just show up to 'today' for current, but for chart alignment we fill relevant days.
            const isFuture = monthStart.getMonth() === today.getMonth() && (i + 1) > today.getDate();

            runningTotal += dailyTotals[i];

            cumulative.push({
                day: i + 1,
                value: isFuture ? null : runningTotal, // Don't plot future cumulatives for current month
                rawDaily: dailyTotals[i]
            });
        }
        return cumulative;
    };

    const currentData = getMonthData(currentMonthStart, daysInCurrentMonth);
    const prevData = getMonthData(prevMonthStart, daysInPrevMonth);

    // Merge for Chart
    // X Axis is Day 1 -> 31
    const mergedData = [];
    const maxDays = Math.max(daysInCurrentMonth, daysInPrevMonth);

    for (let i = 0; i < maxDays; i++) {
        mergedData.push({
            day: i + 1,
            current: currentData[i]?.value,
            previous: prevData[i]?.value,
        });
    }

    // Velocity Stats
    const currentTotal = currentData[today.getDate() - 1]?.value || 0;
    const prevTotalAtSameDay = prevData[today.getDate() - 1]?.value || 0;

    const velocityDiff = currentTotal - prevTotalAtSameDay;
    const velocityPercent = prevTotalAtSameDay > 0 ? (velocityDiff / prevTotalAtSameDay) * 100 : 0;
    const isSpendingFaster = velocityDiff > 0;

    return (
        <Card className="glass-card h-full">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base">{t('analytics.velocity.title')}</CardTitle>
                        <CardDescription>{t('analytics.velocity.subtitle')}</CardDescription>
                    </div>
                    <div className={cn(
                        "px-2 py-1 rounded text-xs font-bold text-nowrap",
                        isSpendingFaster ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                    )}>
                        {isSpendingFaster ? "+" : ""}{velocityPercent.toFixed(1)}% {isSpendingFaster ? t('analytics.velocity.faster') : t('analytics.velocity.slower')}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mergedData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey="day"
                                type="number"
                                domain={[1, maxDays]}
                                tickLine={false}
                                axisLine={false}
                                fontSize={10}
                                tickFormatter={(val) => `Day ${val}`}
                            />
                            <YAxis
                                hide
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                formatter={(value: number, name: string) => [
                                    formatCurrency(value, defaultCurrency),
                                    name === 'current' ? t('analytics.forecast.current') : t('dashboard.date_filters.1m')
                                ]}
                                labelFormatter={(day) => `Day ${day}`}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Line
                                type="monotone"
                                dataKey="previous"
                                name={t('dashboard.vs_last_month')}
                                stroke="hsl(var(--muted-foreground))"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="current"
                                name="Current Month"
                                stroke="hsl(var(--primary))"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6 }}
                                connectNulls
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className={cn(
                    "mt-3 text-xs p-2.5 rounded-lg border flex items-center justify-center gap-2 transition-colors",
                    isSpendingFaster
                        ? "bg-red-500/5 border-red-500/10 text-red-600 dark:text-red-400"
                        : "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                )}>
                    {isSpendingFaster ? (
                        <>
                            <span className="font-semibold">{t('analytics.velocity.caution')}:</span>
                            <span dangerouslySetInnerHTML={{ __html: t('analytics.velocity.outpacing', { amount: `<span class="font-bold">${formatCurrency(velocityDiff, defaultCurrency)}</span>` }) }} />
                        </>
                    ) : (
                        <>
                            <span className="font-semibold">{t('analytics.velocity.great_job')}</span>
                            <span dangerouslySetInnerHTML={{ __html: t('analytics.velocity.saved', { amount: `<span class="font-bold">${formatCurrency(Math.abs(velocityDiff), defaultCurrency)}</span>` }) }} />
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
