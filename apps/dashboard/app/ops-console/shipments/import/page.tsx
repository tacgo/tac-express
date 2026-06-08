import type { Metadata } from "next"
import { BulkImportClient } from "./bulk-import-client"

export const metadata: Metadata = { title: "Bulk Import — Shipments — TAC Express" }

export default function ShipmentImportPage() {
  return <BulkImportClient />
}

export const dynamic = "force-dynamic"
