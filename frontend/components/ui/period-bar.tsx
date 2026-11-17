"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, isSameDay } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface PeriodPreset<K extends string> {
  key: K;
  label: string;
}

/** Подпись выбранного диапазона дат: «12 нояб. — 18 нояб. 2026». */
export function rangeLabel(range: DateRange | undefined, language: string): string {
  if (!range?.from) return "";
  const locale = language.startsWith("ru") ? ru : enUS;
  if (!range.to || isSameDay(range.from, range.to)) return format(range.from, "d MMM yyyy", { locale });
  return `${format(range.from, "d MMM", { locale })} — ${format(range.to, "d MMM yyyy", { locale })}`;
}

/**
 * Панель выбора периода: быстрые периоды (переключатель) и календарь для произвольного диапазона.
 * Когда выбран диапазон, ни один быстрый период не подсвечен.
 */
export function PeriodBar<K extends string>({
  presets,
  value,
  onPreset,
  range,
  onRange,
  className,
}: {
  presets: PeriodPreset<K>[];
  value: K | null;
  onPreset: (key: K) => void;
  range: DateRange | undefined;
  onRange: (range: DateRange | undefined) => void;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const custom = !!range?.from;

  return (
    <div role="group" aria-label={t("overview.period", "Период")} className={cn("flex items-center gap-0.5 rounded-xl border border-[#232721] bg-[#0E0F0E] p-1", className)}>
      {presets.map((p) => {
        const active = !custom && value === p.key;
        return (
          <button
            key={p.key}
            type="button"
            aria-pressed={active}
            onClick={() => { onRange(undefined); onPreset(p.key); }}
            className={cn("h-[32px] rounded-lg px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]", active ? "bg-[#2A2F27] text-[#F1F3EE]" : "text-[#A2A89C] hover:text-[#F1F3EE]")}
          >
            {p.label}
          </button>
        );
      })}
      <RangePicker range={range} onRange={onRange} align="end">
        <button
          type="button"
          aria-label={t("transactions.range.title", "Период")}
          aria-pressed={custom}
          className={cn("ml-0.5 flex h-[32px] items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]", custom ? "bg-[#2A2F27] text-[#F1F3EE]" : "text-[#A2A89C] hover:text-[#F1F3EE]")}
        >
          <CalendarRange className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {custom && <span className="hidden whitespace-nowrap sm:inline">{rangeLabel(range, i18n.language)}</span>}
        </button>
      </RangePicker>
    </div>
  );
}

/** Календарь выбора диапазона во всплывающем окне; кнопка-триггер передаётся как children. */
export function RangePicker({
  range,
  onRange,
  align = "end",
  children,
}: {
  range: DateRange | undefined;
  onRange: (range: DateRange | undefined) => void;
  align?: "start" | "center" | "end";
  children: React.ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const custom = !!range?.from;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-auto max-w-[calc(100vw-24px)] rounded-[18px] border-[#2A2E27] bg-[#151714] p-3">
        <Calendar mode="range" selected={range} defaultMonth={range?.from} disabled={{ after: new Date() }} onSelect={(value) => onRange(value)} />
        <div className="flex items-center justify-between gap-3 pt-2.5">
          <span className="text-[12.5px] text-[#8D9388]">{custom ? rangeLabel(range, i18n.language) : t("transactions.range.hint", "Выберите первую и последнюю дату")}</span>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => onRange(undefined)} disabled={!custom} className="h-8 rounded-lg px-3 text-[12.5px] font-semibold text-[#8D9388] hover:text-[#F1F3EE] disabled:opacity-40">
              {t("transactions.range.reset", "Сбросить")}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-8 rounded-lg bg-[#C6F24E] px-3 text-[12.5px] font-bold text-[#10170A]">
              {t("transactions.range.apply", "Готово")}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
