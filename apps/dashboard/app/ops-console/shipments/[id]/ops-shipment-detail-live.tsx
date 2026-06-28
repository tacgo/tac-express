"use client"

import * as React from "react"
import Link from "next/link"

import {
  useShipment,
  useTrackingEvents,
} from "@workspace/services/hooks/use-shipments"
import { ShipmentStatus } from "@workspace/types"
import { RiPrinterLine, RiErrorWarningLine } from "@workspace/ui/icons"
import { cn } from "@workspace/ui/lib/utils"
import {
  DetailShell,
  FIELD_LABEL,
  STATUS_TONE_CLASS,
} from "@workspace/ui/components/composed/detail-shell"
import { SurfaceCard } from "@workspace/ui/components/composed/surface-card"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/primitives/skeleton"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import { UniversalBarcode } from "@workspace/ui/components/primitives/universal-barcode"
import { ShipmentStepper } from "@workspace/ui/components/composed/shipments/shipment-stepper"
import { TrackingTimeline } from "@workspace/ui/components/composed/shipments/tracking-timeline"
import { ShipmentDetailTabs } from "@workspace/ui/components/composed/shipments/shipment-detail-tabs"

/**
 * Violet Grid v7 shipment detail (Phase 10c in-place re-tokenize). Wires the
 * pre-built v7 detail components — ShipmentStepper (already live on the public
 * /track page), TrackingTimeline, ShipmentDetailTabs — and re-tokenizes the
 * remaining paper chrome (OpsDetailFrame → DetailShell, OpsCard → SurfaceCard,
 * OpsBadge → Badge, OpsButton → Button, OpsSkeleton → Skeleton, OpsEmptyState →
 * EmptyState). Files + Audit tabs use ShipmentDetailTabs' built-in ComingSoon
 * (the v6 "open v6 detail" link is dropped — that page is retired). No
 * services, hooks, or data paths changed.
 */

function statusTone(
  status: string
): "neutral" | "ok" | "warn" | "err" | "violet" {
  if (status === "DELIVERED") return "ok"
  if (
    status.includes("EXCEPTION") ||
    status === "RTO" ||
    status === "CANCELLED"
  )
    return "err"
  if (status === "IN_TRANSIT" || status.startsWith("OUT_FOR")) return "warn"
  return "violet"
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Compute Estimated Delivery date from a shipment.
 *   PRIORITY / EXPRESS → +1 business day from createdAt
 *   STANDARD / default → +3 business days from createdAt
 * Terminal states (DELIVERED, CANCELLED, RTO) get a static label.
 */
function computeEta(s: {
  status?: string
  createdAt?: string
  serviceLevel?: string
}): string {
  const terminal = ["DELIVERED", "CANCELLED", "RTO"]
  if (s.status && terminal.includes(s.status)) {
    return s.status === "DELIVERED" ? "Delivered" : "—"
  }
  if (!s.createdAt) return "—"
  const sla = /priority|express/i.test(s.serviceLevel ?? "") ? 1 : 3
  try {
    const d = new Date(s.createdAt)
    d.setDate(d.getDate() + sla)
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

interface Props {
  id: string
}

export function OpsShipmentDetailLive({ id }: Props) {
  const shipmentQuery = useShipment(id)
  const shipment = shipmentQuery.data
  const eventsQuery = useTrackingEvents(shipment?.awbNumber ?? "")
  const events = eventsQuery.data ?? []

  if (shipmentQuery.isPending) {
    return (
      <DetailShell
        eyebrow="Shipment"
        title="…"
        backHref="/ops-console/shipments"
      >
        <div className="space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DetailShell>
    )
  }

  if (shipmentQuery.isError || !shipment) {
    return (
      <DetailShell
        eyebrow="Shipment"
        title={id}
        backHref="/ops-console/shipments"
      >
        <div className="flex items-start gap-3 border border-l-[length:var(--indicator-w)] border-destructive/40 border-l-destructive bg-destructive/15 p-6">
          <RiErrorWarningLine
            aria-hidden
            className="size-5 shrink-0 text-destructive"
          />
          <div>
            <div className="font-mono text-2xs tracking-widest text-destructive uppercase">
              NOT FOUND
            </div>
            <p className="t-body-sm mt-1">
              Could not load shipment <span className="font-mono">{id}</span>.
            </p>
          </div>
        </div>
      </DetailShell>
    )
  }

  const totalAmount = shipment.financials?.totalAmount ?? 0
  const chargeable = shipment.weight?.chargeable ?? 0

  const overview = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SurfaceCard>
          <div className={cn(FIELD_LABEL, "mb-2")}>Sender</div>
          <div className="t-body-sm font-semibold text-foreground">
            {shipment.sender?.name}
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            {shipment.sender?.phone}
          </div>
          {shipment.sender?.email && (
            <div className="font-mono text-xs text-muted-foreground">
              {shipment.sender.email}
            </div>
          )}
          {shipment.sender?.address && (
            <div className="t-body-sm mt-2 text-foreground">
              {shipment.sender.address.line1}
              {shipment.sender.address.line2
                ? `, ${shipment.sender.address.line2}`
                : ""}
              , {shipment.sender.address.city}, {shipment.sender.address.state}{" "}
              - {shipment.sender.address.zip}
            </div>
          )}
        </SurfaceCard>
        <SurfaceCard>
          <div className={cn(FIELD_LABEL, "mb-2")}>Receiver</div>
          <div className="t-body-sm font-semibold text-foreground">
            {shipment.receiver?.name}
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            {shipment.receiver?.phone}
          </div>
          {shipment.receiver?.email && (
            <div className="font-mono text-xs text-muted-foreground">
              {shipment.receiver.email}
            </div>
          )}
          {shipment.receiver?.address && (
            <div className="t-body-sm mt-2 text-foreground">
              {shipment.receiver.address.line1}
              {shipment.receiver.address.line2
                ? `, ${shipment.receiver.address.line2}`
                : ""}
              , {shipment.receiver.address.city},{" "}
              {shipment.receiver.address.state} -{" "}
              {shipment.receiver.address.zip}
            </div>
          )}
        </SurfaceCard>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SurfaceCard density="compact">
          <div className={FIELD_LABEL}>Dead Wt</div>
          <div className="mt-1 font-sans text-lg font-bold tabular-nums">
            {shipment.weight?.dead?.toFixed(1) ?? "—"} kg
          </div>
        </SurfaceCard>
        <SurfaceCard density="compact">
          <div className={FIELD_LABEL}>Volumetric</div>
          <div className="mt-1 font-sans text-lg font-bold tabular-nums">
            {shipment.weight?.volumetric?.toFixed(1) ?? "—"} kg
          </div>
        </SurfaceCard>
        <SurfaceCard density="compact" className="border-t-2 border-t-primary">
          <div className={FIELD_LABEL}>Chargeable</div>
          <div className="mt-1 font-sans text-lg font-bold tabular-nums">
            {chargeable.toFixed(1)} kg
          </div>
        </SurfaceCard>
        <SurfaceCard density="compact" className="border-t-2 border-t-primary">
          <div className={FIELD_LABEL}>Total</div>
          <div className="mt-1 font-sans text-lg font-bold tabular-nums">
            ₹{totalAmount.toLocaleString("en-IN")}
          </div>
        </SurfaceCard>
      </div>

      {shipment.description && (
        <SurfaceCard>
          <div className={cn(FIELD_LABEL, "mb-2")}>Contents</div>
          <p className="t-body-sm">{shipment.description}</p>
        </SurfaceCard>
      )}
    </div>
  )

  const tracking = (
    <SurfaceCard>
      <div className={cn(FIELD_LABEL, "mb-3")}>Tracking History</div>
      {eventsQuery.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="No tracking events yet"
          description="Events post within 30 seconds of scan. Check back after the next hub touchpoint."
        />
      ) : (
        <TrackingTimeline events={events} />
      )}
    </SurfaceCard>
  )

  const notes = (
    <SurfaceCard>
      <div className={cn(FIELD_LABEL, "mb-3")}>Notes</div>
      <ShipmentNotesPanel shipmentId={shipment.id} />
    </SurfaceCard>
  )

  return (
    <DetailShell
      eyebrow="Shipment · AWB"
      title={shipment.awbNumber}
      sub={`${shipment.originHub.replace(/_/g, " ")} → ${shipment.destHub.replace(/_/g, " ")} · ${chargeable.toFixed(1)}kg · ${shipment.serviceLevel}`}
      backHref="/ops-console/shipments"
      status={
        <Badge
          variant="outline"
          className={cn(
            "font-mono tracking-tag uppercase",
            STATUS_TONE_CLASS[statusTone(shipment.status)]
          )}
        >
          {shipment.status}
        </Badge>
      }
      actions={
        <Button asChild size="sm">
          <Link
            href={`/print/label/${shipment.awbNumber}`}
            target="_blank"
            rel="noopener"
          >
            <RiPrinterLine aria-hidden className="size-3" />
            Print Label
          </Link>
        </Button>
      }
      aside={
        <>
          <SurfaceCard density="compact">
            <div className={FIELD_LABEL}>Pieces</div>
            <div className="t-data-md mt-1 text-foreground">
              {shipment.pieces ?? 1}
            </div>
          </SurfaceCard>
          <SurfaceCard density="compact">
            <div className={FIELD_LABEL}>Total</div>
            <div className="t-data-md mt-1 text-foreground">
              ₹{totalAmount.toLocaleString("en-IN")}
            </div>
          </SurfaceCard>
          <SurfaceCard density="compact">
            <div className={cn(FIELD_LABEL, "mb-1")}>Service</div>
            <div className="t-mono">
              {shipment.serviceLevel} · {shipment.paymentMode}
            </div>
            <div className={cn(FIELD_LABEL, "mt-3 mb-1")}>
              Estimated Delivery
            </div>
            <div className="t-mono">
              {computeEta({
                status: shipment.status,
                createdAt: shipment.createdAt,
                serviceLevel: shipment.serviceLevel,
              })}
            </div>
            <div className={cn(FIELD_LABEL, "mt-3 mb-1")}>Created</div>
            <div className="t-mono">{fmtTime(shipment.createdAt)}</div>
            {shipment.manifestNumber && (
              <>
                <div className={cn(FIELD_LABEL, "mt-3 mb-1")}>Manifest</div>
                <Link
                  href={`/manifests/${shipment.manifestId}`}
                  className="t-mono focus-visible:tac-focus-premium text-primary hover:underline focus-visible:outline-none"
                >
                  {shipment.manifestNumber}
                </Link>
              </>
            )}
          </SurfaceCard>
        </>
      }
    >
      {/* Status stepper */}
      <SurfaceCard>
        <div className={cn(FIELD_LABEL, "mb-3")}>Shipment Status</div>
        <ShipmentStepper currentStatus={shipment.status as ShipmentStatus} />
      </SurfaceCard>

      {/* Barcode */}
      <SurfaceCard className="flex flex-col items-center gap-3">
        <div className={FIELD_LABEL}>AWB Barcode</div>
        <UniversalBarcode value={shipment.awbNumber} mode="screen" />
      </SurfaceCard>

      {/* Tabs — overview / tracking / notes / files / audit. Files + Audit
          fall through to ShipmentDetailTabs' built-in ComingSoon. */}
      <ShipmentDetailTabs
        overview={overview}
        tracking={tracking}
        notes={notes}
      />
    </DetailShell>
  )
}

// ── Notes sub-panel ────────────────────────────────────────────────────────
// Lazy-imported so the entry page bundle stays small. Uses the v6
// ShipmentNotesTab component (TipTap thread) — same data path as before.
const ShipmentNotesPanel = React.lazy(() =>
  import("./notes-tab").then((m) => ({
    default: function NotesProxy({ shipmentId }: { shipmentId: string }) {
      return <m.ShipmentNotesTab shipmentId={shipmentId} />
    },
  }))
)
