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
  const locale = localeMap[i18n.language?.slice(0, 2)] || enUS

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "h-11 w-full justify-between rounded-full border-border bg-card px-4 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent",
              date && "text-foreground"
            )}
          >
            <span className="flex min-w-0 items-center"><CalendarIcon className="mr-2 h-[17px] w-[17px]" />{date?.from ? (
              date.to ? (
                <>
                  {compactLabel ? `${format(date.from, "LLLL", { locale }).replace(/^./, (char) => char.toUpperCase())} — ${format(date.to, "LLLL", { locale }).replace(/^./, (char) => char.toUpperCase())}` : `${format(date.from, "P", { locale })} - ${format(date.to, "P", { locale })}`}
                </>
              ) : (
                format(date.from, "P", { locale })
              )
            ) : (
              <span>{t("common.pick_date")}</span>
            )}</span><ChevronDown className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
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
