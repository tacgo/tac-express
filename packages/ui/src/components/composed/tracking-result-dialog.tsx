"use client"

import * as React from "react"
import Link from "next/link"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@workspace/ui/components/primitives/dialog"
import { Button } from "@workspace/ui/components/button"
import { SkeletonRows } from "@workspace/ui/components/primitives/skeleton"
import { TrackingResultView } from "@workspace/ui/components/composed/tracking-result-view"
import { AwbInput } from "@workspace/ui/components/composed/awb-input"
import { Icon } from "@workspace/ui/icons"
import type { ShipmentSummary, TrackingEvent } from "@workspace/types"

/**
 * <TrackingResultDialog> — the landing hero's in-app AWB tracking surface
 * (WS-3 PR-WS-3b).
 *
 * Fetches GET /api/track/[awb] client-side and renders the result inside
 * a shadcn <Dialog> (radix handles focus-trap + Esc + return-focus). The
 * page route /track/[awb] still exists as the deep-link / SEO / share
 * surface; this dialog is the faster in-app journey.
 *
 * Four states (playbook § 6 state choreography):
 *   LOADED   — <TrackingResultView> with the shipment + events.
 *   LOADING  — SkeletonRows matching the result shape.
 *   EMPTY    — 404 from the route: not-found message + retry <AwbInput>
 *              + a "Get a quote" CTA.
 *   ERROR    — network / 5xx: message + retry button + contact-support link.
 *
 * No business logic here (LAW 6/7): the route owns validation + the
 * service call; this component only fetches + renders state.
 */

type TrackState =
  | { status: "loading" }
  | { status: "loaded"; shipment: ShipmentSummary; events: TrackingEvent[] }
  | { status: "empty"; awb: string }
  | { status: "error" }

interface TrackApiSuccess {
  ok: true
  awb: string
  shipment: ShipmentSummary
  events: TrackingEvent[]
}
interface TrackApiFailure {
  ok: false
  error: string
  awb?: string
}

interface TrackingResultDialogProps {
  /** Dialog open state — owned by the consumer (the hero). */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The AWB to look up. When non-null + open, the dialog fetches it. */
  awb: string | null
  /** Re-search from the EMPTY state — lets the consumer update `awb`. */
  onRetryAwb?: (awb: string) => void
}

function TrackingResultDialog({
  open,
  onOpenChange,
  awb,
  onRetryAwb,
}: TrackingResultDialogProps) {
  const [state, setState] = React.useState<TrackState>({ status: "loading" })
  const [retryValue, setRetryValue] = React.useState("")
  // Bumped by the ERROR-state "Try again" button to re-run the fetch for the
  // SAME awb (an effect keyed only on `awb` won't re-fire on an unchanged
  // value). The EMPTY-state re-search uses onRetryAwb instead — that's a
  // NEW awb the parent must know about for URL sync.
  const [retryNonce, setRetryNonce] = React.useState(0)

  // Fetch whenever the dialog is open with a non-null AWB. AbortController
  // cancels an in-flight request if the AWB changes or the dialog closes.
  React.useEffect(() => {
    if (!open || !awb) return
    const controller = new AbortController()
    setState({ status: "loading" })

    fetch(`/api/track/${encodeURIComponent(awb)}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as TrackApiSuccess
          setState({
            status: "loaded",
            shipment: data.shipment,
            events: data.events,
          })
          return
        }
        if (res.status === 404) {
          const data = (await res.json().catch(() => ({}))) as TrackApiFailure
          setState({ status: "empty", awb: data.awb ?? awb })
          return
        }
        // 400 / 429 / 503 / anything else → error state.
        setState({ status: "error" })
      })
      .catch((err: unknown) => {
        // AbortError is expected on cleanup — don't surface it.
        if (err instanceof DOMException && err.name === "AbortError") return
        setState({ status: "error" })
      })

    return () => controller.abort()
  }, [open, awb, retryNonce])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl overflow-y-auto"
        // Viewport-relative max-height has no Tailwind-scale token (LAW 9);
        // inline style is the documented escape hatch for vh/dvh units.
        style={{ maxHeight: "85dvh" }}
      >
        <DialogHeader>
          <DialogTitle className="font-mono tabular-nums tracking-widest uppercase">
            {awb ? `Shipment ${awb}` : "Tracking"}
          </DialogTitle>
          <DialogDescription>
            {state.status === "loaded"
              ? "Live shipment status and event history."
              : state.status === "empty"
                ? "No shipment matched that AWB."
                : state.status === "error"
                  ? "Tracking is temporarily unavailable."
                  : "Looking up your shipment…"}
          </DialogDescription>
        </DialogHeader>

        {state.status === "loading" && (
          <div className="space-y-4" data-slot="tracking-loading">
            <div className="border border-border bg-surface-elevated p-6 space-y-3">
              <SkeletonRows rows={3} />
            </div>
            <div className="border border-border bg-surface-elevated p-6">
              <SkeletonRows rows={4} />
            </div>
          </div>
        )}

        {state.status === "loaded" && (
          <TrackingResultView
            awb={awb ?? ""}
            shipment={state.shipment}
            events={state.events}
          />
        )}

        {state.status === "empty" && (
          <div
            data-slot="tracking-empty"
            className="border border-dashed border-border bg-muted/20 p-8 flex flex-col items-center text-center gap-3"
          >
            <Icon name="search" aria-hidden className="size-10 text-muted-foreground" />
            <span className="tac-mono-label text-muted-foreground">NOT FOUND</span>
            <p className="t-h4 text-foreground">
              No shipment for{" "}
              <span className="font-mono tabular-nums">{state.awb}</span>
            </p>
            <p className="t-body-sm text-foreground/85 max-w-prose">
              Check the AWB and try again. AWBs follow the format TAC + 8–11 digits.
            </p>
            <div className="w-full max-w-sm mt-2">
              <AwbInput
                id="awb-retry"
                size="default"
                value={retryValue}
                onChange={setRetryValue}
                onSubmit={(v) => {
                  if (v) onRetryAwb?.(v)
                }}
                placeholder="RE-ENTER AWB…"
              />
            </div>
            <Button asChild variant="outline" className="mt-2 rounded-none">
              <Link href="/quote">
                <Icon name="calculator" className="mr-2 w-4 h-4" />
                Get a quote instead
              </Link>
            </Button>
          </div>
        )}

        {state.status === "error" && (
          <div
            data-slot="tracking-error"
            className="border border-dashed border-accent-danger/40 bg-muted/20 p-8 flex flex-col items-center text-center gap-3"
          >
            <Icon name="warning" aria-hidden className="size-10 text-accent-danger" />
            <span className="tac-mono-label text-accent-danger">UNAVAILABLE</span>
            <p className="t-h4 text-foreground">We couldn&apos;t reach tracking.</p>
            <p className="t-body-sm text-foreground/85 max-w-prose">
              The tracking service is temporarily unavailable. Try again in a
              moment, or contact us if it persists.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <Button
                variant="default"
                className="rounded-none"
                onClick={() => setRetryNonce((n) => n + 1)}
              >
                <Icon name="refresh" className="mr-2 w-4 h-4" />
                Try again
              </Button>
              <Button asChild variant="outline" className="rounded-none">
                <Link href="/contact">
                  <Icon name="mail" className="mr-2 w-4 h-4" />
                  Contact support
                </Link>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { TrackingResultDialog }
export type { TrackingResultDialogProps }
