"use client";

import * as React from "react";
import { DateRange } from "react-day-picker";
import { addDays, startOfMonth, startOfYear, subMonths } from "date-fns";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
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
    <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between bg-card p-2 rounded-2xl border">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setPreset(7)}>{t("dashboard.date_filters.7d")}</Button>
        <Button variant="outline" size="sm" onClick={() => setPreset(30)}>{t("dashboard.date_filters.1m")}</Button>
        <Button variant="outline" size="sm" onClick={() => setPreset(90)}>{t("dashboard.date_filters.3m")}</Button>
        <Button variant="outline" size="sm" onClick={() => setPreset(180)}>{t("dashboard.date_filters.6m")}</Button>
        <Button variant="outline" size="sm" onClick={() => setPreset(365)}>{t("dashboard.date_filters.1y")}</Button>
        <Button variant="outline" size="sm" onClick={() => setDateRange(undefined)}>{t("dashboard.date_filters.all")}</Button>
      </div>
      <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-full sm:w-auto" />
    </div>
  );
}

