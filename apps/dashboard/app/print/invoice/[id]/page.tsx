import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"

import { createInvoiceServerService } from "@workspace/services/server"
import type { InvoicePrintData } from "@workspace/ui/components/composed/finance/invoice-print-view"

import { PrintInvoiceClient } from "./print-invoice-client"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ print?: string }>
}

/**
 * Dynamic title — browser tab and PDF default filename pick up the invoice
 * number, e.g. "INV-2026-01014 · Print · TAC Express". Critical when the
 * user has several invoice print tabs open and needs to identify them.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const cookieStore = await cookies()
  const invoiceService = createInvoiceServerService(cookieStore)
  const invoice = await invoiceService.getInvoiceById(id).catch(() => null)

  if (!invoice) {
    return {
      title: "Print Invoice · TAC Express",
      description: "Invoice for printing",
    }
  }
  return {
    title: `${invoice.invoiceNumber} · Print · TAC Express`,
    description: `Tax invoice ${invoice.invoiceNumber} for ${invoice.customerName}`,
  }
}

export default async function PrintInvoicePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params
  const { print: printParam } = await searchParams
  const cookieStore = await cookies()
  const invoiceService = createInvoiceServerService(cookieStore)

  const invoice = await invoiceService.getInvoiceById(id).catch(() => null)
  if (!invoice) notFound()

  const parsedNotes = parseNotesPayload(invoice.notes)

  const data: InvoicePrintData = {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    createdAt: invoice.createdAt,
    dueDate: invoice.dueDate,
    paymentMode: invoice.paymentMode,
    awbNumber: invoice.awbNumber,
    customerName: invoice.customerName,
    customerGstin: invoice.customerGstin,
    customerPhone: parsedNotes.consignor?.phone,
    customerEmail: parsedNotes.consignor?.email,
    customerId: invoice.customerId
      ? `CUST-${invoice.customerId.slice(0, 8).toUpperCase()}`
      : undefined,
    billingAddress: parsedNotes.billingAddress,
    baseFreight: invoice.baseFreight,
    docketCharge: invoice.docketCharge,
    pickupCharge: invoice.pickupCharge,
    packingCharge: invoice.packingCharge,
    fuelSurcharge: invoice.fuelSurcharge,
    handlingFee: invoice.handlingFee,
    insurance: invoice.insurance,
    discount: invoice.discount,
    cgst: invoice.tax.cgst,
    sgst: invoice.tax.sgst,
    igst: invoice.tax.igst,
    totalTax: invoice.tax.total,
    totalAmount: invoice.totalAmount,
    advancePaid: invoice.advancePaid,
    notes: parsedNotes.freeText,
    shipToName: parsedNotes.consignee?.name,
    shipToAddress: parsedNotes.consignee?.address,
  }

  return <PrintInvoiceClient data={data} autoPrint={printParam === "1"} />
}

interface NotesPayload {
  freeText?: string
  billingAddress?: string
  consignor?: {
    name?: string
    phone?: string
    address?: string
    email?: string
  }
  consignee?: {
    name?: string
    phone?: string
    address?: string
    email?: string
  }
}

function parseNotesPayload(raw?: string): NotesPayload {
  if (!raw) return {}
  const trimmed = raw.trim()
  if (!trimmed.startsWith("{")) return { freeText: raw }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    return {
      freeText: typeof parsed.notes === "string" ? parsed.notes : undefined,
      billingAddress:
        typeof parsed.billingAddress === "string"
          ? parsed.billingAddress
          : undefined,
      consignor: parsed.consignor as NotesPayload["consignor"],
      consignee: parsed.consignee as NotesPayload["consignee"],
    }
  } catch {
    return { freeText: raw }
  }
}
