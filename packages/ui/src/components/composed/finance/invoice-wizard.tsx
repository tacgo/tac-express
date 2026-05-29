/* eslint-disable no-restricted-syntax -- v6-era invoice wizard with 20+ raw form controls
   (input/select/textarea). Pending migration to shadcn Input/Select/Textarea primitives;
   native selects here use direct onChange that doesn't compose with Radix Select without
   Controller wrappers. Track migration in a dedicated form-primitives phase. */
"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Combobox, type ComboboxOption } from "@workspace/ui/components/primitives/combobox"
import {
  SmartAddressFields,
  type SmartAddressValue,
} from "@workspace/ui/components/composed/smart-address-fields"
import {
  Wizard,
  WizardActions,
  type WizardStep,
} from "@workspace/ui/components/primitives/wizard"
import {
  RiCalculatorLine,
  RiCloseLine,
  RiRefreshLine,
} from "@workspace/ui/icons"

export type { ComboboxOption }

/**
 * Serialise the SmartAddressFields struct back to the legacy single-string
 * `billingAddress` shape that downstream invoice persistence + print view
 * already consume.
 */
function joinBillingAddress(parts: {
  line1?: string
  line2?: string
  city?: string
  state?: string
  zip?: string
}): string {
  const segments = [
    parts.line1?.trim(),
    parts.line2?.trim(),
    [parts.city?.trim(), parts.state?.trim()].filter(Boolean).join(", "),
    parts.zip?.trim(),
  ].filter((seg): seg is string => Boolean(seg && seg.length > 0))
  return segments.join(", ")
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type PaymentModeLiteral = "PAID" | "TO_PAY" | "TBB"
export type ServiceLevelLiteral = "STANDARD" | "PRIORITY" | "EXPRESS"
export type HubCodeLiteral = "IMPHAL" | "NEW_DELHI" | "GUWAHATI"

export interface InvoiceWizardState {
  // Basics
  awbNumber: string
  bookingDate: string
  paymentMode: PaymentModeLiteral
  natureOfQuantity: string
  declaredValue: string
  remarks: string
  notes: string

  // Parties (Legacy Customer + Consignor/Consignee)
  customerId: string
  customerName: string
  customerGstin: string
  /**
   * Joined billing address (street, city, state PIN). Auto-derived from the
   * structured `billing*` fields below; kept as a single string for legacy
   * consumers (print view, downstream invoice persistence).
   */
  billingAddress: string
  /** Structured billing-address parts driven by SmartAddressFields. */
  billingLine1: string
  billingLine2: string
  billingCity: string
  billingState: string
  billingZip: string
  consignorName: string
  consignorPhone: string
  consignorAddress: string
  consigneeName: string
  consigneePhone: string
  consigneeAddress: string

  // Cargo / Rate Lookup
  origin: HubCodeLiteral
  destination: HubCodeLiteral
  serviceLevel: ServiceLevelLiteral
  actualWeightKg: string
  weightKg: string
  pieces: string
  /** ₹ per kg — drives base freight auto-calculation; default 150. Not persisted to DB. */
  ratePerKg: number

  // Payment / Charges
  baseFreight: number
  pickupCharge: number
  packingCharge: number
  docketCharge: number
  fuelSurcharge: number
  handlingFee: number
  insurance: number
  discount: number
  advancePaidAmount: number
  /** GST rate as a whole number (0 | 5 | 12 | 18). Default 18. Drives CGST/SGST split. */
  gstRate: number
}

export const INVOICE_WIZARD_STEPS: WizardStep[] = [
  { id: "basics", label: "Basics" },
  { id: "parties", label: "Parties" },
  { id: "cargo", label: "Cargo" },
  { id: "payment", label: "Charges" },
]

export const INITIAL_INVOICE_STATE: InvoiceWizardState = {
  awbNumber: "",
  bookingDate: new Date().toISOString().split("T")[0] || "",
  paymentMode: "PAID",
  natureOfQuantity: "Others",
  declaredValue: "USED",
  remarks: "",
  notes: "",
  customerId: "",
  customerName: "",
  customerGstin: "",
  billingAddress: "",
  billingLine1: "",
  billingLine2: "",
  billingCity: "",
  billingState: "",
  billingZip: "",
  consignorName: "",
  consignorPhone: "",
  consignorAddress: "",
  consigneeName: "",
  consigneePhone: "",
  consigneeAddress: "",
  origin: "IMPHAL",
  destination: "NEW_DELHI",
  serviceLevel: "STANDARD",
  actualWeightKg: "",
  weightKg: "",
  pieces: "1",
  ratePerKg: 150,
  baseFreight: 0,
  pickupCharge: 0,
  packingCharge: 0,
  docketCharge: 0,
  fuelSurcharge: 0,
  handlingFee: 0,
  insurance: 0,
  discount: 0,
  advancePaidAmount: 0,
  gstRate: 18,
}

/* ------------------------------------------------------------------ */
/*  Shared field primitives                                           */
/* ------------------------------------------------------------------ */

interface FieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
  error?: string
  className?: string
  /**
   * Ergonomic control width — a field's width signals its expected input
   * length (a date never looks like a 40-char address). Defaults to `lg`
   * (40ch) so fields never stretch the full column. Use `full` only for
   * textareas / address blocks that genuinely need the cell width. Maps to the
   * shared `--spacing-field-*` tokens — same vocabulary as the shipment wizard.
   */
  width?: "sm" | "md" | "lg" | "full"
}

const FIELD_WIDTH: Record<NonNullable<FieldProps["width"]>, string> = {
  sm: "max-w-field-sm",
  md: "max-w-field-md",
  lg: "max-w-field-lg",
  full: "",
}

function Field({ label, required, children, hint, error, className, width = "lg" }: FieldProps) {
  const widthClass = FIELD_WIDTH[width]
  // a11y: implicit label-input association — the <label> element wraps the
  // children so any interactive descendant (<input>, <select>, <textarea>)
  // is associated with the label without needing a generated `htmlFor`+`id`
  // pair. Fixes axe `label` + `select-name` violations the R0.1 re-audit
  // surfaced inside this primitive (see docs/r0-audit-findings.md § C4/C5).
  //
  // The label text lives in a <span> child so the label is structural
  // rather than visual; layout uses `space-y-1.5` on the label itself.
  return (
    <div className={cn("space-y-2", className)} data-slot="wizard-field">
      <label className="block space-y-2">
        <span className="flex items-center gap-1 font-mono text-2xs uppercase tracking-widest text-muted-foreground">
          {label}
          {required && <span className="text-destructive">*</span>}
        </span>
        {widthClass ? <div className={widthClass}>{children}</div> : children}
      </label>
      {hint && !error && (
        <p className="font-sans text-xs text-muted-foreground/70">{hint}</p>
      )}
      {error && (
        <p className="font-sans text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}

const inputClass =
  "h-9 w-full border border-border bg-background px-3 font-sans text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
const monoInputClass =
  "h-9 w-full border border-border bg-background px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
const selectClass =
  "h-9 w-full border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"

/* ------------------------------------------------------------------ */
/*  Step 1: Basics                                                    */
/* ------------------------------------------------------------------ */

function BasicsStep({
  state,
  onChange,
  errors,
  onRegenerateAwb,
  isGeneratingAwb,
}: {
  state: InvoiceWizardState
  onChange: (patch: Partial<InvoiceWizardState>) => void
  errors: Partial<Record<keyof InvoiceWizardState, string>>
  /** Optional — when provided, renders a regenerate button next to the AWB field. */
  onRegenerateAwb?: () => void
  isGeneratingAwb?: boolean
}) {
  return (
    <div className="space-y-6" data-slot="basics-step">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field
          label="AWB Number"
          required
          error={errors.awbNumber}
          hint={
            onRegenerateAwb
              ? "Auto-generated. Override only if invoicing an existing shipment."
              : "Must match an existing shipment AWB"
          }
        >
          <div className="flex items-center gap-1">
            <input
              value={state.awbNumber}
              onChange={(e) => onChange({ awbNumber: e.target.value.toUpperCase() })}
              placeholder="TAC2604300001"
              className={monoInputClass}
              autoFocus
            />
            {onRegenerateAwb && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Regenerate AWB number"
                onClick={onRegenerateAwb}
                disabled={isGeneratingAwb}
                className="h-12 w-12 shrink-0 border border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
              >
                <RiRefreshLine
                  className={cn("h-3.5 w-3.5", isGeneratingAwb && "animate-spin")}
                  aria-hidden="true"
                />
              </Button>
            )}
          </div>
        </Field>
        <Field label="Date of Booking" required width="sm">
          <input
            type="date"
            value={state.bookingDate}
            onChange={(e) => onChange({ bookingDate: e.target.value })}
            className={monoInputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Field label="Payment Mode" required width="md">
          <select
            value={state.paymentMode}
            onChange={(e) => onChange({ paymentMode: e.target.value as PaymentModeLiteral })}
            className={selectClass}
          >
            <option value="PAID">PAID — Prepaid</option>
            <option value="TO_PAY">TO PAY — Cash on delivery</option>
            <option value="TBB">TBB — To be billed</option>
          </select>
        </Field>
        <Field label="Nature of Quantity" width="md">
          <input
            value={state.natureOfQuantity}
            onChange={(e) => onChange({ natureOfQuantity: e.target.value })}
            placeholder="Others, Documents, etc."
            className={inputClass}
          />
        </Field>
        <Field label="Declared Value" width="md">
          <input
            value={state.declaredValue}
            onChange={(e) => onChange({ declaredValue: e.target.value })}
            placeholder="USED, etc."
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Remarks" hint="Optional — printed on invoice" width="full">
          <textarea
            value={state.remarks}
            onChange={(e) => onChange({ remarks: e.target.value })}
            rows={2}
            className={cn(inputClass, "h-auto py-2 resize-none")}
            placeholder="DUE, etc."
          />
        </Field>
        <Field label="Internal Notes" hint="Optional — not printed on invoice" width="full">
          <textarea
            value={state.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={2}
            className={cn(inputClass, "h-auto py-2 resize-none")}
            placeholder="Special handling requirements, reference IDs, etc."
          />
        </Field>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 2: Parties                                                   */
/* ------------------------------------------------------------------ */

function PartiesStep({
  state,
  onChange,
  errors,
  customerOptions = [],
}: {
  state: InvoiceWizardState
  onChange: (patch: Partial<InvoiceWizardState>) => void
  errors: Partial<Record<keyof InvoiceWizardState, string>>
  customerOptions?: ComboboxOption[]
}) {
  const hasCustomerOptions = customerOptions.length > 0

  /** Indian GSTIN is always exactly 15 characters (2-digit state code + 13 alphanumeric). */
  const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z]$/i

  function handleCustomerSelect(id: string) {
    const opt = customerOptions.find((o) => o.value === id)
    if (!opt) return
    const isGstin = Boolean(opt.meta) && GSTIN_RE.test(opt.meta!)
    onChange({
      customerId: id,
      customerName: opt.label,
      // Only populate GSTIN if the meta field actually looks like a GSTIN (not a phone number).
      customerGstin: isGstin ? opt.meta! : "",
    })
  }

  function handleClearCustomer() {
    onChange({ customerId: "", customerName: "", customerGstin: "" })
  }

  return (
    <div className="space-y-6" data-slot="parties-step">
      <div className="space-y-6">
        <p className="font-mono text-xs uppercase tracking-widest text-primary border-b border-border pb-1">Billing Party</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Customer lookup — combobox when options available, text when none */}
          {hasCustomerOptions ? (
            <Field
              label="Customer"
              required
              error={errors.customerName}
              hint={state.customerId ? `ID: ${state.customerId.slice(0, 8)}…` : "Search by name"}
            >
              <div className="flex items-center gap-1">
                <Combobox
                  options={customerOptions}
                  value={state.customerId || undefined}
                  onChange={handleCustomerSelect}
                  placeholder="Select customer…"
                  searchPlaceholder="Search by name…"
                  emptyMessage="No matching customer."
                  triggerClassName="h-12 border-border font-sans text-sm normal-case tracking-normal"
                />
                {state.customerId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Clear customer"
                    onClick={handleClearCustomer}
                    className="h-12 w-12 shrink-0 border border-border text-muted-foreground hover:border-destructive/60 hover:text-destructive"
                  >
                    <RiCloseLine className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </Field>
          ) : (
            <Field label="Customer Name" required error={errors.customerName}>
              <input
                value={state.customerName}
                onChange={(e) => onChange({ customerName: e.target.value })}
                placeholder="Customer / Company name"
                className={inputClass}
              />
            </Field>
          )}

          <Field label="Customer GSTIN" hint="Optional — 15 character identifier" width="md">
            <input
              value={state.customerGstin}
              onChange={(e) => onChange({ customerGstin: e.target.value.toUpperCase() })}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
              className={monoInputClass}
            />
          </Field>

          {/* Show name override only when a customer was auto-selected (for minor corrections) */}
          {hasCustomerOptions && (
            <Field label="Customer Name" required error={errors.customerName} hint="Auto-filled from customer record">
              <input
                value={state.customerName}
                onChange={(e) => onChange({ customerName: e.target.value })}
                placeholder="Or type directly"
                className={inputClass}
              />
            </Field>
          )}

          <div className="md:col-span-2">
            <SmartAddressFields
              label="Billing address"
              value={
                {
                  line1: state.billingLine1,
                  line2: state.billingLine2,
                  city: state.billingCity,
                  state: state.billingState,
                  zip: state.billingZip,
                } satisfies SmartAddressValue
              }
              onChange={(next) => {
                // Capture EVERY field SmartAddressFields tracks. Earlier
                // versions destructured only line1/city/state/zip — line2
                // keystrokes were silently dropped (Macroscope flagged this).
                const nextLine1 = next.line1 ?? ""
                const nextLine2 = next.line2 ?? ""
                const nextCity = next.city ?? ""
                const nextState = next.state ?? ""
                const nextZip = next.zip ?? ""
                onChange({
                  billingLine1: nextLine1,
                  billingLine2: nextLine2,
                  billingCity: nextCity,
                  billingState: nextState,
                  billingZip: nextZip,
                  billingAddress: joinBillingAddress({
                    line1: nextLine1,
                    line2: nextLine2,
                    city: nextCity,
                    state: nextState,
                    zip: nextZip,
                  }),
                })
              }}
              idPrefix="invoice-billing"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
        {/* Consignor */}
        <div className="space-y-6">
          <p className="t-overline text-muted-foreground border-b border-border pb-1">Consignor</p>
          <Field label="Name">
            <input
              value={state.consignorName}
              onChange={(e) => onChange({ consignorName: e.target.value })}
              placeholder="Sender Name"
              className={inputClass}
            />
          </Field>
          <Field label="Phone" width="md">
            <input
              value={state.consignorPhone}
              onChange={(e) => onChange({ consignorPhone: e.target.value })}
              placeholder="Phone Number"
              className={monoInputClass}
            />
          </Field>
          <Field label="Address" width="full">
            <textarea
              value={state.consignorAddress}
              onChange={(e) => onChange({ consignorAddress: e.target.value })}
              rows={2}
              className={cn(inputClass, "h-auto py-2 resize-none")}
              placeholder="Origin Address"
            />
          </Field>
        </div>

        {/* Consignee */}
        <div className="space-y-6">
          <p className="t-overline text-muted-foreground border-b border-border pb-1">Consignee</p>
          <Field label="Name">
            <input
              value={state.consigneeName}
              onChange={(e) => onChange({ consigneeName: e.target.value })}
              placeholder="Receiver Name"
              className={inputClass}
            />
          </Field>
          <Field label="Phone" width="md">
            <input
              value={state.consigneePhone}
              onChange={(e) => onChange({ consigneePhone: e.target.value })}
              placeholder="Phone Number"
              className={monoInputClass}
            />
          </Field>
          <Field label="Address" width="full">
            <textarea
              value={state.consigneeAddress}
              onChange={(e) => onChange({ consigneeAddress: e.target.value })}
              rows={2}
              className={cn(inputClass, "h-auto py-2 resize-none")}
              placeholder="Destination Address"
            />
          </Field>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 3: Cargo / Rate Lookup                                       */
/* ------------------------------------------------------------------ */

export interface RateLookupResult {
  ratePerKg: number
  docketCharge: number
  fuelSurchargePct: number
  handlingFee: number
}

function CargoStep({
  state,
  onChange,
  errors,
  onRateLookup,
  isLookingUp,
}: {
  state: InvoiceWizardState
  onChange: (patch: Partial<InvoiceWizardState>) => void
  errors: Partial<Record<keyof InvoiceWizardState, string>>
  onRateLookup?: () => void
  isLookingUp?: boolean
}) {
  const weight = parseFloat(state.weightKg) || 0
  const rate = state.ratePerKg || 0

  /** Changing weight re-derives base freight from the current per-kg rate. */
  function handleWeightChange(val: string) {
    const w = parseFloat(val) || 0
    onChange({
      weightKg: val,
      baseFreight: rate > 0 ? Math.round(w * rate * 100) / 100 : state.baseFreight,
    })
  }

  /** Changing the rate re-derives base freight from the current weight. */
  function handleRateChange(val: string) {
    const r = parseFloat(val) || 0
    onChange({
      ratePerKg: r,
      baseFreight: weight > 0 ? Math.round(weight * r * 100) / 100 : state.baseFreight,
    })
  }

  const computedFreight = weight > 0 && rate > 0 ? Math.round(weight * rate * 100) / 100 : null

  return (
    <div className="space-y-6" data-slot="cargo-step">
      {/* AWB selection prompt — surfaces the AWB chosen in Basics + lets the
          operator override here. Some operators jump straight to the Cargo
          step (e.g. when invoicing an existing shipment), and previously the
          AWB control was only on the Basics step which created confusion. */}
      <Field
        label="AWB / Shipment Number"
        required
        error={errors.awbNumber}
        hint="The shipment this invoice is for. Auto-filled from the Basics step — edit here to invoice a different AWB."
      >
        <input
          value={state.awbNumber}
          onChange={(e) =>
            onChange({ awbNumber: e.target.value.toUpperCase() })
          }
          placeholder="TAC0123456789"
          className={monoInputClass}
          aria-label="AWB number"
          data-slot="cargo-awb-input"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Field label="Origin Hub" required width="md">
          <select
            value={state.origin}
            onChange={(e) => onChange({ origin: e.target.value as HubCodeLiteral })}
            className={selectClass}
          >
            <option value="IMPHAL">IMPHAL</option>
            <option value="NEW_DELHI">NEW DELHI</option>
            <option value="GUWAHATI">GUWAHATI</option>
          </select>
        </Field>
        <Field label="Destination Hub" required width="md">
          <select
            value={state.destination}
            onChange={(e) => onChange({ destination: e.target.value as HubCodeLiteral })}
            className={selectClass}
          >
            <option value="IMPHAL">IMPHAL</option>
            <option value="NEW_DELHI">NEW DELHI</option>
            <option value="GUWAHATI">GUWAHATI</option>
          </select>
        </Field>
        <Field label="Service Level" required width="md">
          <select
            value={state.serviceLevel}
            onChange={(e) => onChange({ serviceLevel: e.target.value as ServiceLevelLiteral })}
            className={selectClass}
          >
            <option value="STANDARD">Standard</option>
            <option value="PRIORITY">Priority</option>
            <option value="EXPRESS">Express</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Field label="Actual Weight (kg)" width="sm">
          <input
            type="number"
            step="0.001"
            min={0}
            value={state.actualWeightKg}
            onChange={(e) => onChange({ actualWeightKg: e.target.value })}
            placeholder="0.000"
            className={monoInputClass}
          />
        </Field>
        <Field label="Chargeable Weight (kg)" required error={errors.weightKg} width="sm">
          <input
            type="number"
            step="0.001"
            min={0}
            value={state.weightKg}
            onChange={(e) => handleWeightChange(e.target.value)}
            placeholder="0.000"
            className={monoInputClass}
          />
        </Field>
        <Field label="Pieces" width="sm">
          <input
            type="number"
            min={1}
            step={1}
            value={state.pieces}
            onChange={(e) => onChange({ pieces: e.target.value })}
            className={monoInputClass}
          />
        </Field>
      </div>

      {/* Per-kg rate row — drives base freight auto-calculation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field
          label="Rate per kg (₹)"
          hint="Base Freight = chargeable weight × rate. Override in Step 4 if needed."
          width="md"
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground pointer-events-none">
              ₹
            </span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={state.ratePerKg}
              onChange={(e) => handleRateChange(e.target.value)}
              placeholder="150.00"
              className={cn(monoInputClass, "pl-7")}
            />
          </div>
        </Field>

        {/* Live computed preview */}
        {computedFreight !== null ? (
          <Field label="Computed Base Freight">
            <div className="flex h-12 items-center border border-primary/20 bg-primary/5 px-3 gap-2">
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {weight} kg × ₹{rate}
              </span>
              <span className="font-mono text-xs text-muted-foreground">=</span>
              <span className="font-mono text-sm font-semibold text-primary tabular-nums">
                ₹{computedFreight.toFixed(2)}
              </span>
              <span className="ml-auto font-mono text-2xs text-muted-foreground/50 uppercase tracking-widest">
                auto-filled
              </span>
            </div>
          </Field>
        ) : (
          <Field label="Computed Base Freight">
            <div className="flex h-12 items-center border border-border/40 bg-muted/20 px-3">
              <span className="font-mono text-xs text-muted-foreground/50">
                Enter weight and rate above
              </span>
            </div>
          </Field>
        )}
      </div>

      {onRateLookup && (
        <div className="flex items-end justify-between gap-3 border border-dashed border-border bg-muted/30 p-3">
          <div className="flex-1">
            <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground mb-0.5">
              Rate Card Lookup
            </p>
            <p className="font-sans text-xs text-muted-foreground">
              Override with active rate card — auto-populates rate/kg, docket, fuel surcharge, and handling.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRateLookup}
            disabled={!weight || isLookingUp}
          >
            <RiCalculatorLine aria-hidden="true" />
            <span className="ml-1.5">{isLookingUp ? "Looking up..." : "Lookup Rate Card"}</span>
          </Button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 4: Charges / Payment                                         */
/* ------------------------------------------------------------------ */

interface ChargeLineDef {
  key: keyof Pick<
    InvoiceWizardState,
    "baseFreight" | "pickupCharge" | "packingCharge" | "docketCharge" | "fuelSurcharge" | "handlingFee" | "insurance" | "discount"
  >
  label: string
  signedNegative?: boolean
}

const CHARGE_LINES: ChargeLineDef[] = [
  { key: "baseFreight", label: "Base Freight" },
  { key: "pickupCharge", label: "Pickup Charge" },
  { key: "packingCharge", label: "Packing" },
  { key: "docketCharge", label: "Docket Charge" },
  { key: "fuelSurcharge", label: "Fuel Surcharge" },
  { key: "handlingFee", label: "Handling Fee" },
  { key: "insurance", label: "Insurance" },
  { key: "discount", label: "Discount", signedNegative: true },
]

export interface InvoiceTotals {
  subtotal: number
  discount: number
  taxable: number
  gst: number
  total: number
  advance: number
  balance: number
}

export function computeInvoiceTotals(state: InvoiceWizardState, gstRate = 0.18): InvoiceTotals {
  const subtotal =
    state.baseFreight +
    (state.pickupCharge || 0) +
    (state.packingCharge || 0) +
    state.docketCharge +
    state.fuelSurcharge +
    state.handlingFee +
    state.insurance
  const discount = state.discount || 0
  const taxable = Math.max(0, subtotal - discount)
  const gst = taxable * gstRate
  const total = taxable + gst
  const advance = state.advancePaidAmount || 0
  const balance = total - advance
  return { subtotal, discount, taxable, gst, total, advance, balance }
}

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const GST_RATE_OPTIONS = [
  { value: 0,  label: "0% — Exempt" },
  { value: 5,  label: "5%" },
  { value: 12, label: "12%" },
  { value: 18, label: "18% — Standard" },
] as const

function PaymentStep({
  state,
  onChange,
}: {
  state: InvoiceWizardState
  onChange: (patch: Partial<InvoiceWizardState>) => void
}) {
  const gstRate = state.gstRate ?? 18
  const totals = computeInvoiceTotals(state, gstRate / 100)
  const cgst = totals.gst / 2
  const sgst = totals.gst / 2

  return (
    <div className="space-y-6" data-slot="payment-step">
      <div className="border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2 gap-4">
          <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
            Line Items
          </p>
          {/* GST rate selector lives here so changes immediately reflect in the totals below */}
          <div className="flex items-center gap-2">
            <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground shrink-0">
              GST Rate
            </label>
            <select
              value={gstRate}
              onChange={(e) => onChange({ gstRate: Number(e.target.value) })}
              className="h-7 border border-border bg-background px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {GST_RATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Charge inputs */}
        <ul className="divide-y divide-border">
          {CHARGE_LINES.map((line) => (
            <li key={line.key} className="flex items-center gap-4 px-4 py-2.5">
              <span className="font-sans text-sm text-foreground flex-1">
                {line.label}
                {line.signedNegative && (
                  <span className="ml-1 font-mono text-2xs text-muted-foreground">(−)</span>
                )}
              </span>
              <div className="relative w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={state[line.key]}
                  onChange={(e) => onChange({ [line.key]: parseFloat(e.target.value) || 0 })}
                  className={cn(monoInputClass, "pl-7 text-right")}
                />
              </div>
            </li>
          ))}
          <li className="flex items-center gap-4 px-4 py-2.5 bg-muted/10 border-t border-border">
            <span className="font-sans text-sm font-semibold text-foreground flex-1">
              Advance Paid Amount
              <span className="ml-1 font-mono text-2xs text-muted-foreground">(−)</span>
            </span>
            <div className="relative w-40">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                ₹
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={state.advancePaidAmount}
                onChange={(e) => onChange({ advancePaidAmount: parseFloat(e.target.value) || 0 })}
                className={cn(monoInputClass, "pl-7 text-right bg-background border-primary/20")}
              />
            </div>
          </li>
        </ul>

        {/* Totals panel */}
        <div className="border-t border-border p-4 space-y-1.5 bg-muted/30">
          <div className="flex items-center justify-between text-sm">
            <span className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
              Subtotal
            </span>
            <span className="font-mono tabular-nums text-foreground">
              {formatINR(totals.subtotal)}
            </span>
          </div>
          {totals.discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
                Discount
              </span>
              <span className="font-mono tabular-nums text-foreground">
                −{formatINR(totals.discount)}
              </span>
            </div>
          )}
          {totals.discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
                Taxable Amount
              </span>
              <span className="font-mono tabular-nums text-foreground">
                {formatINR(totals.taxable)}
              </span>
            </div>
          )}
          {gstRate > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
                  CGST ({gstRate / 2}%)
                </span>
                <span className="font-mono tabular-nums text-foreground">
                  {formatINR(cgst)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
                  SGST ({gstRate / 2}%)
                </span>
                <span className="font-mono tabular-nums text-foreground">
                  {formatINR(sgst)}
                </span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between border-t border-border pt-2 mt-2">
            <span className="tac-mono-label-base text-foreground">
              Total Amount
            </span>
            <span className="t-data-sm text-foreground">
              {formatINR(totals.total)}
            </span>
          </div>
          {totals.advance > 0 && (
            <div className="flex items-center justify-between text-sm pt-1">
              <span className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
                Advance Paid
              </span>
              <span className="font-mono tabular-nums text-foreground">
                −{formatINR(totals.advance)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-primary/20 pt-2 mt-2 bg-primary/5 -mx-4 px-4 pb-2">
            <span className="tac-mono-label">
              Balance Due
            </span>
            <span className="t-data-sm text-primary">
              {formatINR(totals.balance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Wizard Shell                                                      */
/* ------------------------------------------------------------------ */

export interface InvoiceWizardProps {
  state: InvoiceWizardState
  onChange: (patch: Partial<InvoiceWizardState>) => void
  currentIndex: number
  onIndexChange: (index: number) => void
  onRateLookup?: () => void
  isLookingUp?: boolean
  onSubmit: () => void
  isSubmitting?: boolean
  onCancel?: () => void
  /** Customer options for the billing-party combobox. Pass from app layer via useCustomers. */
  customerOptions?: ComboboxOption[]
  /** Called when the user clicks the AWB-regenerate button. Should fetch a new AWB and patch state. */
  onRegenerateAwb?: () => void
  isGeneratingAwb?: boolean
  className?: string
}

export function validateStep(
  index: number,
  state: InvoiceWizardState
): Partial<Record<keyof InvoiceWizardState, string>> {
  const errors: Partial<Record<keyof InvoiceWizardState, string>> = {}
  if (index === 0) {
    if (!state.awbNumber.trim()) errors.awbNumber = "AWB number is required"
    else if (state.awbNumber.trim().length < 6) errors.awbNumber = "AWB must be at least 6 chars"
  }
  if (index === 1) {
    if (!state.customerName.trim()) errors.customerName = "Customer name is required"
  }
  if (index === 2) {
    const w = parseFloat(state.weightKg)
    if (!w || w <= 0) errors.weightKg = "Weight must be greater than 0"
  }
  return errors
}

function InvoiceWizard({
  state,
  onChange,
  currentIndex,
  onIndexChange,
  onRateLookup,
  isLookingUp,
  onSubmit,
  isSubmitting,
  onCancel,
  customerOptions,
  onRegenerateAwb,
  isGeneratingAwb,
  className,
}: InvoiceWizardProps) {
  const [errors, setErrors] = React.useState<Partial<Record<keyof InvoiceWizardState, string>>>({})
  const isLast = currentIndex === INVOICE_WIZARD_STEPS.length - 1

  const handleNext = () => {
    const stepErrors = validateStep(currentIndex, state)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) return
    if (isLast) onSubmit()
    else onIndexChange(currentIndex + 1)
  }

  const handlePrevious = () => {
    setErrors({})
    onIndexChange(currentIndex - 1)
  }

  const handleCancel = onCancel
    ? () => {
        setErrors({})
        onCancel()
      }
    : undefined

  return (
    <div data-slot="invoice-wizard" className={cn("space-y-8", className)}>
      <Wizard
        steps={INVOICE_WIZARD_STEPS}
        currentIndex={currentIndex}
        onStepClick={(idx) => {
          if (idx <= currentIndex) onIndexChange(idx)
        }}
      />

      <div className="border border-border bg-card p-5 shadow-brutal-sm">
        {currentIndex === 0 && (
          <BasicsStep
            state={state}
            onChange={onChange}
            errors={errors}
            onRegenerateAwb={onRegenerateAwb}
            isGeneratingAwb={isGeneratingAwb}
          />
        )}
        {currentIndex === 1 && (
          <PartiesStep
            state={state}
            onChange={onChange}
            errors={errors}
            customerOptions={customerOptions}
          />
        )}
        {currentIndex === 2 && (
          <CargoStep
            state={state}
            onChange={onChange}
            errors={errors}
            onRateLookup={onRateLookup}
            isLookingUp={isLookingUp}
          />
        )}
        {currentIndex === 3 && <PaymentStep state={state} onChange={onChange} />}
      </div>

      <WizardActions
        currentIndex={currentIndex}
        totalSteps={INVOICE_WIZARD_STEPS.length}
        onBack={handlePrevious}
        onCancel={handleCancel}
        onNext={handleNext}
        isSubmitting={isSubmitting}
        finalLabel="CREATE INVOICE"
        submittingLabel="CREATING…"
      />
    </div>
  )
}

export { InvoiceWizard, BasicsStep, PartiesStep, CargoStep, PaymentStep, Field }
