"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { RiErrorWarningLine } from "@workspace/ui/icons"
import { OpsButton } from "./ops-button"

interface OpsErrorStateProps {
  /** Error code or short identifier (e.g. "FETCH_FAILED"). All caps mono. */
  code?: string
  /** Headline (e.g. "Could not load shipments."). */
  headline: string
  /** Underlying error message — shown as mono fine print. */
  message?: string | undefined
  /** Optional retry handler — when provided renders a Retry button. */
  onRetry?: () => void
  className?: string
}

/**
 * Paper-aesthetic error state. Uses `accent-danger` left border + warning icon.
 * Pair with `role="alert" aria-live="assertive"` via the wrapping live component.
 */
function OpsErrorState({
  code = "ERROR",
  headline,
  message,
  onRetry,
  className,
}: OpsErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-slot="ops-error-state"
      className={cn(
        "border border-destructive/40 border-l-[length:var(--indicator-w)] border-l-paper-err",
        "bg-destructive/15/30 p-6",
        "grid grid-cols-12 gap-4",
        className,
      )}
    >
      <div className="col-span-1 pt-0.5">
        <RiErrorWarningLine aria-hidden className="size-6 text-destructive" />
      </div>
      <div className="col-span-11 space-y-2">
        <span className="paper-eyebrow text-destructive">{code}</span>
        <h3 className="paper-h3">{headline}</h3>
        {message && (
          <p className="font-mono text-ui-12 text-muted-foreground">
            {message}
          </p>
        )}
        {onRetry && (
          <div className="mt-2">
            <OpsButton size="sm" onClick={onRetry}>
              Retry
            </OpsButton>
          </div>
        )}
      </div>
    </div>
  )
}

export { OpsErrorState }
export type { OpsErrorStateProps }
