"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { cn } from "@workspace/ui/lib/utils"
import { Input } from "@workspace/ui/components/primitives/input"
import {
  Wizard,
  WizardActions,
  type WizardStep,
} from "@workspace/ui/components/primitives/wizard"
import {
  FormCard,
  FormSection,
  FormGrid,
  FormField,
} from "@workspace/ui/components/composed/forms/form-primitives"

import {
  createShipmentSchema,
  type CreateShipmentInput,
} from "./create-shipment-schema"
import { useShipmentDraft } from "../../../hooks/use-shipment-draft"

/**
 * V7CreateShipmentWizard — Violet-Grid v7 multi-step wizard for creating
 * a shipment. NextAdmin Phase 4b.
 *
 * Composes:
 *   - FormCard / FormSection / FormGrid / FormField — Phase 4a primitives
 *   - Wizard / WizardActions — existing stepper primitive (LAW 14)
 *   - useShipmentDraft — localStorage draft persistence with 24h TTL
 *
 * Reuses (does not duplicate):
 *   - createShipmentSchema (zod) and CreateShipmentInput (type) from the
 *     v6 form so the live wrapper submits the same payload regardless of
 *     which design version is active.
 *
 * Co-existence: the v6 form remains the default. This v7 wizard only
 * renders when the dashboard route's `useDesignVersion()` returns "v7"
 * (per the established pattern from PRs #62-#70).
 *
 * Critical workflow notes (logistics):
 *   - Drafts persist across reloads so an interrupted operator can resume.
 *   - Drafts older than 24h are evicted on next mount (operators expect
 *     fresh data per shift).
 *   - Submit success → draft cleared → caller redirects to /shipments/[awb].
 *   - Submit failure → draft preserved (the operator can fix and retry).
 */

const STEPS: WizardStep[] = [
  { id: "sender", label: "Sender" },
  { id: "receiver", label: "Receiver" },
  { id: "package", label: "Package & service" },
  { id: "review", label: "Review" },
]

// Per-step field lists for `trigger()` validation when advancing.
const STEP_FIELDS: (keyof CreateShipmentInput)[][] = [
  [
    "senderName",
    "senderPhone",
    "senderAddress",
    "senderCity",
    "senderState",
    "senderPincode",
  ],
  [
    "receiverName",
    "receiverPhone",
    "receiverAddress",
    "receiverCity",
    "receiverState",
    "receiverPincode",
  ],
  [
    "weight",
    "length",
    "breadth",
    "height",
    "declaredValue",
    "description",
    "paymentMode",
    "serviceType",
  ],
  [],
]

interface V7CreateShipmentWizardProps {
  /** Final-submit handler. Called once on the last step with validated payload. */
  onSubmit: (data: CreateShipmentInput) => Promise<void> | void
  /** Disables the primary action while the parent flushes the network request. */
  isLoading?: boolean
  className?: string
}

function V7CreateShipmentWizard({
  onSubmit,
  isLoading,
  className,
}: V7CreateShipmentWizardProps) {
  const { draft, save, clear } = useShipmentDraft<Partial<CreateShipmentInput>>()

  const [step, setStep] = React.useState(0)

  // In-flight latch — catches the second of two rapid handler invocations.
  // The isLoading prop only flips true once the parent's network mutation
  // is in flight, which is too late: a rapid Next double-click both enters
  // the body while trigger() is still async, and a rapid Enter mash during
  // the final-step handleSubmit window both run before isLoading observes
  // the pending state. Both are operationally serious in a logistics
  // workflow — double-stepped wizards skip validation, double-submits
  // create duplicate shipments. The ref version is set/cleared
  // synchronously around the entire awaited body so the second invocation
  // returns instantly.
  const isInFlightRef = React.useRef(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
    watch,
  } = useForm<CreateShipmentInput>({
    resolver: zodResolver(createShipmentSchema),
    mode: "onBlur",
    // Hydrate from a fresh draft if one exists; otherwise fall back to
    // sane defaults. Without explicit defaults the enum-typed fields
    // would render as empty selects which the schema would reject as
    // soon as validation runs.
    defaultValues: {
      paymentMode: "PAID",
      serviceType: "STANDARD",
      ...draft,
    } as Partial<CreateShipmentInput>,
  })

  // Auto-save: subscribe to RHF changes and forward to the debounced hook.
  React.useEffect(() => {
    const sub = watch((values) => {
      save(values as Partial<CreateShipmentInput>)
    })
    return () => sub.unsubscribe()
  }, [watch, save])

  const isLastStep = step === STEPS.length - 1

  async function handleAdvanceOrSubmit() {
    // Re-entrancy guard. Two cases to defend against, both operationally
    // serious in a logistics workflow:
    //   (a) Enter-mashing during the final-step submit fires the form's
    //       onFormSubmit multiple times before isLoading flips true,
    //       creating duplicate shipments.
    //   (b) Rapid Next double-clicks on step 0/1/2 both enter the body
    //       while trigger() is still resolving; the second click then
    //       fires its own setStep advance AFTER the first already did,
    //       skipping a validation pass.
    // isLoading covers (a) once the parent reports it. isInFlightRef
    // covers (b) and the small window of (a) before isLoading goes true.
    if (isLoading || isInFlightRef.current) return
    isInFlightRef.current = true
    try {
      if (!isLastStep) {
        const valid = await trigger(STEP_FIELDS[step] ?? [])
        if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1))
        return
      }
      // Last step → run handleSubmit which validates ALL fields one more
      // time (defense against any field that wasn't on STEP_FIELDS).
      await handleSubmit(async (values) => {
        await onSubmit(values)
        // Only clear the draft once the parent's onSubmit resolves
        // successfully. If it throws, the draft is preserved so the
        // operator can fix and retry.
        clear()
      })()
    } finally {
      isInFlightRef.current = false
    }
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  // Allow click-back to any completed step via the stepper.
  function handleStepClick(idx: number) {
    if (idx <= step) setStep(idx)
  }

  // Form's native onSubmit fires when the user presses Enter inside any
  // input. We dispatch to the same handler as the Next/Submit button so
  // both keyboard and pointer paths converge.
  function onFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    void handleAdvanceOrSubmit()
  }

  const values = getValues()

  return (
    <div
      data-slot="v7-create-shipment-wizard"
      className={cn("flex flex-col gap-8", className)}
    >
      <Wizard
        steps={STEPS}
        currentIndex={step}
        onStepClick={handleStepClick}
      />

      <FormCard maxWidth="md" onSubmit={onFormSubmit} noValidate>
        {step === 0 && (
          <FormSection
            title="Sender"
            description="Who is shipping the package?"
          >
            <FormGrid cols={2}>
              <FormField
                fieldId="v7-ship-sender-name"
                controlWidth="lg"
                label="Sender name"
                required
                error={errors.senderName?.message}
              >
                <Input
                  id="v7-ship-sender-name"
                  placeholder="Full name"
                  aria-invalid={errors.senderName ? "true" : undefined}
                  {...register("senderName")}
                />
              </FormField>
              <FormField
                fieldId="v7-ship-sender-phone"
                controlWidth="sm"
                label="Sender phone"
                required
                error={errors.senderPhone?.message}
              >
                <Input
                  id="v7-ship-sender-phone"
                  inputMode="tel"
                  placeholder="9876543210"
                  aria-invalid={errors.senderPhone ? "true" : undefined}
                  {...register("senderPhone")}
                />
              </FormField>
            </FormGrid>
            <FormGrid cols={1}>
              <FormField
                fieldId="v7-ship-sender-addr"
                controlWidth="lg"
                label="Sender address"
                required
                error={errors.senderAddress?.message}
              >
                <Input
                  id="v7-ship-sender-addr"
                  placeholder="Street, building, unit"
                  aria-invalid={errors.senderAddress ? "true" : undefined}
                  {...register("senderAddress")}
                />
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField
                fieldId="v7-ship-sender-city"
                controlWidth="md"
                label="City"
                required
                error={errors.senderCity?.message}
              >
                <Input
                  id="v7-ship-sender-city"
                  aria-invalid={errors.senderCity ? "true" : undefined}
                  {...register("senderCity")}
                />
              </FormField>
              <FormField
                fieldId="v7-ship-sender-state"
                controlWidth="md"
                label="State"
                required
                error={errors.senderState?.message}
              >
                <Input
                  id="v7-ship-sender-state"
                  aria-invalid={errors.senderState ? "true" : undefined}
                  {...register("senderState")}
                />
              </FormField>
              <FormField
                fieldId="v7-ship-sender-pin"
                controlWidth="code"
                label="PIN"
                required
                error={errors.senderPincode?.message}
              >
                <Input
                  id="v7-ship-sender-pin"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit"
                  aria-invalid={errors.senderPincode ? "true" : undefined}
                  {...register("senderPincode")}
                />
              </FormField>
            </FormGrid>
          </FormSection>
        )}

        {step === 1 && (
          <FormSection
            title="Receiver"
            description="Who is receiving the package?"
          >
            <FormGrid cols={2}>
              <FormField
                fieldId="v7-ship-receiver-name"
                controlWidth="lg"
                label="Receiver name"
                required
                error={errors.receiverName?.message}
              >
                <Input
                  id="v7-ship-receiver-name"
                  placeholder="Full name"
                  aria-invalid={errors.receiverName ? "true" : undefined}
                  {...register("receiverName")}
                />
              </FormField>
              <FormField
                fieldId="v7-ship-receiver-phone"
                controlWidth="sm"
                label="Receiver phone"
                required
                error={errors.receiverPhone?.message}
              >
                <Input
                  id="v7-ship-receiver-phone"
                  inputMode="tel"
                  placeholder="9876543210"
                  aria-invalid={errors.receiverPhone ? "true" : undefined}
                  {...register("receiverPhone")}
                />
              </FormField>
            </FormGrid>
            <FormGrid cols={1}>
              <FormField
                fieldId="v7-ship-receiver-addr"
                controlWidth="lg"
                label="Receiver address"
                required
                error={errors.receiverAddress?.message}
              >
                <Input
                  id="v7-ship-receiver-addr"
                  placeholder="Street, building, unit"
                  aria-invalid={errors.receiverAddress ? "true" : undefined}
                  {...register("receiverAddress")}
                />
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField
                fieldId="v7-ship-receiver-city"
                controlWidth="md"
                label="City"
                required
                error={errors.receiverCity?.message}
              >
                <Input
                  id="v7-ship-receiver-city"
                  aria-invalid={errors.receiverCity ? "true" : undefined}
                  {...register("receiverCity")}
                />
              </FormField>
              <FormField
                fieldId="v7-ship-receiver-state"
                controlWidth="md"
                label="State"
                required
                error={errors.receiverState?.message}
              >
                <Input
                  id="v7-ship-receiver-state"
                  aria-invalid={errors.receiverState ? "true" : undefined}
                  {...register("receiverState")}
                />
              </FormField>
              <FormField
                fieldId="v7-ship-receiver-pin"
                controlWidth="code"
                label="PIN"
                required
                error={errors.receiverPincode?.message}
              >
                <Input
                  id="v7-ship-receiver-pin"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit"
                  aria-invalid={errors.receiverPincode ? "true" : undefined}
                  {...register("receiverPincode")}
                />
              </FormField>
            </FormGrid>
          </FormSection>
        )}

        {step === 2 && (
          <FormSection
            title="Package & service"
            description="Dimensions, weight, value, and how the customer is paying."
          >
            <FormGrid cols={2}>
              <FormField
                fieldId="v7-ship-weight"
                controlWidth="sm"
                label="Weight (kg)"
                required
                error={errors.weight?.message}
              >
                <Input
                  id="v7-ship-weight"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="1.50"
                  className="font-mono tabular-nums"
                  aria-invalid={errors.weight ? "true" : undefined}
                  {...register("weight")}
                />
              </FormField>
              <FormField
                fieldId="v7-ship-value"
                controlWidth="sm"
                label="Declared value (₹)"
                required
                error={errors.declaredValue?.message}
              >
                <Input
                  id="v7-ship-value"
                  type="number"
                  inputMode="numeric"
                  placeholder="500"
                  className="font-mono tabular-nums"
                  aria-invalid={errors.declaredValue ? "true" : undefined}
                  {...register("declaredValue")}
                />
              </FormField>
              <FormField
                fieldId="v7-ship-len"
                controlWidth="sm"
                label="Length (cm)"
                required
                error={errors.length?.message}
              >
                <Input
                  id="v7-ship-len"
                  type="number"
                  inputMode="numeric"
                  placeholder="30"
                  className="font-mono tabular-nums"
                  aria-invalid={errors.length ? "true" : undefined}
                  {...register("length")}
                />
              </FormField>
              <FormField
                fieldId="v7-ship-bre"
                controlWidth="sm"
                label="Breadth (cm)"
                required
                error={errors.breadth?.message}
              >
                <Input
                  id="v7-ship-bre"
                  type="number"
                  inputMode="numeric"
                  placeholder="20"
                  className="font-mono tabular-nums"
                  aria-invalid={errors.breadth ? "true" : undefined}
                  {...register("breadth")}
                />
              </FormField>
              <FormField
                fieldId="v7-ship-hei"
                controlWidth="sm"
                label="Height (cm)"
                required
                error={errors.height?.message}
              >
                <Input
                  id="v7-ship-hei"
                  type="number"
                  inputMode="numeric"
                  placeholder="15"
                  className="font-mono tabular-nums"
                  aria-invalid={errors.height ? "true" : undefined}
                  {...register("height")}
                />
              </FormField>
              <FormField
                fieldId="v7-ship-desc"
                controlWidth="lg"
                label="Description"
                required
                error={errors.description?.message}
              >
                <Input
                  id="v7-ship-desc"
                  placeholder="Electronic items"
                  aria-invalid={errors.description ? "true" : undefined}
                  {...register("description")}
                />
              </FormField>
              <FormField
                fieldId="v7-ship-pay"
                label="Payment mode"
                required
                error={errors.paymentMode?.message}
              >
                {/* eslint-disable-next-line no-restricted-syntax -- Native select: Radix Select doesn't compose with RHF register() without Controller; keyboard-accessible, screen-reader friendly */}
                <select
                  id="v7-ship-pay"
                  className="border-input bg-background h-9 w-full border px-3 text-sm font-sans"
                  aria-invalid={errors.paymentMode ? "true" : undefined}
                  {...register("paymentMode")}
                >
                  <option value="TO_PAY">To pay</option>
                  <option value="PAID">Paid</option>
                  <option value="TBB">To be billed</option>
                </select>
              </FormField>
              <FormField
                fieldId="v7-ship-svc"
                label="Service type"
                required
                error={errors.serviceType?.message}
              >
                {/* eslint-disable-next-line no-restricted-syntax -- Native select: same rationale as paymentMode above */}
                <select
                  id="v7-ship-svc"
                  className="border-input bg-background h-9 w-full border px-3 text-sm font-sans"
                  aria-invalid={errors.serviceType ? "true" : undefined}
                  {...register("serviceType")}
                >
                  <option value="STANDARD">Standard</option>
                  <option value="EXPRESS">Express</option>
                  <option value="PRIORITY">Priority</option>
                </select>
              </FormField>
            </FormGrid>
          </FormSection>
        )}

        {step === 3 && (
          <FormSection
            title="Review"
            description="Confirm the details before creating the shipment."
          >
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {[
                ["Sender", values.senderName],
                ["Sender phone", values.senderPhone],
                [
                  "Sender address",
                  values.senderAddress &&
                    `${values.senderAddress}, ${values.senderCity ?? ""} ${
                      values.senderPincode ?? ""
                    }`,
                ],
                ["Receiver", values.receiverName],
                ["Receiver phone", values.receiverPhone],
                [
                  "Receiver address",
                  values.receiverAddress &&
                    `${values.receiverAddress}, ${values.receiverCity ?? ""} ${
                      values.receiverPincode ?? ""
                    }`,
                ],
                ["Weight", values.weight ? `${values.weight} kg` : undefined],
                [
                  "Dimensions",
                  values.length
                    ? `${values.length} × ${values.breadth} × ${values.height} cm`
                    : undefined,
                ],
                [
                  "Declared value",
                  // Use != null (not truthy) so a legitimate ₹0 declared value
                  // renders correctly. Schema permits min(0); the review screen
                  // should match.
                  values.declaredValue != null
                    ? `₹${values.declaredValue}`
                    : undefined,
                ],
                ["Payment", values.paymentMode],
                ["Service", values.serviceType],
                ["Contents", values.description],
              ].map(([label, val]) => (
                <div key={label as string} className="flex flex-col gap-0.5">
                  <dt className="t-overline text-muted-foreground">{label}</dt>
                  <dd className="t-body text-foreground font-mono tabular-nums">
                    {val ?? "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </FormSection>
        )}

        <WizardActions
          currentIndex={step}
          totalSteps={STEPS.length}
          onBack={handleBack}
          onNext={handleAdvanceOrSubmit}
          isSubmitting={isLoading}
          finalLabel="Create shipment"
          submittingLabel="Creating…"
        />
      </FormCard>
    </div>
  )
}

export { V7CreateShipmentWizard }
export type { V7CreateShipmentWizardProps }
