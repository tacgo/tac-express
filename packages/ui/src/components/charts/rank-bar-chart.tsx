import * as React from "react"
import { cn } from "../../lib/utils"
import { ChartEmptyState } from "./chart-empty-state"
import type { RankItem } from "./types"

export interface RankBarChartProps {
  items: RankItem[]
  /** Cap on rendered rows. Default 10. */
  limit?: number
  /** Highlight rank-1 with primary tone, all others muted. Default true. */
  highlightLeader?: boolean
  /** Value formatter for the right-aligned cell. */
  formatValue?: (value: number) => string
  /** Minimum items to render. Below this → empty state. Default 1. */
  minimumItems?: number
  className?: string
}

/**
 * Horizontal ranked bars with monospace rank numerals and tabular value
 * column. Replaces single-column bar charts that waste horizontal space.
 *
 * Pure HTML/CSS — no Recharts dependency. Server-safe.
 */
export function RankBarChart({
  items,
  limit = 10,
  highlightLeader = true,
  formatValue = (v) => v.toLocaleString(),
  minimumItems = 1,
  className,
}: RankBarChartProps) {
  if (items.length < minimumItems) {
    return <ChartEmptyState count={items.length} minimum={minimumItems} />
  }

  const visible = items.slice(0, limit)
  // ⚡ Bolt: Iterate for max instead of spread operator to avoid stack size limits
  let max = 1
  for (let i = 0; i < visible.length; i++) {
    if (visible[i]!.value > max) max = visible[i]!.value
  }

  return (
    <ol
      className={cn("flex flex-col divide-y divide-chart-grid", className)}
      aria-label="Ranked list"
    >
      {visible.map((item, i) => {
        const rank = String(i + 1).padStart(2, "0")
        const fraction = item.value / max
        const tone =
          highlightLeader && i === 0
            ? "var(--chart-primary)"
            : "var(--chart-primary-muted)"

        return (
          <li
            key={item.key}
            className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 py-2"
          >
            <span className="tac-axis tac-readout text-chart-axis">
              {rank}
            </span>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {item.label}
                </span>
              </div>
              <div aria-hidden className="h-1.5 w-full bg-chart-track">
                <div
                  className="h-full"
                  style={{
                    width: `${fraction * 100}%`,
                    background: tone,
                  }}
                />
              </div>
              {item.caption ? (
                <span className="tac-tag">{item.caption}</span>
              ) : null}
            </div>

            <span className="tac-axis tac-readout text-foreground text-right">
              {formatValue(item.value)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
