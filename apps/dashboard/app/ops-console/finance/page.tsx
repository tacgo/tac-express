import type { Metadata } from "next"

import { OpsFinanceLive } from "./ops-finance-live"

export const metadata: Metadata = {
  title: "Finance — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

export default function OpsConsoleFinancePage() {
  return <OpsFinanceLive />
}
