"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Icon } from "@workspace/ui/icons"

/**
 * Route-level error boundary for the tracking detail page. The service now
 * degrades network failures to a "not found" state, so this is a backstop for
 * genuinely unexpected throws — it renders a branded error rather than the
 * raw Next.js crash overlay.
 */
export default function TrackError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="bg-background">
      <section className="px-6 py-24">
        <div
          role="alert"
          aria-live="assertive"
          className="mx-auto max-w-3xl border border-accent-danger/40 bg-card p-8"
        >
          <span className="tac-mono-label text-accent-danger">ERROR · TRACKING</span>
          <h1 className="t-h1 mt-2">We couldn&apos;t load that shipment.</h1>
          <p className="t-body text-muted-foreground mt-3 max-w-xl">
            The tracking service is temporarily unavailable. Try again in a moment, or start a
            new lookup.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              onClick={reset}
              className="rounded-none font-mono font-bold text-xs tracking-wordmark uppercase px-6 focus-visible:outline-none focus-visible:tac-focus-premium"
            >
              <Icon name="refresh" aria-hidden className="mr-2 w-4 h-4" />
              Try again
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-none font-mono font-bold text-xs tracking-wordmark uppercase px-6 focus-visible:outline-none focus-visible:tac-focus-premium"
            >
              <Link href="/track">
                <Icon name="scan" aria-hidden className="mr-2 w-4 h-4" />
                New lookup
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
