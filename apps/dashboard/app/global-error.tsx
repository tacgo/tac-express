"use client"

/**
 * Global error boundary — catches React render-time exceptions that
 * weren't caught by a nested error.tsx, AND logs them to console.
 * Without this file, render-phase crashes show the Next.js error overlay in dev.
 *
 * Per Next.js App Router contract:
 *  - Must be a Client Component
 *  - Must render its own <html>/<body> (replaces the entire tree)
 *  - Receives the thrown error with an optional `digest` string for
 *    server-component crashes
 */

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

interface GlobalErrorProps {
  error: Error & { digest?: string }
}

export default function GlobalError({ error }: GlobalErrorProps) {
  useEffect(() => {
    // Report render-phase crashes that escaped every nested error.tsx.
    Sentry.captureException(error)
    console.error("Global boundary caught exception:", error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
          <div className="max-w-md space-y-3 text-center">
            <h1 className="font-mono text-sm tracking-widest text-destructive uppercase">
              Something went wrong
            </h1>
            <p className="font-sans text-sm text-muted-foreground">
              The dashboard hit an unexpected error and couldn&apos;t render
              this page. Our ops team has been notified — please reload and try
              again.
            </p>
            {error.digest && (
              <p className="font-mono text-2xs text-muted-foreground/70">
                Reference: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
