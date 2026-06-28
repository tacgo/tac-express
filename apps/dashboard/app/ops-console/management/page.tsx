import type { Metadata } from "next"

import { ManagementClient } from "./management-client"

export const metadata: Metadata = {
  title: "Management — TAC Express Ops Console",
}
export const dynamic = "force-dynamic"

export default function Page() {
  return <ManagementClient />
}
