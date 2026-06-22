import type { Metadata } from "next"
import { AuditClient } from "./audit-client"

export const metadata: Metadata = { title: "Audit Log — TAC Express" }

export const dynamic = "force-dynamic"

export default function AuditPage() {
  return <AuditClient />
}
