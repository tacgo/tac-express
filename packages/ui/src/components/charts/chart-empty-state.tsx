import * as React from "react"
import { RiSignalWifiErrorLine } from "../../icons"
import { cn } from "../../lib/utils"

export interface ChartEmptyStateProps {
  /** Current data point count. */
  count: number
  /** Minimum required to render the chart. Default 3. */
  minimum?: number
  /** Optional override message. */
  message?: string
  className?: string
}

/**
 * Honest telemetry empty-state. Renders when a chart has insufficient data
 * to be meaningful (default: N < 3). Replaces flat / nonsensical chart
 * renders with a clear "AWAITING SIGNAL" frame.
 */
export function ChartEmptyState({
  count,
  minimum = 3,
  message,
  className,
}: ChartEmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex h-full min-h-32 flex-col items-center justify-center gap-2",
        "border border-dashed border-chart-grid bg-chart-track/40",
        "p-4 text-center",
        className,
      )}
    >
      <RiSignalWifiErrorLine
        aria-hidden
        className="size-6 text-chart-axis"
      />
      <p className="tac-caption text-foreground">
        {message ?? "Awaiting signal"}
      </p>
      <p className="tac-tag tac-readout">
        {count} · resumes at n ≥ {minimum}
      </p>
    </div>
  )
}
