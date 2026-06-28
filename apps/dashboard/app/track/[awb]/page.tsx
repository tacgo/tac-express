import type { Metadata } from "next"
import Link from "next/link"
import { format, parseISO, addDays } from "date-fns"

import { createPublicTrackingService } from "@workspace/services/public-tracking.service"
import { ShipmentStatusBadge } from "@workspace/ui/components/composed/shipments/shipment-status-badge"
import { ShipmentStepper } from "@workspace/ui/components/composed/shipments/shipment-stepper"
import { UniversalBarcode } from "@workspace/ui/components/primitives/universal-barcode"
import {
  RiArrowRightLine,
  RiPlaneLine,
  RiTruckLine,
  RiBox3Line,
} from "@workspace/ui/icons"

export const dynamic = "force-dynamic"

const AIR_SERVICE_PATTERN = /express|priority/i

interface PageProps {
  params: Promise<{ awb: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { awb } = await params
  return {
    title: `Track ${awb} · TAC Express`,
    description: `Live status for shipment ${awb}.`,
    robots: { index: false },
  }
}

export default async function PublicTrackingPage({ params }: PageProps) {
  const { awb } = await params
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return <NotFound awb={awb} reason="Tracking is currently unavailable." />
  }

  const tracking = createPublicTrackingService({ supabaseUrl, anonKey })
  const [shipment, events] = await Promise.all([
    tracking.getShipmentByAwb(awb).catch(() => null),
    tracking.getTrackingEvents(awb).catch(() => []),
  ])

  if (!shipment) {
    return <NotFound awb={awb} reason="No shipment found for this CN." />
  }

  // PII-stripping: public tracking exposes ONLY route + status + timeline.
  // Sender/receiver names + addresses + phone are intentionally removed
  // before render to prevent leaking PII. Phase 6.5 will switch the
  // service to query the `public_shipment_tracking` view instead.
  const isAirService = AIR_SERVICE_PATTERN.test(shipment.serviceLevel ?? "")
  const ModeIcon = isAirService ? RiPlaneLine : RiTruckLine

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="font-mono text-ui-10 tracking-widest text-muted-foreground uppercase">
            CN Number
          </p>
          <h1 className="mt-1 font-mono text-2xl font-bold tracking-widest">
            {shipment.awbNumber}
          </h1>
        </div>
        <ShipmentStatusBadge status={shipment.status} />
      </header>

      <section className="space-y-4 border border-border bg-card p-4">
        <div className="flex items-center justify-center gap-3">
          <RouteEndpoint code={shipment.originHub} label="Origin" />
          <ModeIcon className="size-5 text-primary" />
          <RouteEndpoint code={shipment.destHub} label="Destination" />
        </div>
        <div className="flex justify-center">
          <UniversalBarcode value={shipment.awbNumber} mode="screen" />
        </div>
        <ShipmentStepper currentStatus={shipment.status} />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Pieces" value={String(shipment.pieces ?? 1)} />
        <Stat
          label="Weight"
          value={`${(shipment.chargeableWeight ?? 0).toFixed(1)} kg`}
        />
        <Stat label="Mode" value={isAirService ? "Air" : "Surface"} />
        <Stat label="Created" value={fmtDate(shipment.createdAt)} />
        <Stat label="ETA" value={computeEta(shipment)} />
      </section>

      <section className="space-y-3 border border-border bg-card p-4">
        <p className="font-mono text-ui-10 tracking-widest text-muted-foreground uppercase">
          Tracking history
        </p>
        {events.length === 0 ? (
          <p className="font-mono text-ui-10 tracking-widest text-muted-foreground uppercase">
            No tracking events yet — your shipment is being prepared.
          </p>
        ) : (
          <ol className="relative ml-2 space-y-3 border-l border-border pl-4">
            {events.map((e, i) => (
              <li key={e.id ?? `${e.createdAt}-${i}`} className="space-y-0.5">
                <span
                  className="absolute mt-1 block size-2 bg-primary"
                  style={{ left: "-5px" }}
                />
                <p className="font-mono text-ui-11 font-semibold tracking-widest uppercase">
                  {e.status}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.location ?? e.hubCode ?? "—"}
                </p>
                <p className="font-mono text-ui-10 tracking-widest text-muted-foreground uppercase">
                  {fmtDateTime(e.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="border border-border bg-muted/30 p-4">
        <p className="font-mono text-ui-10 tracking-widest text-muted-foreground uppercase">
          Need help?
        </p>
        <p className="mt-1 text-sm">
          Contact our operations team and quote your CN number{" "}
          <span className="font-mono font-semibold">{shipment.awbNumber}</span>.
          We never share sender or receiver details on this page — for full
          shipment details, please sign in.
        </p>
      </section>
    </div>
  )
}

function NotFound({ awb, reason }: { awb: string; reason: string }) {
  return (
    <div className="space-y-4 border border-dashed border-border bg-card p-8 text-center">
      <RiBox3Line className="mx-auto size-8 text-muted-foreground" />
      <div>
        <p className="font-mono text-ui-10 tracking-widest text-muted-foreground uppercase">
          Tracking · {awb}
        </p>
        <p className="mt-1 font-heading text-base font-semibold">
          We couldn&apos;t find that shipment.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
      </div>
      <Link
        href="/track"
        className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 font-mono text-ui-11 tracking-widest text-foreground uppercase transition-colors hover:border-primary hover:text-primary"
      >
        Try another CN
        <RiArrowRightLine className="size-3.5" />
      </Link>
    </div>
  )
}

function RouteEndpoint({ code, label }: { code: string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-mono text-ui-10 tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className="font-heading text-xl font-semibold tracking-tight">
        {code.replace(/_/g, " ")}
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-card p-3">
      <p className="font-mono text-ui-10 tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}

function fmtDate(iso: string) {
  try {
    return format(parseISO(iso), "dd MMM yyyy")
  } catch {
    return iso
  }
}

/**
 * Compute Estimated Delivery date from a public ShipmentSummary.
 *
 *   PRIORITY / EXPRESS  → +1 business day from createdAt
 *   STANDARD / default  → +3 business days from createdAt
 *
 * Terminal states (DELIVERED, CANCELLED, RTO) get a static label instead of a
 * forward-looking ETA. This is a best-effort estimate — once the back-end
 * exposes a real `estimated_delivery` column this helper can read from it.
 */
function computeEta(shipment: {
  status?: string
  createdAt?: string
  serviceLevel?: string
}): string {
  const terminal = ["DELIVERED", "CANCELLED", "RTO"]
  if (shipment.status && terminal.includes(shipment.status)) {
    return shipment.status === "DELIVERED" ? "Delivered" : "—"
  }
  if (!shipment.createdAt) return "—"
  const sla = AIR_SERVICE_PATTERN.test(shipment.serviceLevel ?? "") ? 1 : 3
  try {
    return format(addDays(parseISO(shipment.createdAt), sla), "dd MMM")
  } catch {
    return "—"
  }
}

function fmtDateTime(iso: string) {
  try {
    return format(parseISO(iso), "dd MMM yyyy · HH:mm")
  } catch {
    return iso
  }
}
