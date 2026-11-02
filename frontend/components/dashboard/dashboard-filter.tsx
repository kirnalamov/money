"use client";

import * as React from "react";
import { DateRange } from "react-day-picker";
import { addDays, differenceInCalendarDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface DashboardFilterProps {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
}

export function DashboardFilter({ dateRange, setDateRange }: DashboardFilterProps) {
  const { t } = useTranslation();

  const setPreset = (days: number) => {
    setDateRange({
      from: addDays(new Date(), -days),
      to: new Date(),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {[7, 30, 90, 180, 365].map((days) => {
        const active = !!dateRange?.from && !!dateRange?.to && differenceInCalendarDays(dateRange.to, dateRange.from) === days;
        const label = days === 30 ? t("dashboard.date_filters.30d") : t(`dashboard.date_filters.${({7: '7d', 90: '3m', 180: '6m', 365: '1y'} as Record<number, string>)[days]}`);
        return <Button key={days} variant="ghost" size="sm" aria-pressed={active} className={active ? "rounded-full bg-primary/20 text-primary" : "rounded-full text-muted-foreground"} onClick={() => setPreset(days)}>{label}</Button>;
      })}
      <Button variant="ghost" size="sm" aria-pressed={!dateRange} className={!dateRange ? "rounded-full bg-primary/20 text-primary" : "rounded-full text-muted-foreground"} onClick={() => setDateRange(undefined)}>{t("dashboard.date_filters.all")}</Button>
    </div>
  );
}

