import type { Metadata } from "next"

import {
  OpsFrame,
  OpsPageHead,
} from "@workspace/ui/components/composed/ops-console"

import { OpsCreateCustomerLive } from "./ops-create-customer-live"

export const metadata: Metadata = {
  title: "New Customer — TAC Express Ops Console",
}
export const dynamic = "force-dynamic"

export default function Page() {
  return (
    <OpsFrame>
      <OpsPageHead
        eyebrow="Business"
        title="New Customer"
        sub="Contact + GST + billing address."
      />
      <OpsCreateCustomerLive />
    </OpsFrame>
  )
}
