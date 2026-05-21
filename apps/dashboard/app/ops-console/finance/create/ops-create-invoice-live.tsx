"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

import { useCreateInvoice } from "@workspace/services/hooks/use-invoices"
import { useCustomers } from "@workspace/services/hooks/use-customers"
import { useRateLookupMutation } from "@workspace/services/hooks/use-rate-cards"
import { useGenerateAwbNumber } from "@workspace/services/hooks/use-shipments"
import { useNotificationStore } from "@workspace/services/stores/notification.store"
import { normalizeBillingDraft } from "@workspace/services/invoice-draft.service"
import { PaymentMode } from "@workspace/types"
import {
  InvoiceWizard,
  INITIAL_INVOICE_STATE,
  computeInvoiceTotals,
  type InvoiceWizardState,
  type ComboboxOption,
} from "@workspace/ui/components/composed/finance/invoice-wizard"
import { OpsPageHead } from "@workspace/ui/components/composed/ops-console/ops-page-head"
import { OpsButton } from "@workspace/ui/components/composed/ops-console/ops-button"
import { useFormAutosave } from "@workspace/ui/hooks/use-form-autosave"

/**
 * Multi-step invoice wizard — restored 2026-05-13.
 *
 * History: this surface was downgraded to a 5-field MVP form during the
 * shadcn transformation (commit eaa7f67, 2026-05-12). The wizard primitive
 * was never deleted from `packages/ui/src/components/composed/finance/`,
 * so this restoration is a re-wire of the route shell, not a rebuild.
 * See `docs/v6-mvp-regression-audit.md` for the full audit.
 *
 * Features preserved from v6:
 *  - 4-step wizard (Basics → Parties → Cargo → Payment review)
 *  - AWB auto-reservation on mount + ↻ regenerate button
 *  - Rate-card auto-lookup (origin/dest/serviceLevel/weight → ratePerKg,
 *    baseFreight, fuelSurcharge, docketCharge, handlingFee)
 *  - 200-customer combobox with GSTIN/phone meta
 *  - Draft autosave (5s interval, restore prompt on remount, discard button)
 *  - Consignor + consignee blocks
 *  - Structured + legacy billing address (SmartAddressFields)
 *  - GST split (CGST/SGST/IGST)
 *  - Permission-aware error messages (403 RLS / 409 FK)
 *  - Notification store integration (toasts persist to notification panel)
 *
 * Routing: lives at `/ops-console/finance/create`; on success redirects to
 * `/ops-console/finance/<id>` (was `/finance/<id>` in v6, before the
 * single-shell consolidation).
 */

const DRAFT_KEY = "invoice_draft"

function normalizeInvoiceDraft(draft: Partial<InvoiceWizardState>): InvoiceWizardState {
  const merged: InvoiceWizardState = { ...INITIAL_INVOICE_STATE, ...draft }
  return normalizeBillingDraft(merged)
}

export function OpsCreateInvoiceLive() {
  const router = useRouter()
  const addNotification = useNotificationStore((s) => s.addNotification)
  const createInvoice = useCreateInvoice()
  const rateLookup = useRateLookupMutation()
  const generateAwb = useGenerateAwbNumber()
  const { data: customerList } = useCustomers({ pageSize: 200 })

  const customerOptions: ComboboxOption[] = React.useMemo(
    () =>
      (customerList ?? []).map((c) => ({
        value: c.id,
        label: c.name,
        meta: c.gstin ?? c.phone,
      })),
    [customerList],
  )

  const [state, setState] = React.useState<InvoiceWizardState>(INITIAL_INVOICE_STATE)
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isLookingUp, setIsLookingUp] = React.useState(false)
  const [restorePromptShown, setRestorePromptShown] = React.useState(false)

  const patchState = (patch: Partial<InvoiceWizardState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }

  // Autosave the wizard state every 5s under `invoice_draft` so a refresh,
  // accidental nav, or idle-timeout doesn't lose work.
  const autosave = useFormAutosave<InvoiceWizardState>({
    key: DRAFT_KEY,
    value: state,
    intervalMs: 5000,
    shouldPersist: (v) =>
      Boolean(v.awbNumber || v.customerName || v.weightKg || v.baseFreight),
  })

  // On mount: check for an existing draft + prompt restore; otherwise
  // auto-reserve a fresh AWB so the user never has to type one.
  React.useEffect(() => {
    const draft = autosave.readDraft()
    let restored = false
    if (draft && !restorePromptShown) {
      setRestorePromptShown(true)
      const shouldRestore = window.confirm(
        "We found an unfinished invoice draft from a previous session. Restore it?",
      )
      if (shouldRestore) {
        setState(normalizeInvoiceDraft(draft))
        restored = true
      } else {
        autosave.clearDraft()
      }
    }

    if (!restored) {
      generateAwb
        .mutateAsync()
        .then((awb) =>
          setState((prev) => (prev.awbNumber ? prev : { ...prev, awbNumber: awb })),
        )
        .catch((err) => {
          addNotification({
            type: "warning",
            title: "Couldn't auto-generate AWB",
            message: String(err),
          })
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRegenerateAwb() {
    try {
      const awb = await generateAwb.mutateAsync()
      patchState({ awbNumber: awb })
      addNotification({
        type: "success",
        title: "New AWB reserved",
        message: awb,
      })
    } catch (err) {
      addNotification({
        type: "error",
        title: "Could not regenerate AWB",
        message: String(err),
      })
    }
  }

  async function handleRateLookup() {
    const weight = parseFloat(state.weightKg)
    if (!weight || weight <= 0) {
      addNotification({
        type: "warning",
        title: "Enter weight",
        message: "Weight must be > 0 to compute rate",
      })
      return
    }
    setIsLookingUp(true)
    try {
      const rate = await rateLookup.mutateAsync({
        originHub: state.origin,
        destHub: state.destination,
        serviceLevel: state.serviceLevel,
        weight,
      })
      if (!rate) {
        addNotification({
          type: "warning",
          title: "No rate found",
          message: `No active rate card for ${state.origin} → ${state.destination} ${state.serviceLevel}`,
        })
        return
      }
      const baseFreight = Math.round(weight * rate.ratePerKg * 100) / 100
      const fuelSurcharge =
        Math.round(((weight * rate.ratePerKg * rate.fuelSurchargePct) / 100) * 100) /
        100
      patchState({
        ratePerKg: rate.ratePerKg,
        baseFreight,
        docketCharge: rate.docketCharge,
        fuelSurcharge,
        handlingFee: rate.handlingFee,
      })
      addNotification({
        type: "success",
        title: "Charges auto-populated",
        message: `₹${rate.ratePerKg}/kg applied`,
      })
    } catch (err) {
      addNotification({
        type: "error",
        title: "Rate lookup failed",
        message: String(err),
      })
    } finally {
      setIsLookingUp(false)
    }
  }

  async function handleSubmit() {
    const totals = computeInvoiceTotals(state, (state.gstRate ?? 18) / 100)
    try {
      // NOTE: `billing_address` was previously sent here but the `invoices`
      // table has no such column — the value was being silently dropped by
      // Supabase. The form field is retained for now but isn't persisted.
      // Follow-up: either add a migration for the column or move it into
      // `notes`. See docs/CODEBASE-AUDIT-2026-05.md.
      const invoice = await createInvoice.mutateAsync({
        awb_number: state.awbNumber.trim().toUpperCase(),
        customer_id: state.customerId || null,
        customer_name: state.customerName || state.awbNumber.trim().toUpperCase(),
        customer_gstin: state.customerGstin || null,
        payment_mode: state.paymentMode as PaymentMode,
        base_freight: state.baseFreight,
        pickup_charge: state.pickupCharge,
        packing_charge: state.packingCharge,
        docket_charge: state.docketCharge,
        fuel_surcharge: state.fuelSurcharge,
        handling_fee: state.handlingFee,
        insurance: state.insurance,
        discount: state.discount,
        advance_paid: state.advancePaidAmount,
        tax: {
          cgst: totals.gst / 2,
          sgst: totals.gst / 2,
          igst: 0,
          total: totals.gst,
        },
        total_amount: totals.total,
        balance: totals.balance,
        notes: JSON.stringify({
          notes: state.notes,
          remarks: state.remarks,
          bookingDate: state.bookingDate,
          natureOfQuantity: state.natureOfQuantity,
          declaredValue: state.declaredValue,
          consignor: {
            name: state.consignorName,
            phone: state.consignorPhone,
            address: state.consignorAddress,
          },
          consignee: {
            name: state.consigneeName,
            phone: state.consigneePhone,
            address: state.consigneeAddress,
          },
          billingAddress: state.billingAddress,
          billing: {
            line1: state.billingLine1,
            line2: state.billingLine2,
            city: state.billingCity,
            state: state.billingState,
            zip: state.billingZip,
          },
          actualWeightKg: state.actualWeightKg,
          pickupCharge: state.pickupCharge,
          packingCharge: state.packingCharge,
          advancePaidAmount: state.advancePaidAmount,
        }),
      })
      autosave.clearDraft()
      addNotification({
        type: "success",
        title: "Invoice created",
        message: invoice.invoiceNumber ?? "New invoice",
      })
      router.push(`/ops-console/finance/${invoice.id}`)
    } catch (err) {
      const msg = String(err)
      const isPermission =
        msg.includes("403") ||
        msg.includes("row-level security") ||
        msg.includes("permission")
      const isFkViolation =
        msg.includes("409") || msg.includes("foreign key") || msg.includes("violates")
      addNotification({
        type: "error",
        title: "Failed to create invoice",
        message: isPermission
          ? "Insufficient permissions. A Finance role (MANAGER, INVOICE, or FINANCE_STAFF) is required."
          : isFkViolation
            ? "AWB number not found. Enter a valid AWB that exists in the system, or leave it blank."
            : msg,
      })
    }
  }

  return (
    <>
      <OpsPageHead
        eyebrow="Business"
        title="New Invoice"
        sub="Generate an invoice for an AWB with automatic rate-card lookup. Draft autosaves every 5 seconds."
        actions={
          autosave.savedAt ? (
            <div className="flex items-center gap-2 paper-label text-paper-fg-3">
              <span>
                Draft saved · {format(new Date(autosave.savedAt), "HH:mm:ss")}
              </span>
              <OpsButton
                type="button"
                variant="ghost"
                onClick={() => {
                  if (window.confirm("Discard this draft?")) {
                    autosave.clearDraft()
                    setState(INITIAL_INVOICE_STATE)
                    setCurrentIndex(0)
                  }
                }}
              >
                Discard
              </OpsButton>
            </div>
          ) : undefined
        }
      />
      <InvoiceWizard
        state={state}
        onChange={patchState}
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
        onRateLookup={handleRateLookup}
        isLookingUp={isLookingUp}
        onSubmit={handleSubmit}
        isSubmitting={createInvoice.isPending}
        onCancel={() => router.back()}
        customerOptions={customerOptions}
        onRegenerateAwb={handleRegenerateAwb}
        isGeneratingAwb={generateAwb.isPending}
      />
    </>
  )
}
