import type { Metadata } from "next"

import { PageShell } from "@workspace/ui/components/composed/page-shell"

import { OpsCreateCustomerLive } from "./ops-create-customer-live"

export const metadata: Metadata = {
  title: "New Customer — TAC Express Ops Console",
}
export const dynamic = "force-dynamic"

export default function Page() {
  return (
    <PageShell>
      <header className="pb-4 border-b border-border">
        <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">Business</p>
        <h1 className="font-sans text-2xl font-bold text-foreground mt-0.5">New Customer</h1>
        <p className="t-body-sm text-muted-foreground mt-1">Contact + GST + billing address.</p>
      </header>
      <OpsCreateCustomerLive />
    </PageShell>
  )
}
