import type { Metadata } from "next"

import { WorkflowShell } from "@workspace/ui/components/composed/ops-console"

import { OpsCreateInvoiceLive } from "./ops-create-invoice-live"

export const metadata: Metadata = { title: "New Invoice — TAC Express Ops Console" }
export const dynamic = "force-dynamic"

// OpsPageHead is rendered inside OpsCreateInvoiceLive so the header can
// surface the autosave "Draft saved · HH:mm:ss" indicator + Discard action.
// WorkflowShell bounds the whole flow (header + stepper + form) at 1120px,
// centered — the stepper shares the form's width instead of stretching.
export default function Page() {
  return (
    <WorkflowShell>
      <OpsCreateInvoiceLive />
    </WorkflowShell>
  )
}
