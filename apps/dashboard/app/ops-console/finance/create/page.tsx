import type { Metadata } from "next"

import { OpsFrame } from "@workspace/ui/components/composed/ops-console"

import { OpsCreateInvoiceLive } from "./ops-create-invoice-live"

export const metadata: Metadata = { title: "New Invoice — TAC Express Ops Console" }
export const dynamic = "force-dynamic"

// OpsPageHead is rendered inside OpsCreateInvoiceLive so the header can
// surface the autosave "Draft saved · HH:mm:ss" indicator + Discard action.
export default function Page() {
  return (
    <OpsFrame>
      <OpsCreateInvoiceLive />
    </OpsFrame>
  )
}
