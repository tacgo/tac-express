import type { Metadata } from "next"

import { OpsManifestDetailLive } from "./ops-manifest-detail-live"

export const metadata: Metadata = { title: "Manifest — TAC Express Ops Console" }
export const dynamic = "force-dynamic"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <OpsManifestDetailLive id={id} />
}
