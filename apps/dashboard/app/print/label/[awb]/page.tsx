import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { createShipmentServerService } from "@workspace/services/server"
import { encodeShippingLabelBarcodes } from "@workspace/services/barcode/encode"
import { PrintLabelClient } from "./print-label-client"

export const metadata: Metadata = {
  title: "Print Label | TAC Express",
  description: "Shipping label for printing",
}

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ awb: string }>
}

export default async function PrintLabelPage({ params }: PageProps) {
  const { awb } = await params
  const cookieStore = await cookies()
  const shipmentService = createShipmentServerService(cookieStore)

  const shipment = await shipmentService.getShipmentByAwb(awb).catch(() => null)

  if (!shipment) {
    notFound()
  }

  /* Real Code 128 + Data Matrix encoded server-side. See the same
   * pattern in `apps/dashboard/app/print/invoice-label/[id]/page.tsx`
   * for rationale — labels must scan, not just look right. */
  const { code128Svg, dataMatrixSvg } = encodeShippingLabelBarcodes(shipment.awbNumber)

  return (
    <PrintLabelClient
      shipment={shipment}
      code128Svg={code128Svg}
      dataMatrixSvg={dataMatrixSvg}
    />
  )
}
