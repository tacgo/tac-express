import type { Metadata } from "next"

import { OpsInventoryLive } from "./ops-inventory-live"

export const metadata: Metadata = {
  title: "Hub Inventory — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

export default function OpsConsoleInventoryPage() {
  return <OpsInventoryLive />
}
