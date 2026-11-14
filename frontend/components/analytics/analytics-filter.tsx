"use client";

import * as React from "react";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface AnalyticsFilterProps {
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
}

export function AnalyticsFilter({ dateRange, setDateRange }: AnalyticsFilterProps) {
    const { t } = useTranslation();

    const setPreset = (days: number) => {
        setDateRange({
            from: addDays(new Date(), -days),
            to: new Date(),
        });
    };

    return (
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div role="group" aria-label={t('analytics.filter.time_period')} className="flex w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1 no-scrollbar sm:w-auto">
                    <Button variant="ghost" size="sm" className="h-11 min-w-11 bg-card px-2 text-xs shrink-0 focus-visible:ring-2" onClick={() => setPreset(7)}>{t('dashboard.date_filters.7d')}</Button>
                    <Button variant="ghost" size="sm" className="h-11 min-w-11 bg-card px-2 text-xs shrink-0 focus-visible:ring-2" onClick={() => setPreset(30)}>{t('dashboard.date_filters.1m')}</Button>
                    <Button variant="ghost" size="sm" className="h-11 min-w-11 bg-card px-2 text-xs shrink-0 focus-visible:ring-2" onClick={() => setPreset(90)}>{t('dashboard.date_filters.3m')}</Button>
                    <Button variant="ghost" size="sm" className="h-11 min-w-11 bg-card px-2 text-xs shrink-0 focus-visible:ring-2" onClick={() => setPreset(180)}>{t('dashboard.date_filters.6m')}</Button>
                    <Button variant="ghost" size="sm" className="h-11 min-w-11 bg-card px-2 text-xs shrink-0 focus-visible:ring-2" onClick={() => setPreset(365)}>{t('dashboard.date_filters.1y')}</Button>
                </div>
                <DatePickerWithRange
                    date={dateRange}
                    setDate={setDateRange}
                    className="w-full sm:w-[300px] shrink-0"
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                />
            </div>
        </div>
    );
}
