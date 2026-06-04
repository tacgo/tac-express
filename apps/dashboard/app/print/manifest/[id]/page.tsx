import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"

import {
  createManifestServerService,
  createShipmentServerService,
} from "@workspace/services/server"
import type { ManifestPrintViewLine } from "@workspace/ui/components/composed/manifests/manifest-print-view"

import { PrintManifestClient } from "./print-manifest-client"

export const metadata: Metadata = {
  title: "Print Manifest · TAC Express",
  description: "Cargo manifest for printing",
}

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PrintManifestPage({ params }: PageProps) {
  const { id } = await params
  const cookieStore = await cookies()
  const manifestService = createManifestServerService(cookieStore)
  const shipmentService = createShipmentServerService(cookieStore)

  const manifest = await manifestService.getManifestById(id).catch(() => null)
  if (!manifest) notFound()

  const manifestShipments = await manifestService
    .getManifestShipments(id)
    .catch(() => [])

  // Hydrate each manifest line with the matching shipment payload.
  const awbs = manifestShipments.map(ms => ms.awb_number)
  const shipments = await shipmentService
    .getShipmentsByAwbs(awbs)
    .catch(() => [])

  const shipmentMap = new Map(shipments.map(s => [s.awbNumber, s]))

  const lines: ManifestPrintViewLine[] = manifestShipments.map((ms) => {
    const ship = shipmentMap.get(ms.awb_number)
    const consigneeName = ship?.receiver?.name ?? "—"
    const consigneeCity = ship?.receiver?.address?.city ?? undefined
    const destination = (ship?.destHub ?? manifest.destHub).replace(
      /_/g,
      " "
    )
    const result: ManifestPrintViewLine = {
      awbNumber: ms.awb_number,
      consigneeName,
      consigneeCity,
      destination,
      pieces: ship?.pieces ?? ms.pieces ?? 0,
      weightKg: ship?.weight?.chargeable ?? ms.chargeable_weight ?? 0,
      remarks: ship?.serviceLevel,
    }
    return result
  })

  return <PrintManifestClient manifest={manifest} lines={lines} />
}
