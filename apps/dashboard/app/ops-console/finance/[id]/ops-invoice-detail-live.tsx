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
  DetailShell,
  FIELD_LABEL,
  STATUS_TONE_CLASS,
} from "@workspace/ui/components/composed/detail-shell"
import { SurfaceCard } from "@workspace/ui/components/composed/surface-card"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/primitives/skeleton"
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
 * Violet Grid v7 invoice detail (Phase 10b in-place re-tokenize). 1:1 feature
 * parity with the prior paper view — WhatsApp send (kill-switch aware), payment
 * recording (with PaymentResponseLostError + Sentry capture), PDF/label print
 * routes, issue / mark-paid / cancel transitions. Only the visual chrome moved
 * from the Paper Ops Console primitives (OpsDetailFrame/OpsCard/OpsBadge/
 * OpsButton/OpsSkeleton) to v7 primitives (PageShell + inline header + 8/4
 * SurfaceCard grid). No services, hooks, or handlers changed.
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

// Math-display row — label left, value right (justify-between), value in
// `.t-mono` (0.8125rem mono + tabular-nums, matching the v6 font-mono
// text-ui-13 tabular-nums). Column count, alignment, mono, and tabular-nums
// preserved 1:1 from the paper version.
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
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2 last:border-b-0">
      <span className={FIELD_LABEL}>{label}</span>
      <span
        className={cn(
          "t-mono",
          accent ? "text-primary font-semibold" : "text-foreground",
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
      <p className={FIELD_LABEL}>{label}</p>
      <p className="font-mono text-xs text-foreground whitespace-pre-line break-words">
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
  const { data: rawPayments } = usePaymentsForInvoice(id)
  const payments = React.useMemo(() => rawPayments ?? [], [rawPayments])
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
      <DetailShell eyebrow="Invoice" title="…" backHref="/ops-console/finance">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </DetailShell>
    )
  }

  if (!invoice) {
    return (
      <DetailShell eyebrow="Invoice" title={id} backHref="/ops-console/finance">
        <div className="border border-destructive/40 border-l-indicator border-l-destructive bg-destructive/15 p-6 flex items-start gap-3">
          <RiErrorWarningLine
            aria-hidden
            className="size-5 text-destructive shrink-0"
          />
          <div>
            <div className="font-mono text-2xs uppercase tracking-widest text-destructive">
              NOT FOUND
            </div>
            <p className="t-body-sm mt-1">Could not load invoice.</p>
          </div>
        </div>
      </DetailShell>
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
      <DetailShell
        eyebrow="Invoice"
        title={invoice.invoiceNumber}
        sub={`${invoice.customerName}${invoice.awbNumber ? ` · AWB ${invoice.awbNumber}` : ""}`}
        backHref="/ops-console/finance"
        status={
          <Badge
            variant="outline"
            className={cn(
              "font-mono uppercase tracking-tag",
              STATUS_TONE_CLASS[STATUS_TONE[invoice.status] ?? "neutral"],
            )}
          >
            {invoice.status}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/print/invoice/${id}`, "_blank")}
            >
              <RiEyeLine aria-hidden className="size-3" />
              Preview
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/print/invoice/${id}?print=1`, "_blank")}
            >
              <RiPrinterLine aria-hidden className="size-3" />
              Print / PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(`/print/invoice-label/${id}?print=1`, "_blank")
              }
            >
              <RiBarcodeBoxLine aria-hidden className="size-3" />
              Label
            </Button>
            {invoice.status !== InvoiceStatus.CANCELLED && (
              <Button
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
              </Button>
            )}
          </div>
        }
        aside={
          <>
            <SurfaceCard density="compact">
              <div className={FIELD_LABEL}>Total</div>
              <div className="t-data-md text-foreground mt-1">
                {fmtINR(invoice.totalAmount)}
              </div>
            </SurfaceCard>
            <SurfaceCard density="compact">
              <div className={FIELD_LABEL}>Balance Due</div>
              <div
                className={cn(
                  "t-data-md mt-1",
                  invoice.balance > 0 ? "text-accent-warning" : "text-accent-success",
                )}
              >
                {fmtINR(invoice.balance)}
              </div>
              {invoice.advancePaid > 0 && (
                <div className={cn(FIELD_LABEL, "mt-2")}>
                  Advance {fmtINR(invoice.advancePaid)}
                </div>
              )}
            </SurfaceCard>
            <SurfaceCard density="compact">
              <div className={cn(FIELD_LABEL, "mb-1")}>Created</div>
              <div className="t-mono">{fmtDate(invoice.createdAt)}</div>
              {invoice.issuedAt && (
                <>
                  <div className={cn(FIELD_LABEL, "mb-1 mt-3")}>Issued</div>
                  <div className="t-mono">{fmtDate(invoice.issuedAt)}</div>
                </>
              )}
              {invoice.dueDate && (
                <>
                  <div className={cn(FIELD_LABEL, "mb-1 mt-3")}>Due</div>
                  <div className="t-mono">{fmtDate(invoice.dueDate)}</div>
                </>
              )}
            </SurfaceCard>
          </>
        }
      >
        <SurfaceCard>
          <div className="flex items-start justify-between gap-4 border-b border-border pb-3 mb-4">
            <div className="space-y-0.5">
              <p className={FIELD_LABEL}>Invoice</p>
              <p className="font-sans text-base font-bold uppercase tracking-wide text-primary">
                {invoice.invoiceNumber}
              </p>
            </div>
            <div className="space-y-0.5 text-right">
              <p className={FIELD_LABEL}>AWB</p>
              <p className="t-mono font-semibold">{invoice.awbNumber || "—"}</p>
              {invoice.issuedAt && (
                <p className="font-mono text-2xs text-muted-foreground">
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

          <div className="flex items-center justify-between border-t-2 border-foreground/80 pt-3 mt-3">
            <span className="font-mono text-xs font-bold uppercase tracking-badge text-foreground">
              Total
            </span>
            <span className="font-sans text-lg font-bold tabular-nums text-primary">
              {fmtINR(invoice.totalAmount)}
            </span>
          </div>

          <div className="space-y-0 border-t border-dashed border-border pt-2 mt-2">
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
        </SurfaceCard>

        {parsedNotes &&
          (parsedNotes.consignor ||
            parsedNotes.consignee ||
            parsedNotes.bookingDate ||
            parsedNotes.natureOfQuantity ||
            parsedNotes.declaredValue) && (
            <SurfaceCard>
              <div className={cn(FIELD_LABEL, "mb-3")}>Shipment metadata</div>

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
                <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 mt-4 sm:grid-cols-2">
                  {parsedNotes.consignor && (
                    <div className="space-y-1.5">
                      <p className={cn(FIELD_LABEL, "text-primary")}>Consignor</p>
                      <MetaField label="Name" value={parsedNotes.consignor.name} />
                      <MetaField label="Phone" value={parsedNotes.consignor.phone} />
                      <MetaField label="Address" value={parsedNotes.consignor.address} />
                    </div>
                  )}
                  {parsedNotes.consignee && (
                    <div className="space-y-1.5">
                      <p className={cn(FIELD_LABEL, "text-primary")}>Consignee</p>
                      <MetaField label="Name" value={parsedNotes.consignee.name} />
                      <MetaField label="Phone" value={parsedNotes.consignee.phone} />
                      <MetaField label="Address" value={parsedNotes.consignee.address} />
                    </div>
                  )}
                </div>
              )}

              {(parsedNotes.freeText || parsedNotes.remarks) && (
                <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 mt-4 sm:grid-cols-2">
                  <MetaField label="Notes" value={parsedNotes.freeText} />
                  <MetaField label="Remarks" value={parsedNotes.remarks} />
                </div>
              )}
            </SurfaceCard>
          )}

        <SurfaceCard>
          <div className={cn(FIELD_LABEL, "mb-3")}>Actions</div>
          <div className="flex flex-wrap items-center gap-2">
            {invoice.status === InvoiceStatus.DRAFT && (
              <Button size="sm" onClick={handleIssue} disabled={isActionLoading}>
                Issue Invoice
              </Button>
            )}
            {invoice.status === InvoiceStatus.ISSUED && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecordOpen(true)}
                  disabled={isActionLoading || invoice.balance <= 0}
                >
                  <RiMoneyDollarCircleLine aria-hidden className="size-3" />
                  Record Payment
                </Button>
                <Button size="sm" onClick={handleMarkPaid} disabled={isActionLoading}>
                  Mark Fully Paid
                </Button>
              </>
            )}
            {(invoice.status === InvoiceStatus.DRAFT ||
              invoice.status === InvoiceStatus.ISSUED) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
                disabled={isActionLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </SurfaceCard>

        <PaymentTimeline payments={payments} onDelete={handleDeletePayment} />
      </DetailShell>

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
