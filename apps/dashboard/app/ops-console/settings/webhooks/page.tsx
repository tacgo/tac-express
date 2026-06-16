import type { Metadata } from "next"
import { WebhooksClient } from "./webhooks-client"

export const metadata: Metadata = { title: "Webhooks — TAC Express" }

export const dynamic = "force-dynamic";

export default function WebhooksPage() {
  return <WebhooksClient />
}
