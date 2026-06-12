import type { Metadata } from "next"
import { ApiKeysClient } from "./api-keys-client"

export const metadata: Metadata = { title: "API Keys — TAC Express" }

export default function ApiKeysPage() {
  return <ApiKeysClient />
}
export const dynamic = "force-dynamic"
