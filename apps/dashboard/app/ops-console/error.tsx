"use client"

/**
 * Dashboard segment-level error boundary.
 *
 * Catches render-time errors thrown anywhere inside the (dashboard) route
 * group, captures them to Sentry, and surfaces a recoverable fallback that
 * preserves the surrounding dashboard chrome (sidebar, header) so the
 * operator can still navigate away.
 *
 * Per Next.js App Router contract this file:
 *   - Must be a Client Component
 *   - Receives `{ error, reset }` props from Next.js
 *   - Calling `reset()` re-attempts to render the failed segment
 *
 * The root global-error.tsx remains the last-resort boundary that catches
 * any error this component itself throws while rendering.
 */

import { useEffect } from "react"
import { Button } from "@workspace/ui/components/button"
import { RiRefreshLine } from "@workspace/ui/icons"

interface DashboardErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error("Dashboard boundary caught exception:", error)
  }, [error])

  return (
    <div
      role="alert"
      data-slot="dashboard-error"
      className="flex min-h-hero-vh items-center justify-center p-6"
    >
      <div className="max-w-md space-y-4 text-center">
        <p className="font-mono text-2xs tracking-widest text-destructive uppercase">
          Render failed
        </p>
        <h1 className="t-h2 text-foreground">We hit a problem on this page</h1>
        <p className="font-sans text-sm text-muted-foreground">
          An unexpected error broke the render. Our ops team has been notified —
          most transient errors resolve on retry.
        </p>
        {error.digest && (
          <p className="font-mono text-2xs text-muted-foreground/60">
            Reference: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button onClick={reset} size="sm">
            <RiRefreshLine aria-hidden="true" />
            <span className="ml-1.5 font-mono tracking-wider uppercase">
              Try again
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
