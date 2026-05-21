import type { Metadata } from "next"

import { OpsAnalyticsLive } from "./ops-analytics-live"

export const metadata: Metadata = {
  title: "Analytics — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

export default function OpsConsoleAnalyticsPage() {
  return <OpsAnalyticsLive />
}
