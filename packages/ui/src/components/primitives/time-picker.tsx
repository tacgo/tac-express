"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * TimePicker — two native <select>s (HH 0-23 + MM in 5-min steps) that
 * compose into an "HH:MM" 24-hour string.
 *
 * Replaces `<Input type="time">` which renders as a "type-the-numbers"
 * spinner in headless / non-Chromium browsers. The two-select approach is:
 *   • universally rendered the same way
 *   • keyboard-accessible (Tab + arrow keys)
 *   • doesn't depend on locale (always 24h)
 *   • clear about valid values (00-23, 00/05/10/.../55)
 *
 * Usage:
 *   <TimePicker value={state.etd ?? ""} onChange={(v) => setEtd(v)} />
 */
interface TimePickerProps {
  value: string
  onChange: (next: string) => void
  /** Step in minutes (default 5). Use 1 for fine-grained. */
  minuteStep?: number
  /** Forwarded to the wrapper for spacing/positioning. */
  className?: string
  /** ID anchors the HOUR select for label `htmlFor`. */
  id?: string
  disabled?: boolean
  /** ARIA label for the whole picker (the HH select uses this; MM gets a derived one). */
  "aria-label"?: string
}

function parseHHMM(v: string): { hh: string; mm: string } {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(v.trim())
  if (!m || !m[1] || !m[2]) return { hh: "", mm: "" }
  return { hh: m[1].padStart(2, "0"), mm: m[2].padStart(2, "0") }
}

function pad(n: number): string {
  return n.toString().padStart(2, "0")
}

const SELECT_CLASS = cn(
  "h-8 px-2 py-1 bg-transparent border border-input text-xs font-mono tabular-nums",
  "outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "appearance-none",
)

export function TimePicker({
  value,
  onChange,
  minuteStep = 5,
  className,
  id,
  disabled,
  "aria-label": ariaLabel,
}: TimePickerProps) {
  const { hh, mm } = parseHHMM(value)

  // Memoise the option lists so React doesn't churn re-allocations on every keystroke.
  const hours = React.useMemo(
    () => Array.from({ length: 24 }, (_, i) => pad(i)),
    [],
  )
  const minutes = React.useMemo(
    () =>
      Array.from(
        { length: Math.ceil(60 / minuteStep) },
        (_, i) => pad(i * minuteStep),
      ),
    [minuteStep],
  )

  function emit(nextHh: string, nextMm: string) {
    if (!nextHh && !nextMm) {
      onChange("")
      return
    }
    onChange(`${nextHh || "00"}:${nextMm || "00"}`)
  }

  return (
    <div
      data-slot="time-picker"
      className={cn("inline-flex items-center gap-1", className)}
    >
      <select
        id={id}
        aria-label={ariaLabel ? `${ariaLabel} — hours` : "hours"}
        disabled={disabled}
        value={hh}
        onChange={(e) => emit(e.target.value, mm)}
        className={cn(SELECT_CLASS, "w-14 text-center")}
      >
        <option value="" disabled>
          HH
        </option>
        {hours.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span aria-hidden className="font-mono text-xs text-muted-foreground">
        :
      </span>
      <select
        aria-label={ariaLabel ? `${ariaLabel} — minutes` : "minutes"}
        disabled={disabled}
        value={mm}
        onChange={(e) => emit(hh, e.target.value)}
        className={cn(SELECT_CLASS, "w-14 text-center")}
      >
        <option value="" disabled>
          MM
        </option>
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  )
}
