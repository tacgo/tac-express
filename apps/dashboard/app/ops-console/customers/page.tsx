import type { Metadata } from "next"

import { OpsCustomersLive } from "./ops-customers-live"

export const metadata: Metadata = {
  title: "Customers — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

export default function OpsConsoleCustomersPage() {
  return <OpsCustomersLive />
}
