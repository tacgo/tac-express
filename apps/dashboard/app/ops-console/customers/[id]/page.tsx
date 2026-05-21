import type { Metadata } from "next"

import { CustomerDetailClient } from "./customer-detail-client"

export const metadata: Metadata = { title: "Customer — TAC Express Ops Console" }
export const dynamic = "force-dynamic"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CustomerDetailClient customerId={id} />
}
