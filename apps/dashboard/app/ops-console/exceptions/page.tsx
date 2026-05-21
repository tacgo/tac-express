import type { Metadata } from "next"

import { OpsExceptionsLive } from "./ops-exceptions-live"

export const metadata: Metadata = {
  title: "Exceptions — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

export default function OpsConsoleExceptionsPage() {
  return <OpsExceptionsLive />
}
