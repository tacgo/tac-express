"use client"

import * as React from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/primitives/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/primitives/popover"
import { RiCalendarLine } from "@workspace/ui/icons"

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  numberOfMonths?: number
}

function DateRangePicker({
  value,
  onChange,
  placeholder = "Select date range",
  disabled,
  className,
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const label = React.useMemo(() => {
    if (!value?.from) return placeholder
    if (!value.to) return format(value.from, "LLL dd, y")
    return `${format(value.from, "LLL dd, y")} – ${format(value.to, "LLL dd, y")}`
  }, [value, placeholder])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start gap-2 font-mono text-xs uppercase tracking-wide",
            !value?.from && "text-muted-foreground",
            className
          )}
          data-slot="date-range-picker-trigger"
        >
          <RiCalendarLine className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={numberOfMonths}
          selected={value}
          onSelect={onChange}
          disabled={disabled}
          defaultMonth={value?.from}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DateRangePicker }
export type { DateRange }
