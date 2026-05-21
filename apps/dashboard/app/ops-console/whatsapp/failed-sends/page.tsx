import type { Metadata } from "next"

import { OpsWhatsAppFailedSendsLive } from "./ops-whatsapp-failed-sends-live"

export const metadata: Metadata = {
  title: "WhatsApp failed sends — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

export default function OpsWhatsAppFailedSendsPage() {
  return <OpsWhatsAppFailedSendsLive />
}
