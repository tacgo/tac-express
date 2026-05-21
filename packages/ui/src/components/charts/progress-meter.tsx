"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "../../lib/utils"

export interface ProgressMeterProps {
  /** Current value (0–max). */
  value: number
  /** Maximum value. Default 100. */
  max?: number
  /** Optional target tick (0–max). Renders a marker on the track. */
  target?: number
  /** Number of discrete cells. Default 20. */
  segments?: number
  /** Caption shown above the readout. */
  caption: string
  /** Override formatter for the large display value. */
  formatValue?: (value: number, max: number) => string
  /** Optional sublabel shown below the track. */
  sublabel?: string
  className?: string
}

/**
 * Segmented progress meter. Replaces percentage donut rings with a
 * mission-control gauge: fixed-count discrete cells, optional target tick.
 * Stagger-fades cells on mount; respects reduced motion.
 */
export function ProgressMeter({
  value,
  max = 100,
  target,
  segments = 20,
  caption,
  formatValue = (v, m) => `${Math.round((v / m) * 100)}%`,
  sublabel,
  className,
}: ProgressMeterProps) {
  const reduce = useReducedMotion()
  const safeMax = max > 0 ? max : 1
  const fraction = Math.max(0, Math.min(1, value / safeMax))
  const filled = Math.round(fraction * segments)
  const targetFraction =
    target !== undefined ? Math.max(0, Math.min(1, target / safeMax)) : null

  return (
    <figure
      className={cn("flex flex-col gap-3", className)}
      aria-label={`${caption}: ${formatValue(value, safeMax)} of ${safeMax}`}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h4 className="tac-caption">{caption}</h4>
        {target !== undefined ? (
          <span className="tac-tag tac-readout">
            target {Math.round((target / safeMax) * 100)}%
          </span>
        ) : null}
      </header>

      <p className="tac-readout text-3xl font-medium text-foreground">
        {formatValue(value, safeMax)}
      </p>

      <div className="relative">
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={safeMax}
          className="grid h-3.5 gap-px"
          style={{
            gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: segments }, (_, i) => {
            const isFilled = i < filled
            return (
              <motion.span
                key={i}
                aria-hidden
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.12,
                  ease: "linear",
                  delay: reduce ? 0 : i * 0.012,
                }}
                className={cn(
                  "block h-full",
                  isFilled ? "bg-chart-primary" : "bg-chart-track",
                )}
              />
            )
          })}
        </div>

        {targetFraction !== null ? (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-1 -bottom-1 w-px bg-chart-axis"
            style={{ left: `${targetFraction * 100}%` }}
          />
        ) : null}
      </div>

      {sublabel ? <p className="tac-tag">{sublabel}</p> : null}
    </figure>
  )
}
