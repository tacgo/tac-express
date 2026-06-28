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
      <header className="border-b border-border pb-4">
        <p className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
          Business
        </p>
        <h1 className="mt-0.5 font-sans text-2xl font-bold text-foreground">
          New Customer
        </h1>
        <p className="t-body-sm mt-1 text-muted-foreground">
          Contact + GST + billing address.
        </p>
      </header>
      <OpsCreateCustomerLive />
    </PageShell>
  )
}
