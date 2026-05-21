"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

/**
 * DataTableCard — Violet-Grid v7 frame around a list-table surface.
 *
 * Wraps the existing `DataTable` (or any list content) in a v7 Card
 * vocabulary (sharp corners, brutalist offset shadow, card-pad spacing).
 * Provides an optional header row with title + actions (typically a
 * "+ New …" CTA) and an optional footer row for pagination or aggregates.
 *
 * The data table itself remains a separate primitive — DataTableCard is
 * presentational; sorting / filtering / search / pagination state stays
 * inside the inner `DataTable`. This keeps the v6 and v7 list surfaces
 * able to share the same column definitions and only swap the chrome.
 *
 * Phase 3a of the NextAdmin refactor. Used by the v7 list surfaces
 * (Customers, Shipments, Manifests, Rate Cards, Invoices).
 */

const dataTableCardVariants = cva(
  "flex flex-col gap-3 border border-border bg-card text-card-foreground p-card-pad shadow-brutal-sm"
)

interface DataTableCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title">,
    VariantProps<typeof dataTableCardVariants> {
  /** Card title shown in the header row, left-aligned. */
  title?: React.ReactNode
  /** Subtitle shown beneath the title (e.g., total-row count). */
  subtitle?: React.ReactNode
  /** Right-aligned slot in the header row (e.g., "+ New Customer" button). */
  actions?: React.ReactNode
  /** Optional footer slot — pagination, aggregates, or hint text. */
  footer?: React.ReactNode
  /**
   * `aria-labelledby` target for the inner region. When `title` is
   * provided, the auto-generated ID is wired here for screen-reader
   * association. Override only if the caller needs to label the table
   * with an external element.
   */
  ariaLabelledBy?: string
}

function DataTableCard({
  className,
  title,
  subtitle,
  actions,
  footer,
  ariaLabelledBy,
  children,
  ...props
}: DataTableCardProps) {
  const reactId = React.useId()
  const labelledBy = ariaLabelledBy ?? (title ? `${reactId}-title` : undefined)

  return (
    <section
      data-slot="data-table-card"
      aria-labelledby={labelledBy}
      className={cn(dataTableCardVariants(), className)}
      {...props}
    >
      {(title || subtitle || actions) && (
        <header
          data-slot="data-table-card-header"
          className="flex flex-wrap items-baseline justify-between gap-3"
        >
          <div className="min-w-0 flex flex-col gap-0.5">
            {title ? (
              <h2
                id={labelledBy}
                className="t-overline text-muted-foreground"
              >
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="t-caption text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {actions ? (
            <div
              data-slot="data-table-card-actions"
              className="flex items-center gap-2 shrink-0"
            >
              {actions}
            </div>
          ) : null}
        </header>
      )}

      <div data-slot="data-table-card-body" className="min-w-0">
        {children}
      </div>

      {footer ? (
        <footer
          data-slot="data-table-card-footer"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"
        >
          {footer}
        </footer>
      ) : null}
    </section>
  )
}

export { DataTableCard, dataTableCardVariants }
export type { DataTableCardProps }
