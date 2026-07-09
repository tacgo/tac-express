import type { Metadata } from "next"

import { PageShell } from "@workspace/ui/components/composed/page-shell"

import { OpsCreateRateCardLive } from "./ops-create-rate-card-live"

export const metadata: Metadata = { title: "Add Rate Card — TAC Express Ops Console" }
export const dynamic = "force-dynamic"

export default function Page() {
  return (
    <PageShell>
      <header className="pb-4 border-b border-border">
        <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">Business</p>
        <h1 className="font-sans text-2xl font-bold text-foreground mt-0.5">Add Rate Card</h1>
        <p className="t-body-sm text-muted-foreground mt-1">Per-route, per-service-level, per-weight-slab pricing.</p>
      </header>
      <OpsCreateRateCardLive />
    </PageShell>
  )
}
