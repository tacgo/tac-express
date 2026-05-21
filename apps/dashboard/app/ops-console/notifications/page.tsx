import type { Metadata } from "next"

import { OpsNotificationsLive } from "./ops-notifications-live"

export const metadata: Metadata = {
  title: "Notifications — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

export default function OpsConsoleNotificationsPage() {
  return <OpsNotificationsLive />
}
