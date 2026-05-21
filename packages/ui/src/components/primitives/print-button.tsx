"use client"

import * as React from "react"
import { useReactToPrint } from "react-to-print"

import { Button } from "@workspace/ui/components/button"
import { RiPrinterLine } from "@workspace/ui/icons"

interface PrintButtonProps {
  /** Ref to the DOM node that should be captured for print. */
  contentRef: React.RefObject<HTMLElement | null>
  documentTitle?: string
  pageStyle?: string
  onAfterPrint?: () => void
  onBeforePrint?: () => Promise<void>
  children?: React.ReactNode
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
  disabled?: boolean
  /** Custom CSS injected into the print iframe (e.g. @page sizes). */
  injectStyle?: string
}

function PrintButton({
  contentRef,
  documentTitle = "TAC Express Document",
  pageStyle,
  onAfterPrint,
  onBeforePrint,
  children = "Print",
  variant = "outline",
  size = "default",
  className,
  disabled,
  injectStyle,
}: PrintButtonProps) {
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle,
    pageStyle,
    onAfterPrint,
    onBeforePrint,
  })

  return (
    <>
      {injectStyle && (
        <style data-slot="print-button-style">{injectStyle}</style>
      )}
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        className={className}
        onClick={() => handlePrint()}
        data-slot="print-button"
      >
        <RiPrinterLine className="size-4" />
        {children}
      </Button>
    </>
  )
}

/** Common @page size strings used for thermal labels and standard sheets. */
export const PRINT_PAGE_SIZES = {
  A4: "@page { size: A4 portrait; margin: 12mm; }",
  A4Landscape: "@page { size: A4 landscape; margin: 12mm; }",
  Thermal4x6: "@page { size: 4in 6in; margin: 0; }",
  ThermalShipping:
    "@page { size: 4in 6in; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
  /**
   * 3:1 landscape adhesive label (6" × 2"). Default for the redesigned
   * `ShippingLabel` — wide hangtag-style format with consignee + barcode.
   */
  Thermal6x2:
    "@page { size: 6in 2in; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
  Letter: "@page { size: Letter portrait; margin: 12mm; }",
} as const

export { PrintButton }
