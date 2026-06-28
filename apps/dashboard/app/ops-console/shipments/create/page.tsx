import type { Metadata } from "next"

import { WorkflowShell } from "@workspace/ui/components/composed/ops-console"

import { OpsCreateShipmentLive } from "./ops-create-shipment-live"

export const metadata: Metadata = {
  title: "New Shipment — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

// h1 required: CreateShipmentForm step indicator is not an <h1>,
// so the inline header below satisfies WCAG 2.4.6 / 1.3.1. See R0.1 audit findings.
// WorkflowShell bounds the whole flow at 1120px, centered — stepper + form
// share one width instead of the stepper stretching.
export default function OpsCreateShipmentPage() {
  return (
    <WorkflowShell>
      <header className="border-b border-border pb-4">
        <p className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
          Operations
        </p>
        <h1 className="mt-0.5 font-sans text-2xl font-bold text-foreground">
          New Shipment
        </h1>
        <p className="t-body-sm mt-1 text-muted-foreground">
          Capture sender + receiver + parcel details. AWB is generated
          server-side on commit.
        </p>
      </header>
      <OpsCreateShipmentLive />
    </WorkflowShell>
  )
}
