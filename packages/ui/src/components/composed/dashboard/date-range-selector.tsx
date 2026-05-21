"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import { RiCalendarLine } from "@workspace/ui/icons"

export type DateRangePreset = "today" | "7d" | "30d" | "90d" | "ytd"

const PRESETS: Array<{ value: DateRangePreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "ytd", label: "YTD" },
]

interface DateRangeSelectorProps {
  value?: DateRangePreset
  onChange?: (preset: DateRangePreset) => void
  className?: string
}

function DateRangeSelector({
  value = "7d",
  onChange,
  className,
}: DateRangeSelectorProps) {
  const [internal, setInternal] = React.useState<DateRangePreset>(value)
  const active = onChange ? value : internal

  const handleSelect = (preset: DateRangePreset) => {
    if (onChange) onChange(preset)
    else setInternal(preset)
  }

  return (
    <div
      data-slot="date-range-selector"
      className={cn(
        "inline-flex items-center border border-border bg-card shadow-brutal-sm",
        className
      )}
      role="group"
      aria-label="Date range"
    >
      <div className="flex items-center gap-1.5 px-2.5 border-r border-border text-muted-foreground">
        <RiCalendarLine className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
      {PRESETS.map((preset) => {
        const isActive = preset.value === active
        return (
          <button
            key={preset.value}
            type="button"
            onClick={() => handleSelect(preset.value)}
            className={cn(
              "px-3 py-1.5 font-mono text-2xs uppercase tracking-widest transition-colors",
              "border-r border-border last:border-r-0",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            aria-pressed={isActive}
          >
            {preset.label}
          </button>
        )
      })}
    </div>
  )
}

export { DateRangeSelector }
