"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  DayPicker,
  useDayPicker,
  type MonthCaptionProps,
} from "react-day-picker"
import { useTranslation } from "react-i18next"
import { ru, enUS, type Locale } from "date-fns/locale"
import {
  startOfMonth,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  eachYearOfInterval,
  getMonth,
  getYear,
} from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

const localeMap: Record<string, Locale> = {
  ru,
  en: enUS,
}

/* -------------------- Month Caption -------------------- */

function CustomMonthCaption({ calendarMonth }: MonthCaptionProps) {
  const {
    goToMonth,
    previousMonth,
    nextMonth,
    formatters,
    labels,
    dayPickerProps,
  } = useDayPicker()

  const navStart = dayPickerProps.startMonth
  const navEnd = dayPickerProps.endMonth

  /* ---------- months ---------- */
  const monthOptions = React.useMemo(() => {
    const months = eachMonthOfInterval({
      start: startOfYear(calendarMonth.date),
      end: endOfYear(calendarMonth.date),
    })

    return months.map((month) => ({
      value: getMonth(month),
      label: formatters.formatMonthDropdown(month),
      disabled:
        (navStart && month < startOfMonth(navStart)) ||
        (navEnd && month > startOfMonth(navEnd)) ||
        false,
    }))
  }, [calendarMonth.date, formatters, navStart, navEnd])

  /* ---------- years ---------- */
  const yearOptions = React.useMemo(() => {
    const fromYear = dayPickerProps.fromYear ?? 2020
    const toYear = dayPickerProps.toYear ?? 2030

    return eachYearOfInterval({
      start: new Date(fromYear, 0, 1),
      end: new Date(toYear, 11, 31),
    }).map((year) => ({
      value: getYear(year),
      label: formatters.formatYearDropdown(year),
    }))
  }, [dayPickerProps.fromYear, dayPickerProps.toYear, formatters])

  const onMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const date = new Date(calendarMonth.date)
    date.setMonth(Number(e.target.value))
    goToMonth(date)
  }

  const onYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const date = new Date(calendarMonth.date)
    date.setFullYear(Number(e.target.value))
    goToMonth(date)
  }

  return (
    <div className="rdp-month_caption">
      <div className="rdp-dropdowns flex items-center gap-2">

        {/* Prev */}
        <button
          type="button"
          onClick={() => previousMonth && goToMonth(previousMonth)}
          disabled={!previousMonth}
          aria-label=""
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Month */}
        <select
          className="bg-background border border-input h-7 px-2 rounded-md text-sm font-medium"
          value={getMonth(calendarMonth.date)}
          onChange={onMonthChange}
          aria-label={labels.labelMonthDropdown()}
        >
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value} disabled={m.disabled}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Year */}
        <select
          className="bg-background border border-input h-7 px-2 rounded-md text-sm font-medium"
          value={getYear(calendarMonth.date)}
          onChange={onYearChange}
          aria-label={labels.labelYearDropdown()}
        >
          {yearOptions.map((y) => (
            <option key={y.value} value={y.value}>
              {y.label}
            </option>
          ))}
        </select>

        {/* Next */}
        <button
          type="button"
          onClick={() => nextMonth && goToMonth(nextMonth)}
          disabled={!nextMonth}
          aria-label=""
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

      </div>
    </div>
  )
}

/* -------------------- Calendar -------------------- */

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const { i18n } = useTranslation()
  const locale = localeMap[i18n.language] || enUS

  return (
    <DayPicker
      locale={locale}
      showOutsideDays={showOutsideDays}
      fromYear={2020}
      toYear={2030}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",

        caption: "flex justify-center",
        nav: "hidden",

        table: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day:
          "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",

        ...classNames,
      }}
      components={{
        MonthCaption: CustomMonthCaption,
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"
export { Calendar }
