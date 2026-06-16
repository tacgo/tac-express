import type { Metadata } from "next"

import { ArrivalAuditClient } from "./arrival-audit-client"

export const metadata: Metadata = {
  title: "Arrival Audit · TAC Express",
  description:
    "Reconcile inbound manifests at arrival — scan each AWB and resolve shortages.",
}

export const dynamic = "force-dynamic";

export default function ArrivalAuditPage() {
  return <ArrivalAuditClient />
}
