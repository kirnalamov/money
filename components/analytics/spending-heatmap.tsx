"use client";

import { useStore } from "@/lib/store";
import { convertCurrency, formatCurrency } from "@/lib/utils";
import { subDays, format, eachDayOfInterval, startOfYear, endOfYear, getDay, startOfWeek, endOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

import { useRef, useEffect } from "react";

export function SpendingHeatmap() {
    const { transactions, defaultCurrency, accounts } = useStore();
    const { t } = useTranslation();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to end on mount
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, [transactions]); // Re-scroll if data changes (e.g. filter)

    // ... (Data prep remains same)
    // 1. Prepare Data
    const today = new Date();
    const startDate = subDays(today, 365);

    const dailySpend: Record<string, number> = {};
    let maxSpend = 0;

    transactions.filter(tx => tx.type === 'expense').forEach(tx => {
        const dateStr = tx.date.split('T')[0]; // YYYY-MM-DD
        const account = accounts.find(a => a.id === tx.accountId);
        if (!account) return;
        const amount = convertCurrency(tx.amount, account.currency, defaultCurrency);

        dailySpend[dateStr] = (dailySpend[dateStr] || 0) + amount;
        if (dailySpend[dateStr] > maxSpend) maxSpend = dailySpend[dateStr];
    });

    // 2. Generate Days Grid
    const days = eachDayOfInterval({ start: startDate, end: today });

    // 3. Behavioral Insights: Calculate Peak Day
    const dayOfWeekStats = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }; // 0=Sun
    Object.keys(dailySpend).forEach(dateStr => {
        const date = new Date(dateStr);
        const day = getDay(date) as keyof typeof dayOfWeekStats;
        dayOfWeekStats[day] += dailySpend[dateStr];
    });

    const daysOfWeek = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
    let maxDayIndex = 0;
    let maxDayValue = 0;
    Object.entries(dayOfWeekStats).forEach(([dayIndex, val]) => {
        if (val > maxDayValue) {
            maxDayValue = val;
            maxDayIndex = parseInt(dayIndex);
        }
    });
    const peakDay = maxDayValue > 0 ? daysOfWeek[maxDayIndex] : "N/A";

    // Determine color intensity
    const getIntensityClass = (value: number) => {
        if (value === 0) return "bg-muted/20";
        const ratio = value / maxSpend;
        if (ratio < 0.2) return "bg-emerald-900/40"; // Very low
        if (ratio < 0.4) return "bg-emerald-700/60";
        if (ratio < 0.6) return "bg-emerald-500/80";
        if (ratio < 0.8) return "bg-emerald-400";
        return "bg-emerald-300"; // Max
    };

    return (
        <Card className="glass-card h-full flex flex-col">
            <CardHeader className="pb-2 flex-none">
                <CardTitle className="text-base">{t('analytics.habits.title')}</CardTitle>
                <p className="text-xs text-muted-foreground">{t('analytics.habits.subtitle')}</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between min-h-0">
                <div
                    ref={scrollRef}
                    className="flex flex-wrap gap-2 justify-center sm:justify-start overflow-x-auto pb-2 custom-scrollbar pl-1 flex-1 items-center content-center"
                >
                    {/* 
                       Simple grid approach:
                       We actually want columns of weeks. 
                       CSS Grid flow-col is perfect for this.
                     */}
                    <div className="grid grid-rows-7 grid-flow-col gap-1.5 w-max">
                        {days.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const value = dailySpend[dateStr] || 0;
                            return (
                                <TooltipProvider key={dateStr}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={cn(
                                                    "w-3 h-3 rounded-[2px] transition-all hover:ring-2 hover:ring-ring hover:scale-110",
                                                    getIntensityClass(value)
                                                )}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p className="text-xs font-bold">{format(day, 'MMM d, yyyy')}</p>
                                            <p className="text-xs">{formatCurrency(value, defaultCurrency)}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )
                        })}
                    </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t flex-none">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <span>{t('analytics.habits.less')}</span>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-[1px] bg-muted/20" />
                            <div className="w-2 h-2 rounded-[1px] bg-emerald-900/40" />
                            <div className="w-2 h-2 rounded-[1px] bg-emerald-500/80" />
                            <div className="w-2 h-2 rounded-[1px] bg-emerald-300" />
                        </div>
                        <span>{t('analytics.habits.more')}</span>
                    </div>
                    {maxDayValue > 0 && (
                        <div className="text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            {t('analytics.habits.peak')}: {peakDay}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
