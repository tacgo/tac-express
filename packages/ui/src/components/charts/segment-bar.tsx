import * as React from "react"
import { cn } from "../../lib/utils"
import type { ChartTone, Segment } from "./types"

export interface SegmentBarProps {
  segments: Segment[]
  /** Total to use as denominator. Defaults to sum of segments. */
  total?: number
  /** Optional formatter for value display. Defaults to integer. */
  formatValue?: (value: number) => string
  /** Optional formatter for percentage. Defaults to whole-number percent. */
  formatPercent?: (fraction: number) => string
  /** Hide the legend below the bar. */
  hideLegend?: boolean
  className?: string
}

const TONE_VAR: Record<ChartTone, string> = {
  primary: "var(--chart-primary)",
  muted: "var(--chart-primary-muted)",
  "ramp-1": "var(--chart-ramp-1)",
  "ramp-2": "var(--chart-ramp-2)",
  "ramp-3": "var(--chart-ramp-3)",
  "ramp-4": "var(--chart-ramp-4)",
  "ramp-5": "var(--chart-ramp-5)",
}

const DEFAULT_RAMP: ChartTone[] = [
  "primary",
  "ramp-3",
  "ramp-2",
  "ramp-1",
  "muted",
]

/**
 * Stacked horizontal segment bar — replaces composition donuts. At small N
 * this still communicates proportions clearly; at large N it doesn't hide
 * segments behind one another. Server-safe.
 */
export function SegmentBar({
  segments,
  total: totalProp,
  formatValue = (v) => v.toLocaleString(),
  formatPercent = (f) => `${Math.round(f * 100)}%`,
  hideLegend = false,
  className,
}: SegmentBarProps) {
  const computedTotal =
    totalProp ?? segments.reduce((sum, s) => sum + s.value, 0)
  const safeTotal = computedTotal > 0 ? computedTotal : 1

  const enriched = segments.map((seg, i) => ({
    ...seg,
    fraction: seg.value / safeTotal,
    color: TONE_VAR[seg.tone ?? DEFAULT_RAMP[i % DEFAULT_RAMP.length]!],
  }))

  return (
    <figure className={cn("flex flex-col gap-3", className)}>
      <div
        role="img"
        aria-label={`Composition: ${enriched
          .map((s) => `${s.label} ${formatPercent(s.fraction)}`)
          .join(", ")}`}
        className="flex h-6 w-full overflow-hidden border border-chart-grid"
      >
        {enriched.map((seg) => (
          <div
            key={seg.key}
            style={{
              width: `${seg.fraction * 100}%`,
              background: seg.color,
            }}
            className="border-r border-card last:border-r-0"
            title={`${seg.label}: ${formatValue(seg.value)} (${formatPercent(seg.fraction)})`}
          />
        ))}
      </div>

      {!hideLegend ? (
        <ul className="grid gap-1 sm:grid-cols-2">
          {enriched.map((seg) => (
            <li
              key={seg.key}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-2.5 shrink-0"
                  style={{ background: seg.color }}
                />
                <span className="tac-tag">{seg.label}</span>
              </span>
              <span className="tac-axis tac-readout text-foreground">
                {formatPercent(seg.fraction)}
                <span className="text-chart-axis"> · {formatValue(seg.value)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  )
}
