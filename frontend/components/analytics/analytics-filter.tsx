"use client";

import * as React from "react";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Filter, Calendar as CalendarIcon } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

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
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card/50 p-4 rounded-xl border backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm">{t('analytics.filter.time_period')}</h3>
                    <p className="text-xs text-muted-foreground">{t('analytics.filter.select_range')}</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-none">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs shrink-0" onClick={() => setPreset(7)}>{t('dashboard.date_filters.7d')}</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs shrink-0" onClick={() => setPreset(30)}>{t('dashboard.date_filters.1m')}</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs shrink-0" onClick={() => setPreset(90)}>{t('dashboard.date_filters.3m')}</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs shrink-0" onClick={() => setPreset(180)}>{t('dashboard.date_filters.6m')}</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs shrink-0" onClick={() => setPreset(365)}>{t('dashboard.date_filters.1y')}</Button>
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
