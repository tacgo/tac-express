"use client"

import * as React from "react"
import Link from "next/link"

import {
  useShipment,
  useTrackingEvents,
} from "@workspace/services/hooks/use-shipments"
import {
  RiPrinterLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiTimeLine,
  RiBookOpenLine,
  RiArchiveLine,
  RiHistoryLine,
} from "@workspace/ui/icons"
import {
  OpsDetailFrame,
  OpsBadge,
  OpsButton,
  OpsCard,
  OpsTimeline,
  OpsSkeleton,
  OpsShipmentStepper,
  OpsEmptyState,
  OpsPanelTabs,
  OpsPanelTabsList,
  OpsPanelTabsTrigger,
  OpsPanelTabsContent,
  type TimelineEvent,
} from "@workspace/ui/components/composed/ops-console"
import { UniversalBarcode } from "@workspace/ui/components/primitives/universal-barcode"

function statusTone(status: string) {
  if (status === "DELIVERED") return "ok" as const
  if (status.includes("EXCEPTION") || status === "RTO" || status === "CANCELLED")
    return "err" as const
  if (status === "IN_TRANSIT" || status.startsWith("OUT_FOR")) return "warn" as const
  return "violet" as const
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
      <OpsDetailFrame
        eyebrow="Shipment"
        title="…"
        backHref="/ops-console/shipments"
      >
        <div className="space-y-3">
          <OpsSkeleton className="h-4 w-2/3" />
          <OpsSkeleton className="h-4 w-1/2" />
          <OpsSkeleton className="h-32 w-full" />
        </div>
      </OpsDetailFrame>
    )
  }

  if (shipmentQuery.isError || !shipment) {
    return (
      <OpsDetailFrame
        eyebrow="Shipment"
        title={id}
        backHref="/ops-console/shipments"
      >
        <div className="border border-destructive/40 border-l-[length:var(--indicator-w)] border-l-paper-err bg-destructive/15/30 p-6 flex items-start gap-3">
          <RiErrorWarningLine aria-hidden className="size-5 text-destructive shrink-0" />
          <div>
            <div className="paper-eyebrow text-destructive">NOT FOUND</div>
            <p className="font-sans text-ui-13 mt-1">
              Could not load shipment <span className="font-mono">{id}</span>.
            </p>
          </div>
        </div>
      </OpsDetailFrame>
    )
  }

  const totalAmount = shipment.financials?.totalAmount ?? 0
  const chargeable = shipment.weight?.chargeable ?? 0

  const timeline: TimelineEvent[] = events.map((e, i) => ({
    id: e.id,
    label: e.status,
    timestamp: fmtTime(e.createdAt),
    detail: e.description ?? e.location ?? undefined,
    tone: i === 0 ? "violet" : "neutral",
  }))

  return (
    <OpsDetailFrame
      eyebrow="Shipment · AWB"
      title={shipment.awbNumber}
      sub={`${shipment.originHub.replace(/_/g, " ")} → ${shipment.destHub.replace(/_/g, " ")} · ${chargeable.toFixed(1)}kg · ${shipment.serviceLevel}`}
      backHref="/ops-console/shipments"
      status={
        <OpsBadge tone={statusTone(shipment.status)}>{shipment.status}</OpsBadge>
      }
      actions={
        <OpsButton asChild size="sm">
          <Link
            href={`/print/label/${shipment.awbNumber}`}
            target="_blank"
            rel="noopener"
          >
            <RiPrinterLine aria-hidden className="size-3" />
            Print Label
          </Link>
        </OpsButton>
      }
      aside={
        <>
          <OpsCard ticks>
            <div className="paper-label">Pieces</div>
            <div className="paper-stat-value mt-1">{shipment.pieces ?? 1}</div>
          </OpsCard>
          <OpsCard ticks>
            <div className="paper-label">Total</div>
            <div className="paper-stat-value mt-1">
              ₹{totalAmount.toLocaleString("en-IN")}
            </div>
          </OpsCard>
          <OpsCard>
            <div className="paper-label mb-1">Service</div>
            <div className="font-mono text-ui-13 tabular-nums">
              {shipment.serviceLevel} · {shipment.paymentMode}
            </div>
            <div className="paper-label mb-1 mt-3">Estimated Delivery</div>
            <div className="font-mono text-ui-13 tabular-nums">
              {computeEta({
                status: shipment.status,
                createdAt: shipment.createdAt,
                serviceLevel: shipment.serviceLevel,
              })}
            </div>
            <div className="paper-label mb-1 mt-3">Created</div>
            <div className="font-mono text-ui-13 tabular-nums">
              {fmtTime(shipment.createdAt)}
            </div>
            {shipment.manifestNumber && (
              <>
                <div className="paper-label mb-1 mt-3">Manifest</div>
                <Link
                  href={`/manifests/${shipment.manifestId}`}
                  className="paper-id hover:underline focus-visible:outline-none focus-visible:tac-focus-premium"
                >
                  {shipment.manifestNumber}
                </Link>
              </>
            )}
          </OpsCard>
        </>
      }
    >
      {/* Status stepper */}
      <OpsCard ticks>
        <div className="paper-label mb-3">Shipment Status</div>
        <OpsShipmentStepper currentStatus={shipment.status} />
      </OpsCard>

      {/* Barcode */}
      <OpsCard ticks className="flex flex-col items-center gap-3">
        <div className="paper-label">AWB Barcode</div>
        <UniversalBarcode value={shipment.awbNumber} mode="screen" />
      </OpsCard>

      {/* Tabs — overview / tracking / notes / files / audit */}
      <OpsPanelTabs defaultValue="overview">
        <OpsPanelTabsList>
          <OpsPanelTabsTrigger value="overview">
            <RiInformationLine />
            Overview
          </OpsPanelTabsTrigger>
          <OpsPanelTabsTrigger value="tracking">
            <RiTimeLine />
            Tracking
          </OpsPanelTabsTrigger>
          <OpsPanelTabsTrigger value="notes">
            <RiBookOpenLine />
            Notes
          </OpsPanelTabsTrigger>
          <OpsPanelTabsTrigger value="files">
            <RiArchiveLine />
            Files
          </OpsPanelTabsTrigger>
          <OpsPanelTabsTrigger value="audit">
            <RiHistoryLine />
            Audit
          </OpsPanelTabsTrigger>
        </OpsPanelTabsList>

        {/* OVERVIEW */}
        <OpsPanelTabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OpsCard ticks>
              <div className="paper-label mb-2">Sender</div>
              <div className="font-sans font-semibold text-ui-14">
                {shipment.sender?.name}
              </div>
              <div className="font-mono text-ui-12 text-muted-foreground mt-1">
                {shipment.sender?.phone}
              </div>
              {shipment.sender?.email && (
                <div className="font-mono text-ui-12 text-muted-foreground">
                  {shipment.sender.email}
                </div>
              )}
              {shipment.sender?.address && (
                <div className="font-sans text-ui-13 text-foreground mt-2">
                  {shipment.sender.address.line1}
                  {shipment.sender.address.line2
                    ? `, ${shipment.sender.address.line2}`
                    : ""}
                  , {shipment.sender.address.city},{" "}
                  {shipment.sender.address.state} - {shipment.sender.address.zip}
                </div>
              )}
            </OpsCard>
            <OpsCard ticks>
              <div className="paper-label mb-2">Receiver</div>
              <div className="font-sans font-semibold text-ui-14">
                {shipment.receiver?.name}
              </div>
              <div className="font-mono text-ui-12 text-muted-foreground mt-1">
                {shipment.receiver?.phone}
              </div>
              {shipment.receiver?.email && (
                <div className="font-mono text-ui-12 text-muted-foreground">
                  {shipment.receiver.email}
                </div>
              )}
              {shipment.receiver?.address && (
                <div className="font-sans text-ui-13 text-foreground mt-2">
                  {shipment.receiver.address.line1}
                  {shipment.receiver.address.line2
                    ? `, ${shipment.receiver.address.line2}`
                    : ""}
                  , {shipment.receiver.address.city},{" "}
                  {shipment.receiver.address.state} -{" "}
                  {shipment.receiver.address.zip}
                </div>
              )}
            </OpsCard>
          </div>

          {/* Weight + financials */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <OpsCard>
              <div className="paper-label">Dead Wt</div>
              <div className="font-sans font-bold text-ui-18 mt-1 tabular-nums">
                {shipment.weight?.dead?.toFixed(1) ?? "—"} kg
              </div>
            </OpsCard>
            <OpsCard>
              <div className="paper-label">Volumetric</div>
              <div className="font-sans font-bold text-ui-18 mt-1 tabular-nums">
                {shipment.weight?.volumetric?.toFixed(1) ?? "—"} kg
              </div>
            </OpsCard>
            <OpsCard accent="violet-under">
              <div className="paper-label">Chargeable</div>
              <div className="font-sans font-bold text-ui-18 mt-1 tabular-nums">
                {chargeable.toFixed(1)} kg
              </div>
            </OpsCard>
            <OpsCard accent="violet-under">
              <div className="paper-label">Total</div>
              <div className="font-sans font-bold text-ui-18 mt-1 tabular-nums">
                ₹{totalAmount.toLocaleString("en-IN")}
              </div>
            </OpsCard>
          </div>

          {/* Description */}
          {shipment.description && (
            <OpsCard ticks className="mt-4">
              <div className="paper-label mb-2">Contents</div>
              <p className="font-sans text-ui-13">
                {shipment.description}
              </p>
            </OpsCard>
          )}
        </OpsPanelTabsContent>

        {/* TRACKING */}
        <OpsPanelTabsContent value="tracking">
          <OpsCard ticks>
            <div className="paper-label mb-3">Tracking History</div>
            {eventsQuery.isPending ? (
              <div className="space-y-3">
                <OpsSkeleton className="h-3 w-1/2" />
                <OpsSkeleton className="h-3 w-1/3" />
                <OpsSkeleton className="h-3 w-2/3" />
              </div>
            ) : timeline.length === 0 ? (
              <OpsEmptyState
                eyebrow="NO EVENTS"
                headline="No tracking events yet."
                description="Events post within 30 seconds of scan. Check back after the next hub touchpoint."
              />
            ) : (
              <OpsTimeline events={timeline} />
            )}
          </OpsCard>
        </OpsPanelTabsContent>

        {/* NOTES — wired to v6 ShipmentNotesTab (TipTap) */}
        <OpsPanelTabsContent value="notes">
          <OpsCard ticks>
            <div className="paper-label mb-3">Notes</div>
            <ShipmentNotesPanel shipmentId={shipment.id} />
          </OpsCard>
        </OpsPanelTabsContent>

        {/* FILES — placeholder until POD attachments wired */}
        <OpsPanelTabsContent value="files">
          <OpsCard ticks>
            <OpsEmptyState
              eyebrow="ATTACHMENTS"
              headline="POD & packing list uploads"
              description="The attachments panel ships in the next phase of the dispatch rollout. Until then, attachments are accessible via the v6 detail page."
              cta={
                <OpsButton asChild size="sm">
                  <Link href={`/shipments/${shipment.id}`}>
                    Open v6 detail
                  </Link>
                </OpsButton>
              }
            />
          </OpsCard>
        </OpsPanelTabsContent>

        {/* AUDIT */}
        <OpsPanelTabsContent value="audit">
          <OpsCard ticks>
            <div className="paper-label mb-3">Audit Trail</div>
            <ShipmentAuditPanel shipmentId={shipment.id} />
          </OpsCard>
        </OpsPanelTabsContent>
      </OpsPanelTabs>
    </OpsDetailFrame>
  )
}

// ── Dynamic sub-panels (notes + audit) ────────────────────────────────────
// Lazy-imported so the entry page bundle stays small. The notes tab uses
// the v6 ShipmentNotesTab component (TipTap thread) — same data path as
// the v6 detail page; rendering chrome is paper here.

const ShipmentNotesPanel = React.lazy(() =>
  import("./notes-tab").then((m) => ({
    default: function NotesProxy({ shipmentId }: { shipmentId: string }) {
      return <m.ShipmentNotesTab shipmentId={shipmentId} />
    },
  })),
)

function ShipmentAuditPanel({ shipmentId }: { shipmentId: string }) {
  // Future: wire useAuditLogs({ entityType: "SHIPMENT", entityId: shipmentId }).
  // For now mirror the v6 placeholder rather than fabricate data — operators
  // can pivot to the v6 detail page until the audit panel ships.
  return (
    <OpsEmptyState
      eyebrow="AUDIT"
      headline="Actor / action / timestamp feed"
      description="The audit trail panel lights up in a later phase. Until then, audit history is reachable from the v6 detail page."
      cta={
        <OpsButton asChild size="sm">
          <Link href={`/shipments/${shipmentId}`}>Open v6 detail</Link>
        </OpsButton>
      }
    />
  )
}
