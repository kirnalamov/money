"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { useTranslation } from "react-i18next"
import { ru, enUS, type Locale } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
  className?: string
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
  disabled?: (date: Date) => boolean
  align?: "start" | "center" | "end"
  compactLabel?: boolean
}

const localeMap: Record<string, Locale> = {
  ru: ru,
  en: enUS,
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
  disabled,
  align = "start",
  compactLabel = false,
}: DatePickerWithRangeProps) {
  const { i18n, t } = useTranslation()
  const locale = localeMap[i18n.language] || enUS

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "h-11 w-full justify-between rounded-full border-[#292F2B] bg-[#111311] px-4 text-left text-[13px] font-medium transition-colors hover:bg-[#191D1A]",
              !date && "text-muted-foreground"
            )}
          >
            <span className="flex min-w-0 items-center"><CalendarIcon className="mr-2 h-[17px] w-[17px]" />{date?.from ? (
              date.to ? (
                <>
                  {compactLabel ? `${format(date.from, "LLLL", { locale }).replace(/^./, (char) => char.toUpperCase())} — ${format(date.to, "LLLL", { locale }).replace(/^./, (char) => char.toUpperCase())}` : `${format(date.from, "dd.MM.yyyy", { locale })} - ${format(date.to, "dd.MM.yyyy", { locale })}`}
                </>
              ) : (
                format(date.from, "dd.MM.yyyy", { locale })
              )
            ) : (
              <span>{t("common.pick_date")}</span>
            )}</span><ChevronDown className="ml-3 h-4 w-4 shrink-0 text-[#89928B]" />
          </Button>
        </PopoverTrigger>
          <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] rounded-2xl p-0 shadow-xl" align={align}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={1}
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
