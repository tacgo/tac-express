"use client"

import * as React from "react"
import { format } from "date-fns"

import { cn } from "@workspace/ui/lib/utils"
import { Card } from "@workspace/ui/components/primitives/card"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { RiPlaneLine, RiTruckLine } from "@workspace/ui/icons"

import type { ManifestSetupValue } from "./step-setup"
import type { ManifestShipmentRow } from "./step-add-shipments"

interface StepReviewProps {
  setup: ManifestSetupValue
  rows: ManifestShipmentRow[]
  /** Hub option list for resolving `fromHubId` / `toHubId` to display names. */
  hubLabels?: Record<string, string>
  className?: string
}

export function StepReview({
  setup,
  rows,
  hubLabels = {},
  className,
}: StepReviewProps) {
  const totalPieces = rows.reduce((s, r) => s + (r.pieces ?? 0), 0)
  const totalWeight = rows.reduce((s, r) => s + (r.weightKg ?? 0), 0)
  const fromLabel = hubLabels[setup.fromHubId] ?? setup.fromHubId
  const toLabel = hubLabels[setup.toHubId] ?? setup.toHubId

  return (
    <div data-slot="manifest-step-review" className={cn("grid gap-6", className)}>
      {/* Three summary cards */}
      <section className="grid gap-px bg-border/40 sm:grid-cols-3">
        <Card className="rounded-none border-0 bg-background p-4">
          <p className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
            Route
          </p>
          <p className="mt-1 font-heading text-base font-semibold">
            {fromLabel} → {toLabel}
          </p>
          <Badge variant="secondary" className="mt-2 gap-1.5 font-mono">
            {setup.type === "AIR" ? (
              <RiPlaneLine className="size-3" />
            ) : (
              <RiTruckLine className="size-3" />
            )}
            {setup.type}
          </Badge>
        </Card>

        <Card className="rounded-none border-0 bg-background p-4">
          <p className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
            Schedule
          </p>
          {setup.type === "AIR" ? (
            <>
              <p className="mt-1 font-heading text-base font-semibold">
                {setup.flightDate
                  ? format(setup.flightDate, "dd MMM yyyy")
                  : "—"}
              </p>
              <p className="mt-1 font-mono text-paper-11 uppercase tracking-widest text-muted-foreground">
                ETD {setup.etd ?? "—"} · ETA {setup.eta ?? "—"}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 font-heading text-base font-semibold">
                {setup.dispatchDate
                  ? format(setup.dispatchDate, "dd MMM yyyy")
                  : "—"}
              </p>
              <p className="mt-1 font-mono text-paper-11 uppercase tracking-widest text-muted-foreground">
                Dispatch {setup.dispatchTime ?? "—"}
              </p>
            </>
          )}
        </Card>

        <Card className="rounded-none border-0 bg-background p-4">
          <p className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
            Manifest Totals
          </p>
          <p className="mt-1 font-heading text-base font-semibold">
            {rows.length} shipments
          </p>
          <p className="mt-1 font-mono text-paper-11 uppercase tracking-widest text-muted-foreground">
            {totalPieces} pcs · {totalWeight.toFixed(1)} kg
          </p>
        </Card>
      </section>

      {/* Transport details */}
      <Card className="rounded-none p-4">
        <p className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
          Transport Details
        </p>
        {setup.type === "AIR" ? (
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
            <Detail label="Airline">{setup.airlineCode ?? "—"}</Detail>
            <Detail label="Flight No.">{setup.flightNumber ?? "—"}</Detail>
            <Detail label="ETD">{setup.etd ?? "—"}</Detail>
            <Detail label="ETA">{setup.eta ?? "—"}</Detail>
          </dl>
        ) : (
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
            <Detail label="Vehicle No.">{setup.vehicleNumber ?? "—"}</Detail>
            <Detail label="Driver">{setup.driverName ?? "—"}</Detail>
            <Detail label="Phone">{setup.driverPhone ?? "—"}</Detail>
          </dl>
        )}
      </Card>

      {/* Notes */}
      {setup.notes && (
        <Card className="rounded-none p-4">
          <p className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
            Notes
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
            {setup.notes}
          </p>
        </Card>
      )}

      {/* Ready notice */}
      <p className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
        Review the details above. Save as Open to keep editing, or Close
        Manifest to finalize and lock the loadlist.
      </p>
    </div>
  )
}

function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="font-mono text-paper-11 font-semibold">{children}</dd>
    </div>
  )
}
