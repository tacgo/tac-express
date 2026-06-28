import type { Metadata } from "next"

import { PageShell } from "@workspace/ui/components/composed/page-shell"

import { OpsCreateRateCardLive } from "./ops-create-rate-card-live"

export const metadata: Metadata = {
  title: "Add Rate Card — TAC Express Ops Console",
}
export const dynamic = "force-dynamic"

export default function Page() {
  return (
    <PageShell>
      <header className="border-b border-border pb-4">
        <p className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
          Business
        </p>
        <h1 className="mt-0.5 font-sans text-2xl font-bold text-foreground">
          Add Rate Card
        </h1>
        <p className="t-body-sm mt-1 text-muted-foreground">
          Per-route, per-service-level, per-weight-slab pricing.
        </p>
      </header>
      <OpsCreateRateCardLive />
    </PageShell>
  )
}
