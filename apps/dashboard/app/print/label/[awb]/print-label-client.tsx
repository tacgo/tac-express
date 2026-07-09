"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import {
  PrintButton,
  PRINT_PAGE_SIZES,
} from "@workspace/ui/components/primitives/print-button"
import {
  ShippingLabel,
  type ShippingLabelData,
} from "@workspace/ui/components/composed/shipments/shipping-label"
import { RiArrowLeftLine } from "@workspace/ui/icons"
import type { Shipment, Address } from "@workspace/types"

interface PrintLabelClientProps {
  shipment: Shipment
  /** Pre-encoded Code 128 SVG markup (from `@workspace/services/barcode/encode`). */
  code128Svg: string
  /** Pre-encoded Data Matrix SVG markup. */
  dataMatrixSvg: string
}

function formatAddress(addr?: Address | null): string {
  if (!addr) return ""
  return [addr.line1, addr.line2, addr.city, addr.state, addr.zip]
    .filter(Boolean)
    .join(", ")
}

export function PrintLabelClient({
  shipment,
  code128Svg,
  dataMatrixSvg,
}: PrintLabelClientProps) {
  const router = useRouter()
  const labelRef = React.useRef<HTMLDivElement>(null)

  const labelData: ShippingLabelData = React.useMemo(() => {
    const sender = shipment.sender
    const receiver = shipment.receiver
    return {
      awbNumber: shipment.awbNumber,
      origin: shipment.originHub.replace(/_/g, " "),
      destination: shipment.destHub.replace(/_/g, " "),
      serviceLevel: shipment.serviceLevel,
      paymentMode: shipment.paymentMode,
      senderName: sender?.name ?? "—",
      senderPhone: sender?.phone,
      senderAddress: formatAddress(sender?.address),
      receiverName: receiver?.name ?? "—",
      receiverPhone: receiver?.phone,
      receiverAddress: formatAddress(receiver?.address),
      pieces: shipment.pieces,
      weightKg: shipment.weight?.chargeable,
      description: shipment.description,
    }
  }, [shipment])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto mb-6 flex max-w-xl items-center justify-between gap-3 print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          aria-label="Back"
        >
          <RiArrowLeftLine aria-hidden="true" />
          <span className="ml-1.5">Back</span>
        </Button>
        <div className="flex flex-col items-center">
          <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            Shipping Label · 4×6 thermal (FBA 7-zone)
          </p>
          <p className="font-mono text-sm font-semibold text-foreground">
            {shipment.awbNumber}
          </p>
        </div>
        <PrintButton
          contentRef={labelRef}
          documentTitle={`TAC-Label-${shipment.awbNumber}`}
          pageStyle={PRINT_PAGE_SIZES.ThermalShipping}
          size="sm"
          variant="default"
        >
          Print 4×6
        </PrintButton>
      </div>

      <div
        data-print-target="label"
        className="flex justify-center"
      >
        <ShippingLabel
          ref={labelRef}
          data={labelData}
          code128Svg={code128Svg}
          dataMatrixSvg={dataMatrixSvg}
        />
      </div>
    </div>
  )
}
