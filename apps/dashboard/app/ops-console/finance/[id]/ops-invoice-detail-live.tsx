"use client"

import * as React from "react"

import {
  useInvoice,
  useIssueInvoice,
  useMarkPaid,
  useCancelInvoice,
} from "@workspace/services/hooks/use-invoices"
import {
  usePaymentsForInvoice,
  useRecordPayment,
  useDeletePayment,
} from "@workspace/services/hooks/use-payments"
import {
  useSendInvoiceWhatsapp,
  useWhatsappTest,
} from "@workspace/services/hooks/use-whatsapp"
import { PaymentResponseLostError } from "@workspace/services/payment.service"
import { useNotificationStore } from "@workspace/services/stores/notification.store"
import { InvoiceStatus } from "@workspace/types"
import {
  RiPrinterLine,
  RiEyeLine,
  RiMoneyDollarCircleLine,
  RiBarcodeBoxLine,
  RiWhatsappLine,
  RiErrorWarningLine,
} from "@workspace/ui/icons"
import { cn } from "@workspace/ui/lib/utils"
import {
  OpsDetailFrame,
  OpsBadge,
  OpsButton,
  OpsCard,
  OpsSkeleton,
} from "@workspace/ui/components/composed/ops-console"
import { PaymentTimeline } from "@workspace/ui/components/composed/finance/payment-timeline"
import {
  RecordPaymentDialog,
  type RecordPaymentValues,
} from "@workspace/ui/components/composed/finance/record-payment-dialog"
import {
  SendWhatsAppDialog,
  type SendWhatsAppValues,
} from "@workspace/ui/components/composed/finance/send-whatsapp-dialog"

/**
 * Paper-aesthetic invoice detail. 1:1 feature parity with the v6
 * `InvoiceDetailClient`: WhatsApp send (kill-switch aware), payment
 * recording (with PaymentResponseLostError + Sentry capture), PDF/label
 * print routes, issue / mark-paid / cancel state transitions. Only the
 * visual chrome differs.
 */

const STATUS_TONE: Record<InvoiceStatus, "neutral" | "ok" | "warn" | "err" | "violet"> = {
  [InvoiceStatus.DRAFT]: "warn",
  [InvoiceStatus.ISSUED]: "violet",
  [InvoiceStatus.PAID]: "ok",
  [InvoiceStatus.OVERDUE]: "err",
  [InvoiceStatus.CANCELLED]: "neutral",
}

interface ParsedNotes {
  freeText?: string
  remarks?: string
  bookingDate?: string
  natureOfQuantity?: string
  declaredValue?: string
  consignor?: { name?: string; phone?: string; address?: string }
  consignee?: { name?: string; phone?: string; address?: string }
  billingAddress?: string
  actualWeightKg?: string | number
  externalAwbNumber?: string
}

function parseNotes(raw?: string): ParsedNotes | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith("{")) return { freeText: raw }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    return {
      freeText: typeof parsed.notes === "string" ? parsed.notes : undefined,
      remarks: typeof parsed.remarks === "string" ? parsed.remarks : undefined,
      bookingDate:
        typeof parsed.bookingDate === "string" ? parsed.bookingDate : undefined,
      natureOfQuantity:
        typeof parsed.natureOfQuantity === "string"
          ? parsed.natureOfQuantity
          : undefined,
      declaredValue:
        typeof parsed.declaredValue === "string" ? parsed.declaredValue : undefined,
      consignor: parsed.consignor as ParsedNotes["consignor"],
      consignee: parsed.consignee as ParsedNotes["consignee"],
      billingAddress:
        typeof parsed.billingAddress === "string" ? parsed.billingAddress : undefined,
      actualWeightKg: parsed.actualWeightKg as ParsedNotes["actualWeightKg"],
      externalAwbNumber:
        typeof parsed.externalAwbNumber === "string"
          ? parsed.externalAwbNumber
          : undefined,
    }
  } catch {
    return { freeText: raw }
  }
}

function fmtINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function ChargeRow({
  label,
  value,
  accent,
}: {
  label: string
  value: React.ReactNode
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-paper-line/60 py-2 last:border-b-0">
      <span className="paper-label">{label}</span>
      <span
        className={cn(
          "font-paper-mono text-[length:var(--text-ui-13)] tabular-nums",
          accent ? "text-paper-violet font-semibold" : "text-paper-fg-1",
        )}
      >
        {value}
      </span>
    </div>
  )
}

function MetaField({
  label,
  value,
  className,
}: {
  label: string
  value?: React.ReactNode
  className?: string
}) {
  if (value === undefined || value === null || value === "") return null
  return (
    <div className={cn("space-y-1", className)}>
      <p className="paper-label">{label}</p>
      <p className="font-paper-mono text-[length:var(--text-ui-12)] text-paper-fg-1 whitespace-pre-line break-words">
        {value}
      </p>
    </div>
  )
}

interface OpsInvoiceDetailLiveProps {
  id: string
}

export function OpsInvoiceDetailLive({ id }: OpsInvoiceDetailLiveProps) {
  const addNotification = useNotificationStore((s) => s.addNotification)
  const { data: invoice, isLoading } = useInvoice(id)
  const { data: payments = [] } = usePaymentsForInvoice(id)
  const issueInvoice = useIssueInvoice()
  const markPaid = useMarkPaid()
  const cancelInvoice = useCancelInvoice()
  const recordPayment = useRecordPayment()
  const deletePayment = useDeletePayment()
  const sendWhatsapp = useSendInvoiceWhatsapp()
  const [recordOpen, setRecordOpen] = React.useState(false)
  const [whatsappOpen, setWhatsappOpen] = React.useState(false)
  /**
   * Pre-flight WPBox config check — runs on mount so the WhatsApp button
   * can disable itself before the operator clicks. `staleTime: 60_000`
   * inside the hook caps refetch frequency to once per minute.
   */
  const whatsappTest = useWhatsappTest(true)
  const whatsappAvailable = whatsappTest.data?.ok !== false

  const parsedNotes = React.useMemo(() => parseNotes(invoice?.notes), [invoice?.notes])

  async function handleIssue() {
    try {
      await issueInvoice.mutateAsync(id)
      addNotification({
        type: "success",
        title: "Invoice issued",
        message: String(invoice?.invoiceNumber ?? ""),
      })
    } catch (err) {
      addNotification({ type: "error", title: "Failed", message: String(err) })
    }
  }

  async function handleMarkPaid() {
    try {
      await markPaid.mutateAsync({ id })
      addNotification({
        type: "success",
        title: "Marked as paid",
        message: String(invoice?.invoiceNumber ?? ""),
      })
    } catch (err) {
      addNotification({ type: "error", title: "Failed", message: String(err) })
    }
  }

  async function handleSendWhatsapp(values: SendWhatsAppValues) {
    try {
      const result = await sendWhatsapp.mutateAsync({
        invoiceId: id,
        phone: values.phone,
        mode: values.mode,
        templateName: values.templateName,
        templateLanguage: values.templateLanguage,
        templateParams: values.templateParams,
        templateMediaUrl: values.templateMediaUrl,
        templateMediaFilename: values.templateMediaFilename,
        templateMediaKind: values.templateMediaKind,
      })

      const phoneOut = result.phone ?? values.phone
      const invNo = result.invoiceNumber ?? invoice?.invoiceNumber ?? ""
      const isDirect = (result.mode ?? values.mode) === "direct"
      const wamidTag = result.wamid
        ? ` · WAMID ${result.wamid.slice(0, 22)}…`
        : ""

      addNotification({
        type: "success",
        title: isDirect ? "WhatsApp queued" : "Template sent",
        message: isDirect
          ? `Invoice ${invNo} accepted by WhatsApp for ${phoneOut}${wamidTag}. Delivery requires recipient to have messaged you in the last 24h — switch to Template mode for guaranteed delivery.`
          : `Template delivered to ${phoneOut} for invoice ${invNo}${wamidTag}.`,
      })
      setWhatsappOpen(false)
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async function handleRecordPayment(values: RecordPaymentValues) {
    try {
      await recordPayment.mutateAsync({
        invoiceId: id,
        amount: values.amount,
        method: values.method,
        reference: values.reference,
        notes: values.notes,
        receivedAt: values.receivedAt,
      })
      addNotification({
        type: "success",
        title: "Payment recorded",
        message: `₹${values.amount.toLocaleString("en-IN")} via ${values.method
          .replace(/_/g, " ")
          .toLowerCase()}.`,
      })
    } catch (err) {
      // RPC succeeded but the response row was empty — server-side state has
      // changed, the user MUST refresh rather than retry. Discriminate by
      // `code` for bundle safety across package boundaries.
      const isResponseLost =
        err instanceof PaymentResponseLostError ||
        (typeof err === "object" &&
          err !== null &&
          (err as { code?: unknown }).code === "PAYMENT_RESPONSE_LOST")

      if (isResponseLost) {
        console.error("Payment response lost event caught:", {
          error: err,
          module: "finance",
          kind: "payment_response_lost",
          invoice_id: id,
          invoiceNumber: invoice?.invoiceNumber,
          amount: values.amount,
          method: values.method,
          userId: invoice?.createdBy,
        })
        addNotification({
          type: "warning",
          title: "Payment recorded — verify before retrying",
          message:
            "The payment was saved on the server, but we did not receive " +
            "a confirmation row. Refresh the invoice to verify the entry " +
            "appears. Do NOT click Record Payment again — that would " +
            "create a duplicate.",
        })
        return
      }

      addNotification({ type: "error", title: "Payment failed", message: String(err) })
    }
  }

  function handleDeletePayment(paymentId: string) {
    if (!confirm("Delete this payment record?")) return
    deletePayment.mutate({ id: paymentId, invoiceId: id })
  }

  async function handleCancel() {
    if (!confirm("Cancel this invoice?")) return
    try {
      await cancelInvoice.mutateAsync(id)
      addNotification({
        type: "success",
        title: "Invoice cancelled",
        message: String(invoice?.invoiceNumber ?? ""),
      })
    } catch (err) {
      addNotification({ type: "error", title: "Failed", message: String(err) })
    }
  }

  const isActionLoading =
    issueInvoice.isPending || markPaid.isPending || cancelInvoice.isPending

  if (isLoading) {
    return (
      <OpsDetailFrame eyebrow="Invoice" title="…" backHref="/ops-console/finance">
        <OpsSkeleton className="h-4 w-2/3" />
        <OpsSkeleton className="h-32 w-full" />
      </OpsDetailFrame>
    )
  }

  if (!invoice) {
    return (
      <OpsDetailFrame
        eyebrow="Invoice"
        title={id}
        backHref="/ops-console/finance"
      >
        <div className="border border-paper-err/40 border-l-[length:var(--indicator-w)] border-l-paper-err bg-paper-err-bg/30 p-6 flex items-start gap-3">
          <RiErrorWarningLine
            aria-hidden
            className="size-5 text-paper-err shrink-0"
          />
          <div>
            <div className="paper-eyebrow text-paper-err">NOT FOUND</div>
            <p className="font-paper-display text-[length:var(--text-ui-13)] mt-1">
              Could not load invoice.
            </p>
          </div>
        </div>
      </OpsDetailFrame>
    )
  }

  const subtotal =
    invoice.baseFreight +
    invoice.docketCharge +
    invoice.pickupCharge +
    invoice.packingCharge +
    invoice.fuelSurcharge +
    invoice.handlingFee +
    invoice.insurance
  const taxable = Math.max(0, subtotal - invoice.discount)

  return (
    <>
      <OpsDetailFrame
        eyebrow="Invoice"
        title={invoice.invoiceNumber}
        sub={`${invoice.customerName}${invoice.awbNumber ? ` · AWB ${invoice.awbNumber}` : ""}`}
        backHref="/ops-console/finance"
        status={
          <OpsBadge tone={STATUS_TONE[invoice.status] ?? "neutral"}>
            {invoice.status}
          </OpsBadge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <OpsButton
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/print/invoice/${id}`, "_blank")}
            >
              <RiEyeLine aria-hidden className="size-3" />
              Preview
            </OpsButton>
            <OpsButton
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/print/invoice/${id}?print=1`, "_blank")}
            >
              <RiPrinterLine aria-hidden className="size-3" />
              Print / PDF
            </OpsButton>
            <OpsButton
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(`/print/invoice-label/${id}?print=1`, "_blank")
              }
            >
              <RiBarcodeBoxLine aria-hidden className="size-3" />
              Label
            </OpsButton>
            {invoice.status !== InvoiceStatus.CANCELLED && (
              <OpsButton
                variant="primary"
                size="sm"
                onClick={() => setWhatsappOpen(true)}
                disabled={!whatsappAvailable}
                title={
                  whatsappAvailable
                    ? undefined
                    : whatsappTest.data?.error ??
                      "WhatsApp send is currently unavailable — check the WHATSAPP_ENABLED kill switch or WPBox upstream."
                }
                aria-label={
                  whatsappAvailable
                    ? "Send invoice via WhatsApp"
                    : "Send via WhatsApp (currently unavailable)"
                }
              >
                <RiWhatsappLine aria-hidden className="size-3" />
                WhatsApp
              </OpsButton>
            )}
          </div>
        }
        aside={
          <>
            <OpsCard ticks>
              <div className="paper-label">Total</div>
              <div className="paper-stat-value mt-1">
                {fmtINR(invoice.totalAmount)}
              </div>
            </OpsCard>
            <OpsCard ticks>
              <div className="paper-label">Balance Due</div>
              <div
                className={cn(
                  "paper-stat-value mt-1",
                  invoice.balance > 0 ? "text-paper-warn" : "text-paper-ok",
                )}
              >
                {fmtINR(invoice.balance)}
              </div>
              {invoice.advancePaid > 0 && (
                <div className="paper-label mt-2">
                  Advance {fmtINR(invoice.advancePaid)}
                </div>
              )}
            </OpsCard>
            <OpsCard>
              <div className="paper-label mb-1">Created</div>
              <div className="font-paper-mono text-[length:var(--text-ui-13)] tabular-nums">
                {fmtDate(invoice.createdAt)}
              </div>
              {invoice.issuedAt && (
                <>
                  <div className="paper-label mb-1 mt-3">Issued</div>
                  <div className="font-paper-mono text-[length:var(--text-ui-13)] tabular-nums">
                    {fmtDate(invoice.issuedAt)}
                  </div>
                </>
              )}
              {invoice.dueDate && (
                <>
                  <div className="paper-label mb-1 mt-3">Due</div>
                  <div className="font-paper-mono text-[length:var(--text-ui-13)] tabular-nums">
                    {fmtDate(invoice.dueDate)}
                  </div>
                </>
              )}
            </OpsCard>
          </>
        }
      >
        <OpsCard ticks>
          <div className="flex items-start justify-between gap-4 border-b border-paper-line pb-3 mb-4">
            <div className="space-y-0.5">
              <p className="paper-label">Invoice</p>
              <p className="font-paper-display text-[length:var(--text-ui-16)] font-bold uppercase tracking-wide text-paper-violet">
                {invoice.invoiceNumber}
              </p>
            </div>
            <div className="space-y-0.5 text-right">
              <p className="paper-label">AWB</p>
              <p className="font-paper-mono text-[length:var(--text-ui-13)] font-semibold">
                {invoice.awbNumber || "—"}
              </p>
              {invoice.issuedAt && (
                <p className="font-paper-mono text-[length:var(--text-ui-10)] text-paper-fg-3">
                  Issued {fmtDate(invoice.issuedAt)}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-0">
            <ChargeRow label="Customer" value={invoice.customerName} />
            {invoice.customerGstin && (
              <ChargeRow label="GSTIN" value={invoice.customerGstin} />
            )}
            <ChargeRow label="Payment Mode" value={invoice.paymentMode} />
            <ChargeRow label="Base Freight" value={fmtINR(invoice.baseFreight)} />
            {invoice.docketCharge > 0 && (
              <ChargeRow label="Docket Charge" value={fmtINR(invoice.docketCharge)} />
            )}
            {invoice.pickupCharge > 0 && (
              <ChargeRow label="Pickup Charge" value={fmtINR(invoice.pickupCharge)} />
            )}
            {invoice.packingCharge > 0 && (
              <ChargeRow label="Packing Charge" value={fmtINR(invoice.packingCharge)} />
            )}
            {invoice.fuelSurcharge > 0 && (
              <ChargeRow label="Fuel Surcharge" value={fmtINR(invoice.fuelSurcharge)} />
            )}
            {invoice.handlingFee > 0 && (
              <ChargeRow label="Handling Fee" value={fmtINR(invoice.handlingFee)} />
            )}
            {invoice.insurance > 0 && (
              <ChargeRow label="Insurance" value={fmtINR(invoice.insurance)} />
            )}
            <ChargeRow label="Subtotal" value={fmtINR(subtotal)} />
            {invoice.discount > 0 && (
              <ChargeRow label="Discount" value={`− ${fmtINR(invoice.discount)}`} />
            )}
            {invoice.discount > 0 && (
              <ChargeRow label="Taxable" value={fmtINR(taxable)} />
            )}
            {(invoice.tax.cgst ?? 0) > 0 && (
              <ChargeRow label="CGST" value={fmtINR(invoice.tax.cgst ?? 0)} />
            )}
            {(invoice.tax.sgst ?? 0) > 0 && (
              <ChargeRow label="SGST" value={fmtINR(invoice.tax.sgst ?? 0)} />
            )}
            {(invoice.tax.igst ?? 0) > 0 && (
              <ChargeRow label="IGST" value={fmtINR(invoice.tax.igst ?? 0)} />
            )}
          </div>

          <div className="flex items-center justify-between border-t-2 border-paper-fg-1/80 pt-3 mt-3">
            <span className="font-paper-mono text-[length:var(--text-ui-12)] font-bold uppercase tracking-[length:var(--tracking-badge)] text-paper-fg-1">
              Total
            </span>
            <span className="font-paper-display text-[length:var(--text-ui-18)] font-bold tabular-nums text-paper-violet">
              {fmtINR(invoice.totalAmount)}
            </span>
          </div>

          <div className="space-y-0 border-t border-dashed border-paper-line pt-2 mt-2">
            {invoice.advancePaid > 0 && (
              <ChargeRow
                label="Advance Paid"
                value={`− ${fmtINR(invoice.advancePaid)}`}
              />
            )}
            <ChargeRow
              label="Balance Due"
              accent={invoice.balance > 0}
              value={fmtINR(invoice.balance)}
            />
          </div>
        </OpsCard>

        {parsedNotes &&
          (parsedNotes.consignor ||
            parsedNotes.consignee ||
            parsedNotes.bookingDate ||
            parsedNotes.natureOfQuantity ||
            parsedNotes.declaredValue) && (
            <OpsCard ticks>
              <div className="paper-label mb-3">Shipment metadata</div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <MetaField label="Booking date" value={parsedNotes.bookingDate} />
                <MetaField label="Nature of goods" value={parsedNotes.natureOfQuantity} />
                <MetaField label="Declared value" value={parsedNotes.declaredValue} />
                <MetaField
                  label="Actual weight"
                  value={
                    parsedNotes.actualWeightKg !== undefined &&
                    parsedNotes.actualWeightKg !== ""
                      ? `${parsedNotes.actualWeightKg} kg`
                      : undefined
                  }
                />
                <MetaField
                  label="External AWB"
                  value={parsedNotes.externalAwbNumber}
                />
                <MetaField label="Billing address" value={parsedNotes.billingAddress} />
              </div>

              {(parsedNotes.consignor || parsedNotes.consignee) && (
                <div className="grid grid-cols-1 gap-4 border-t border-paper-line pt-4 mt-4 sm:grid-cols-2">
                  {parsedNotes.consignor && (
                    <div className="space-y-1.5">
                      <p className="paper-label text-paper-violet">Consignor</p>
                      <MetaField label="Name" value={parsedNotes.consignor.name} />
                      <MetaField label="Phone" value={parsedNotes.consignor.phone} />
                      <MetaField label="Address" value={parsedNotes.consignor.address} />
                    </div>
                  )}
                  {parsedNotes.consignee && (
                    <div className="space-y-1.5">
                      <p className="paper-label text-paper-violet">Consignee</p>
                      <MetaField label="Name" value={parsedNotes.consignee.name} />
                      <MetaField label="Phone" value={parsedNotes.consignee.phone} />
                      <MetaField label="Address" value={parsedNotes.consignee.address} />
                    </div>
                  )}
                </div>
              )}

              {(parsedNotes.freeText || parsedNotes.remarks) && (
                <div className="grid grid-cols-1 gap-4 border-t border-paper-line pt-4 mt-4 sm:grid-cols-2">
                  <MetaField label="Notes" value={parsedNotes.freeText} />
                  <MetaField label="Remarks" value={parsedNotes.remarks} />
                </div>
              )}
            </OpsCard>
          )}

        <OpsCard ticks>
          <div className="paper-label mb-3">Actions</div>
          <div className="flex flex-wrap items-center gap-2">
            {invoice.status === InvoiceStatus.DRAFT && (
              <OpsButton
                variant="primary"
                size="sm"
                onClick={handleIssue}
                disabled={isActionLoading}
              >
                Issue Invoice
              </OpsButton>
            )}
            {invoice.status === InvoiceStatus.ISSUED && (
              <>
                <OpsButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecordOpen(true)}
                  disabled={isActionLoading || invoice.balance <= 0}
                >
                  <RiMoneyDollarCircleLine aria-hidden className="size-3" />
                  Record Payment
                </OpsButton>
                <OpsButton
                  variant="primary"
                  size="sm"
                  onClick={handleMarkPaid}
                  disabled={isActionLoading}
                >
                  Mark Fully Paid
                </OpsButton>
              </>
            )}
            {(invoice.status === InvoiceStatus.DRAFT ||
              invoice.status === InvoiceStatus.ISSUED) && (
              <OpsButton
                variant="danger"
                size="sm"
                onClick={handleCancel}
                disabled={isActionLoading}
              >
                Cancel
              </OpsButton>
            )}
          </div>
        </OpsCard>

        <PaymentTimeline payments={payments} onDelete={handleDeletePayment} />
      </OpsDetailFrame>

      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        maxAmount={invoice.balance}
        onSubmit={handleRecordPayment}
      />

      <SendWhatsAppDialog
        open={whatsappOpen}
        onOpenChange={setWhatsappOpen}
        customerName={invoice.customerName}
        defaultPhone={
          parsedNotes?.consignor?.phone ?? parsedNotes?.consignee?.phone ?? ""
        }
        invoiceNumber={invoice.invoiceNumber}
        totalAmount={invoice.totalAmount}
        awbNumber={invoice.awbNumber ?? undefined}
        onSubmit={handleSendWhatsapp}
        isSubmitting={sendWhatsapp.isPending}
        testStatus={whatsappTest.data}
        testLoading={whatsappTest.isLoading || whatsappTest.isFetching}
        onRetryTest={() => {
          void whatsappTest.refetch()
        }}
      />
    </>
  )
}
