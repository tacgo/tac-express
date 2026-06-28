import type { Metadata } from "next"

import { ExceptionDetailClient } from "./exception-detail-client"

export const metadata: Metadata = {
  title: "Exception — TAC Express Ops Console",
}
export const dynamic = "force-dynamic"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ExceptionDetailClient exceptionId={id} />
}
