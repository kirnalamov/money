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
    <div className="flex flex-wrap items-center gap-0.5 rounded-full bg-[#151815] p-0.5">
      {[7, 30, 90, 180, 365].map((days) => {
        const active = !!dateRange?.from && !!dateRange?.to && differenceInCalendarDays(dateRange.to, dateRange.from) === days;
        const label = days === 30 ? t("dashboard.date_filters.30d") : t(`dashboard.date_filters.${({7: '7d', 90: '3m', 180: '6m', 365: '1y'} as Record<number, string>)[days]}`);
        return <Button key={days} variant="ghost" size="sm" aria-pressed={active} className={active ? "h-8 rounded-full bg-[rgba(192,240,92,0.14)] px-3 text-xs text-[#C0F05C]" : "h-8 rounded-full px-3 text-xs text-[#A0A7A2]"} onClick={() => setPreset(days)}>{label}</Button>;
      })}
      <Button variant="ghost" size="sm" aria-pressed={!dateRange} className={!dateRange ? "h-8 rounded-full bg-[rgba(192,240,92,0.14)] px-3 text-xs text-[#C0F05C]" : "h-8 rounded-full px-3 text-xs text-[#A0A7A2]"} onClick={() => setDateRange(undefined)}>{t("dashboard.date_filters.all")}</Button>
    </div>
  );
}

