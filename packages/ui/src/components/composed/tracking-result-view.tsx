import * as React from "react"
import Link from "next/link"
import { cn } from "@workspace/ui/lib/utils"
import { StatusBadge } from "@workspace/ui/components/composed/dashboard/status-badge"
import { RiInboxLine, RiSearchLine } from "@workspace/ui/icons"
import type { ShipmentSummary, TrackingEvent } from "@workspace/types"

interface TrackingResultViewProps {
  awb: string
  shipment: ShipmentSummary | null
  events: TrackingEvent[]
  className?: string
}

function TrackingResultView({ awb, shipment, events, className }: TrackingResultViewProps) {
  if (!shipment) {
    return (
      <div
        data-slot="tracking-result-view"
        className={cn(
          "border border-dashed border-border bg-muted/20 p-10 flex flex-col items-center text-center gap-3 max-w-xl mx-auto",
          "animate-in fade-in-0 slide-in-from-bottom-2 duration-base",
          className
        )}
      >
        <RiSearchLine aria-hidden className="size-10 text-muted-foreground" />
        <span className="tac-mono-label text-muted-foreground">NOT FOUND</span>
        <h2 className="t-h3 text-foreground">
          {/* LB-3 / #173 — Option B redirect (not-found state): the AWB
            * echo in the NOT FOUND message used text-primary on the dashed
            * empty-state card, computing 3.99:1 on dark mode at 18px (axe
            * normal-text bucket). The error state already carries semantic
            * emphasis via the SEARCH icon + "NOT FOUND" mono label — the
            * brand-violet color was decorative, not load-bearing. The AWB
            * span inherits the parent h2's text-foreground for AA-compliant
            * contrast while keeping font-mono + tabular-nums for the
            * data-emphasis affordance. */}
          No shipment for <span className="font-mono tabular-nums">{awb}</span>
        </h2>
        {/* LB-3 / #173 — Option B redirect (track-awb empty state): the
          * helper text was text-muted-foreground (#6b6e73) on the dashed
          * bg-muted/20 container (#1d1e21), computing 3.25:1 at 13px =
          * fails AA (4.5:1). The empty-state container darkens the
          * effective bg below what muted-foreground was tuned for; lifting
          * to text-foreground/85 keeps the secondary-emphasis hierarchy
          * relative to the h2 headline while crossing the AA floor. The
          * /85 modifier is an existing Tailwind opacity utility (not a new
          * token); on dark mode foreground (oklch 0.97) the 15% mix
          * preserves contrast comfortably above 4.5:1. */}
        <p className="t-body-sm text-foreground/85 max-w-prose">
          Verify the AWB and retry. AWBs follow the format TAC + 8–11 digits.
        </p>
        <Link
          href="/track"
          className="mt-2 t-body-sm border border-border bg-background px-3 py-1.5 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:tac-focus-premium"
        >
          Track another AWB
        </Link>
      </div>
    )
  }

  return (
    <div
      data-slot="tracking-result-view"
      className={cn("space-y-4 max-w-3xl mx-auto", className)}
    >
      {/* Shipment summary card */}
      <div className="border border-border bg-surface-elevated p-6 space-y-4 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-base">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="tac-mono-label text-muted-foreground mb-1">AWB Number</p>
            {/* LB-3 / #173 — Option B redirect: the AWB headline used
              * text-primary (brand violet) on the surface-elevated card
              * background, computing 3.99:1 contrast (just below the 4.5:1
              * WCAG AA minimum for normal text — and this is 18pt, which
              * counts as normal under WCAG large-text rules). The brand
              * violet's role at this scale is "data-emphasis" — the
              * existing text-foreground token is the design's neutral
              * high-contrast pair for the elevated surface and reads as
              * "data, important, not decorative". */}
            <p className="t-h1 font-mono tabular-nums text-foreground tracking-widest">
              {shipment.awbNumber}
            </p>
          </div>
          <StatusBadge variant={shipment.status} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
          <div>
            <p className="tac-mono-label text-muted-foreground mb-1">From</p>
            <p className="font-sans text-sm text-foreground font-medium">{shipment.senderName}</p>
            <p className="tac-mono-label text-primary mt-0.5">{shipment.originHub}</p>
          </div>
          <div>
            <p className="tac-mono-label text-muted-foreground mb-1">To</p>
            <p className="font-sans text-sm text-foreground font-medium">{shipment.receiverName}</p>
            <p className="tac-mono-label text-primary mt-0.5">{shipment.destHub}</p>
          </div>
        </div>
      </div>

      {/* Tracking timeline */}
      <div className="border border-border bg-surface-elevated shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-base delay-100">
        <div className="px-6 py-3 border-b border-border">
          <p className="tac-mono-label text-muted-foreground">
            Tracking History
            <span className="ml-2 text-primary tabular-nums">{events.length} events</span>
          </p>
        </div>

        {events.length === 0 ? (
          <div className="px-6 py-12 flex flex-col items-center text-center gap-2">
            <RiInboxLine aria-hidden className="size-8 text-muted-foreground" />
            <span className="tac-mono-label text-muted-foreground">NO EVENTS</span>
            <p className="t-body-sm text-muted-foreground">
              No tracking events recorded yet. Events post within 30 seconds of scan.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {events.map((event, i) => (
              <li
                key={event.id}
                className={cn(
                  "px-6 py-4 flex gap-4",
                  "animate-in fade-in-0 slide-in-from-left-2 duration-base",
                  i === 0 && "bg-primary/5"
                )}
                style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
              >
                <div className="shrink-0 pt-0.5">
                  <span
                    aria-hidden
                    className={cn(
                      "block h-2 w-2 rounded-none mt-1.5",
                      i === 0 ? "bg-primary" : "bg-border"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge variant={event.status} />
                    {event.hubCode && (
                      <span className="tac-mono-label text-muted-foreground">
                        {event.hubCode}
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-sm text-foreground mt-1">
                    {event.description || event.location}
                  </p>
                  {event.location && event.description && (
                    <p className="t-mono-sm text-muted-foreground">{event.location}</p>
                  )}
                  <p className="t-mono-sm tabular-nums text-muted-foreground/70 pt-1">
                    {new Date(event.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

export { TrackingResultView }
export type { TrackingResultViewProps }
