import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"

import { createInvoiceServerService } from "@workspace/services/server"
import { encodeShippingLabelBarcodes } from "@workspace/services/barcode/encode"
import type { ShippingLabelData } from "@workspace/ui/components/composed/shipments/shipping-label"

import { PrintInvoiceLabelClient } from "./print-invoice-label-client"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ print?: string }>
}

/** Dynamic title so browser tab + PDF filename carry the invoice number. */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const cookieStore = await cookies()
  const invoiceService = createInvoiceServerService(cookieStore)
  const invoice = await invoiceService.getInvoiceById(id).catch(() => null)

  if (!invoice) {
    return { title: "Print Invoice Label · TAC Express" }
  }
  return {
    title: `${invoice.invoiceNumber} · Label · TAC Express`,
    description: `Shipping label for invoice ${invoice.invoiceNumber}`,
  }
}

interface InvoiceNotesPayload {
  consignor?: { name?: string; phone?: string; address?: string }
  consignee?: { name?: string; phone?: string; address?: string }
  bookingDate?: string
  natureOfQuantity?: string
  actualWeightKg?: string | number
}

function parseNotesPayload(raw?: string): InvoiceNotesPayload {
  if (!raw) return {}
  const trimmed = raw.trim()
  if (!trimmed.startsWith("{")) return {}
  try {
    return JSON.parse(trimmed) as InvoiceNotesPayload
  } catch {
    return {}
  }
}

/**
 * Renders a 4×6 shipping label using data drawn from an *invoice* row.
 *
 * Why this exists separately from `/print/label/[awb]`:
 * - The original label route requires a `shipments` record. Invoices created
 *   via the wizard get an auto-generated AWB that doesn't always have a
 *   matching shipment — the label needs to be printable anyway so the parcel
 *   can be physically tagged.
 * - This route reads consignor / consignee / weight from the JSON `notes`
 *   blob the wizard persists on each invoice.
 */
export default async function PrintInvoiceLabelPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { print: printParam } = await searchParams

  const cookieStore = await cookies()
  const invoiceService = createInvoiceServerService(cookieStore)

  const invoice = await invoiceService.getInvoiceById(id).catch(() => null)
  if (!invoice) notFound()

  const notes = parseNotesPayload(invoice.notes)

  // Map invoice fields onto the canonical ShippingLabelData shape.
  // Missing values fall back to the customer name (BILL TO) so the label is
  // never empty — the user can edit by re-issuing if details change.
  const data: ShippingLabelData = {
    awbNumber: invoice.awbNumber || "—",
    origin: "IMPHAL",
    destination: "NEW DELHI",
    serviceLevel: "STANDARD",
    paymentMode: invoice.paymentMode,
    senderName: notes.consignor?.name || invoice.customerName,
    senderPhone: notes.consignor?.phone,
    senderAddress: notes.consignor?.address ?? "",
    receiverName: notes.consignee?.name ?? "",
    receiverPhone: notes.consignee?.phone,
    receiverAddress: notes.consignee?.address ?? "",
    weightKg:
      typeof notes.actualWeightKg === "number"
        ? notes.actualWeightKg
        : notes.actualWeightKg
          ? Number(notes.actualWeightKg) || undefined
          : undefined,
    description: notes.natureOfQuantity,
    orderRef: invoice.invoiceNumber,
  }

  /* Encode real Code 128 + Data Matrix barcodes server-side. The label
   * component inlines the SVG markup directly — no client-side bwip-js
   * dependency, no decorative seeded patterns. If encoding fails (e.g.
   * an AWB containing characters Code 128 can't represent), let the
   * error propagate — the print page returning 5xx is a louder signal
   * than rendering an unscannable label. */
  const { code128Svg, dataMatrixSvg } = encodeShippingLabelBarcodes(data.awbNumber)

  return (
    <PrintInvoiceLabelClient
      data={data}
      code128Svg={code128Svg}
      dataMatrixSvg={dataMatrixSvg}
      autoPrint={printParam === "1"}
    />
  )
}
