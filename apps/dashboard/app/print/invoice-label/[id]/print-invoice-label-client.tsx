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

interface PrintInvoiceLabelClientProps {
  data: ShippingLabelData
  /** Pre-encoded Code 128 SVG markup (from `@workspace/services/barcode/encode`). */
  code128Svg: string
  /** Pre-encoded Data Matrix SVG markup. */
  dataMatrixSvg: string
  /** When true, the browser print dialog is triggered automatically. */
  autoPrint?: boolean
}

export function PrintInvoiceLabelClient({
  data,
  code128Svg,
  dataMatrixSvg,
  autoPrint,
}: PrintInvoiceLabelClientProps) {
  const router = useRouter()
  const labelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!autoPrint) return
    const t = setTimeout(() => window.print(), 400)
    return () => clearTimeout(t)
  }, [autoPrint])

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
          <p className="font-mono text-ui-10 tracking-widest text-muted-foreground uppercase">
            Shipping Label · 4×6 thermal (FBA 7-zone)
          </p>
          <p className="font-mono text-sm font-semibold text-foreground">
            {data.awbNumber}
          </p>
        </div>
        <PrintButton
          contentRef={labelRef}
          documentTitle={`TAC-Label-${data.awbNumber}`}
          pageStyle={PRINT_PAGE_SIZES.ThermalShipping}
          size="sm"
          variant="default"
        >
          Print 4×6
        </PrintButton>
      </div>

      <div data-print-target="label" className="flex justify-center">
        <ShippingLabel
          ref={labelRef}
          data={data}
          code128Svg={code128Svg}
          dataMatrixSvg={dataMatrixSvg}
        />
      </div>
    </div>
  )
}
