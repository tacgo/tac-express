import type { Metadata } from "next"

import { OpsRateCardsLive } from "./ops-rate-cards-live"

export const metadata: Metadata = {
  title: "Rate Cards — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

export default function OpsConsoleRateCardsPage() {
  return <OpsRateCardsLive />
}
