import type { Metadata } from "next"

import { OpsSettingsLive } from "./ops-settings-live"

export const metadata: Metadata = {
  title: "Settings — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

export default function OpsConsoleSettingsPage() {
  return <OpsSettingsLive />
}
