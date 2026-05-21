import * as React from "react"
import { cn } from "../../lib/utils"

export interface ChartFrameProps extends React.HTMLAttributes<HTMLElement> {
  /** ALL-CAPS monospace caption shown in the header strip. */
  caption: string
  /** Optional badge slot to the right of the caption (e.g. range toggle). */
  badge?: React.ReactNode
  /** Optional footer slot rendered below the chart body. */
  footer?: React.ReactNode
  /** Chart body. */
  children: React.ReactNode
}

/**
 * Mission-control chart shell. Every chart on the dashboard is wrapped in
 * one of these so the surrounding chrome (header strip, dividers, footer)
 * is identical across the system. Server-safe.
 */
export function ChartFrame({
  caption,
  badge,
  footer,
  className,
  children,
  ...rest
}: ChartFrameProps) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col border border-chart-grid bg-card text-card-foreground",
        className,
      )}
      {...rest}
    >
      <header className="flex items-center justify-between border-b border-chart-grid px-3 py-2">
        <h3 className="tac-caption">{caption}</h3>
        {badge ? <div className="tac-tag">{badge}</div> : null}
      </header>

      <div className="min-w-0 flex-1 p-3">{children}</div>

      {footer ? (
        <footer className="border-t border-chart-grid px-3 py-2 tac-tag">
          {footer}
        </footer>
      ) : null}
    </section>
  )
}
