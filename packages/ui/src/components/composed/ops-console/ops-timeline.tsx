import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

interface TimelineEvent {
  id: string
  label: string
  /** Pre-formatted timestamp (e.g. "9 May 2026, 14:23"). */
  timestamp: string
  detail?: string
  /** Visual tone for the event dot. */
  tone?: "neutral" | "ok" | "warn" | "err" | "violet"
}

interface OpsTimelineProps {
  events: TimelineEvent[]
  emptyMessage?: string
  className?: string
}

const TONE_BG: Record<NonNullable<TimelineEvent["tone"]>, string> = {
  neutral: "bg-border",
  ok: "bg-accent-success",
  warn: "bg-accent-warning",
  err: "bg-destructive",
  violet: "bg-primary",
}

/**
 * OpsTimeline — vertical event log with square (not circular) status dots and
 * a 1px paper-line spine. Matches the design bundle's tracking-history rendering.
 */
function OpsTimeline({ events, emptyMessage = "No events", className }: OpsTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={cn("paper-label", className)}>{emptyMessage}</div>
    )
  }
  return (
    <ol className={cn("relative pl-7", className)}>
      <div
        aria-hidden
        className="absolute left-2 top-2 bottom-2 w-px bg-border"
      />
      {events.map((e) => (
        <li key={e.id} className="relative pb-5 last:pb-0">
          <div
            aria-hidden
            className={cn(
              "absolute -left-[18px] top-1 size-2.5",
              TONE_BG[e.tone ?? "neutral"],
            )}
          />
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-sans font-semibold text-ui-13">
              {e.label}
            </span>
            <span className="font-mono text-ui-11 tabular-nums text-muted-foreground shrink-0">
              {e.timestamp}
            </span>
          </div>
          {e.detail && (
            <p className="font-sans text-ui-13 text-muted-foreground mt-0.5">
              {e.detail}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}

export { OpsTimeline }
export type { OpsTimelineProps, TimelineEvent }
