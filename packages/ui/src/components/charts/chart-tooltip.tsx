"use client"

import * as React from "react"
import type { TooltipContentProps } from "recharts"
import { cn } from "../../lib/utils"

interface OrbitalTooltipProps
  extends Partial<TooltipContentProps<number, string>> {
  /** Optional formatter for the displayed value. */
  formatValue?: (value: number, name: string) => string
}

/**
 * Recharts-compatible tooltip body. Plug into any chart via
 * `<Tooltip content={<OrbitalTooltip />} />`.
 *
 * Square corners, monospace, tabular numerics, two-column grid.
 * No shadow, no glass, no animation.
 */
export function OrbitalTooltip({
  active,
  payload,
  label,
  formatValue,
}: OrbitalTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div
      role="tooltip"
      className={cn(
        "min-w-32 border border-chart-grid bg-popover text-popover-foreground",
        "p-2",
      )}
    >
      {label !== undefined ? (
        <div className="tac-caption mb-1 border-b border-chart-grid pb-1">
          {String(label)}
        </div>
      ) : null}

      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        {payload.map((entry, i) => {
          const name = entry.name ?? entry.dataKey ?? "value"
          const raw = typeof entry.value === "number" ? entry.value : 0
          const display = formatValue ? formatValue(raw, String(name)) : String(raw)
          const swatchColor =
            (entry.color as string | undefined) ??
            ((entry.payload as Record<string, unknown> | undefined)?.fill as
              | string
              | undefined)

          return (
            <React.Fragment key={`${String(name)}-${i}`}>
              <dt className="tac-tag flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-2"
                  style={{ background: swatchColor ?? "var(--chart-primary)" }}
                />
                {String(name)}
              </dt>
              <dd className="tac-axis text-foreground text-right tac-readout">
                {display}
              </dd>
            </React.Fragment>
          )
        })}
      </dl>
    </div>
  )
}
