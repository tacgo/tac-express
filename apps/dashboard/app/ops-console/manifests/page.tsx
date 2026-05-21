import type { Metadata } from "next"

import { OpsManifestsLive } from "./ops-manifests-live"

export const metadata: Metadata = {
  title: "Manifests — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

export default function OpsConsoleManifestsPage() {
  return <OpsManifestsLive />
}
