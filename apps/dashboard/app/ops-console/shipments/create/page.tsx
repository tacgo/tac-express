import type { Metadata } from "next"

import {
  WorkflowShell,
  OpsPageHead,
} from "@workspace/ui/components/composed/ops-console"

import { OpsCreateShipmentLive } from "./ops-create-shipment-live"

export const metadata: Metadata = {
  title: "New Shipment — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

// OpsPageHead is required (not optional) — the CreateShipmentForm step
// indicator is not an <h1>, so without OpsPageHead the page fails axe's
// `page-has-heading-one` rule (WCAG 2.4.6 / 1.3.1). See R0.1 audit findings.
// WorkflowShell bounds the whole flow at 1120px, centered — stepper + form
// share one width instead of the stepper stretching.
export default function OpsCreateShipmentPage() {
  return (
    <WorkflowShell>
      <OpsPageHead
        eyebrow="Operations"
        title="New Shipment"
        sub="Capture sender + receiver + parcel details. AWB is generated server-side on commit."
      />
      <OpsCreateShipmentLive />
    </WorkflowShell>
  )
}
