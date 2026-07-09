"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import {
  PrintButton,
  PRINT_PAGE_SIZES,
} from "@workspace/ui/components/primitives/print-button"
import {
  InvoicePrintView,
  type InvoicePrintData,
} from "@workspace/ui/components/composed/finance/invoice-print-view"
import { RiArrowLeftLine } from "@workspace/ui/icons"

interface PrintInvoiceClientProps {
  data: InvoicePrintData
  /** When true, the browser print dialog is triggered automatically after the page mounts. */
  autoPrint?: boolean
}

export function PrintInvoiceClient({ data, autoPrint }: PrintInvoiceClientProps) {
  const router = useRouter()
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!autoPrint) return
    // Allow the page to fully paint before triggering the OS print dialog.
    const t = setTimeout(() => window.print(), 400)
    return () => clearTimeout(t)
  }, [autoPrint])

  return (
    <div className="min-h-screen bg-background p-6">
      <div
        className="mx-auto mb-6 flex items-center justify-between gap-3 print:hidden"
        style={{ width: "210mm" }}
      >
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
            Tax Invoice · A4
          </p>
          <p className="font-mono text-sm font-semibold text-foreground">
            {data.invoiceNumber}
          </p>
        </div>
        <PrintButton
          contentRef={ref}
          documentTitle={`TAC-Invoice-${data.invoiceNumber}`}
          pageStyle={PRINT_PAGE_SIZES.A4}
          size="sm"
        >
          Print A4
        </PrintButton>
      </div>

      <div data-print-target="invoice" className="flex justify-center">
        <InvoicePrintView ref={ref} data={data} />
      </div>
    </div>
  )
}
