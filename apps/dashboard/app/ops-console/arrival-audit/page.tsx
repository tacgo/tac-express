import type { Metadata } from "next"

import { ArrivalAuditClient } from "./arrival-audit-client"

// Authenticated ops-console surface — never statically prerendered. Its client
// data hooks construct the Supabase browser client at module load, which has no
// env at build time; forcing dynamic rendering keeps the page out of the static
// export pass (it is gated behind auth and has nothing to prerender anyway).
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Arrival Audit · TAC Express",
  description:
    "Reconcile inbound manifests at arrival — scan each AWB and resolve shortages.",
}

export default function ArrivalAuditPage() {
  return <ArrivalAuditClient />
}
