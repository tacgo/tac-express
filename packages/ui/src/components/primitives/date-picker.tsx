"use client"

import * as React from "react"
import { format } from "date-fns"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/primitives/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/primitives/popover"
import { RiCalendarLine } from "@workspace/ui/icons"

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  formatStr?: string
}

function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled,
  className,
  formatStr = "PPP",
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start gap-2 font-mono text-xs uppercase tracking-wide",
            !value && "text-muted-foreground",
            className
          )}
          data-slot="date-picker-trigger"
        >
          <RiCalendarLine className="size-4 shrink-0" />
          {value ? format(value, formatStr) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
