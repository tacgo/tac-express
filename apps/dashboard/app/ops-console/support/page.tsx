import type { Metadata } from "next"

import { SupportInboxLive } from "./support-inbox-live"

export const metadata: Metadata = {
  title: "Contact Inbox — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

export default function OpsConsoleSupportPage() {
  return <SupportInboxLive />
}
