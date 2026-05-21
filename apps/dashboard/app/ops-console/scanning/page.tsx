import type { Metadata } from "next"

import { OpsScanningView } from "@workspace/ui/components/composed/ops-console/pages"

export const metadata: Metadata = {
  title: "Scanning — TAC Express Ops Console",
}

export default function OpsConsoleScanningPage() {
  return <OpsScanningView />
}
