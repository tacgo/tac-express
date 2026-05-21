import type { Metadata } from "next"

import {
  OpsFrame,
  OpsPageHead,
} from "@workspace/ui/components/composed/ops-console"

import { OpsCreateRateCardLive } from "./ops-create-rate-card-live"

export const metadata: Metadata = { title: "Add Rate Card — TAC Express Ops Console" }
export const dynamic = "force-dynamic"

export default function Page() {
  return (
    <OpsFrame>
      <OpsPageHead
        eyebrow="Business"
        title="Add Rate Card"
        sub="Per-route, per-service-level, per-weight-slab pricing."
      />
      <OpsCreateRateCardLive />
    </OpsFrame>
  )
}
