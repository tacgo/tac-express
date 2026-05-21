import type { Metadata } from "next"

import { OpsShipmentsLive } from "./ops-shipments-live"

export const metadata: Metadata = {
  title: "Shipments — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

export default function OpsConsoleShipmentsPage() {
  return <OpsShipmentsLive />
}
