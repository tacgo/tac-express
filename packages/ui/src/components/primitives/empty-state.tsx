import * as React from "react"
import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

interface EmptyStateProps {
  icon?: ReactNode
  /** Contextual label above the title. Defaults to "No data". Pass null to hide. */
  eyebrow?: string | null
  title: string
  description?: string
  action?: ReactNode
  secondaryAction?: ReactNode
  className?: string
}

function EmptyState({
  icon,
  eyebrow = "No data",
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "tac-fui-panel relative flex flex-col items-center justify-center px-8 py-16 text-center",
        className,
      )}
    >
      {/* corner brackets */}
      <span aria-hidden className="pointer-events-none absolute top-2 left-2 size-3 border-t-2 border-l-2 border-primary/60" />
      <span aria-hidden className="pointer-events-none absolute top-2 right-2 size-3 border-t-2 border-r-2 border-primary/60" />
      <span aria-hidden className="pointer-events-none absolute bottom-2 left-2 size-3 border-b-2 border-l-2 border-primary/60" />
      <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 size-3 border-b-2 border-r-2 border-primary/60" />

      {icon ? (
        <div className="mb-4 flex size-12 items-center justify-center border border-border bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      {eyebrow !== null && <p className="tac-mono-label mb-1">{eyebrow}</p>}
      {/*
        Heading is <h2>, not <h3>: when EmptyState is rendered directly under
        a PageHeader's <h1> (e.g. /ops-console/audit, /ops-console/notifications
        when no records), an <h3> introduced a heading-order skip and failed
        axe (WCAG 1.3.1). h2 is the next level after the page h1 with no
        intermediate; safe for callers that don't render their own h2.
        Closes R0 audit M6.
      */}
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

export { EmptyState }
