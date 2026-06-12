import type { Metadata } from "next"

import { V7OpsScanning } from "@workspace/ui/components/composed/scanning/v7-ops-scanning"

export const metadata: Metadata = {
  title: "Scanning — TAC Express Ops Console",
}

export default function OpsConsoleScanningPage() {
  return <V7OpsScanning />
}
export const dynamic = "force-dynamic"
