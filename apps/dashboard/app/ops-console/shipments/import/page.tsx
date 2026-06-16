import type { Metadata } from "next"
import { BulkImportClient } from "./bulk-import-client"

export const metadata: Metadata = { title: "Bulk Import — Shipments — TAC Express" }

export const dynamic = "force-dynamic";

export default function ShipmentImportPage() {
  return <BulkImportClient />
}
