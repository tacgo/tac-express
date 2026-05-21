import type { Metadata } from "next"

import { OpsShipmentDetailLive } from "./ops-shipment-detail-live"

export const metadata: Metadata = {
  title: "Shipment — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

export default async function OpsShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <OpsShipmentDetailLive id={id} />
}
