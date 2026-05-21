import type { Metadata } from "next"

import { OpsInvoiceDetailLive } from "./ops-invoice-detail-live"

export const metadata: Metadata = { title: "Invoice — TAC Express Ops Console" }
export const dynamic = "force-dynamic"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <OpsInvoiceDetailLive id={id} />
}
