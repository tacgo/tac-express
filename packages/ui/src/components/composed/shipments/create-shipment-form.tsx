"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@workspace/ui/lib/utils"
import {
  Wizard,
  WizardActions,
  type WizardStep,
} from "@workspace/ui/components/primitives/wizard"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  SmartAddressFields,
  type SmartAddressValue,
} from "@workspace/ui/components/composed/smart-address-fields"

import {
  createShipmentSchema,
  type CreateShipmentInput,
} from "./create-shipment-schema"

const STEPS: WizardStep[] = [
  { id: "sender", label: "Sender" },
  { id: "receiver", label: "Receiver" },
  { id: "package", label: "Package" },
  { id: "review", label: "Review" },
]

interface CreateShipmentFormProps {
  onSubmit: (data: CreateShipmentInput) => Promise<void>
  isLoading?: boolean
  className?: string
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="font-mono text-2xs text-destructive mt-0.5">{message}</p>
}

function FormField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label
        htmlFor={htmlFor}
        className="font-mono text-2xs uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </Label>
      {children}
      <FieldError message={error} />
    </div>
  )
}

const INPUT_CLS = "h-8 font-sans text-sm"
const SELECT_TRIGGER_CLS = "h-8 w-full font-sans text-sm"
const SELECT_ITEM_CLS = "font-sans text-sm"

const PAYMENT_MODES = [
  { value: "TO_PAY", label: "To Pay" },
  { value: "PAID", label: "Paid" },
  { value: "TBB", label: "To Be Billed" },
] as const

const SERVICE_TYPES = [
  { value: "STANDARD", label: "Standard" },
  { value: "EXPRESS", label: "Express" },
  { value: "PRIORITY", label: "Priority" },
] as const

function CreateShipmentForm({ onSubmit, isLoading, className }: CreateShipmentFormProps) {
  const [step, setStep] = React.useState(0)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
    watch,
    setValue,
  } = useForm<CreateShipmentInput>({
    resolver: zodResolver(createShipmentSchema),
    mode: "onBlur",
    defaultValues: {
      paymentMode: "TO_PAY",
      serviceType: "STANDARD",
    } as Partial<CreateShipmentInput>,
  })

  // Bridge SmartAddressFields (controlled) into the flat schema fields.
  React.useEffect(() => {
    register("senderAddress")
    register("senderCity")
    register("senderState")
    register("senderPincode")
    register("receiverAddress")
    register("receiverCity")
    register("receiverState")
    register("receiverPincode")
  }, [register])

  const sw = watch([
    "senderAddress",
    "senderCity",
    "senderState",
    "senderPincode",
    "receiverAddress",
    "receiverCity",
    "receiverState",
    "receiverPincode",
  ])
  const senderAddr: SmartAddressValue = {
    line1: sw[0],
    city: sw[1],
    state: sw[2],
    zip: sw[3],
  }
  const receiverAddr: SmartAddressValue = {
    line1: sw[4],
    city: sw[5],
    state: sw[6],
    zip: sw[7],
  }

  const setSenderAddr = (next: SmartAddressValue) => {
    setValue("senderAddress", next.line1 ?? "", { shouldDirty: true })
    setValue("senderCity", next.city ?? "", { shouldDirty: true })
    setValue("senderState", next.state ?? "", { shouldDirty: true })
    setValue("senderPincode", next.zip ?? "", { shouldDirty: true })
  }
  const setReceiverAddr = (next: SmartAddressValue) => {
    setValue("receiverAddress", next.line1 ?? "", { shouldDirty: true })
    setValue("receiverCity", next.city ?? "", { shouldDirty: true })
    setValue("receiverState", next.state ?? "", { shouldDirty: true })
    setValue("receiverPincode", next.zip ?? "", { shouldDirty: true })
  }

  const stepFields: (keyof CreateShipmentInput)[][] = [
    ["senderName", "senderPhone", "senderAddress", "senderCity", "senderState", "senderPincode"],
    ["receiverName", "receiverPhone", "receiverAddress", "receiverCity", "receiverState", "receiverPincode"],
    ["weight", "length", "breadth", "height", "declaredValue", "description", "paymentMode", "serviceType"],
    [],
  ]

  const isLastStep = step === STEPS.length - 1

  async function handleNext() {
    if (isLastStep) {
      await handleSubmit(onSubmit)()
      return
    }
    const valid = await trigger(stepFields[step] as (keyof CreateShipmentInput)[])
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  const values = getValues()

  return (
    <div data-slot="create-shipment-form" className={cn("space-y-6", className)}>
      <Wizard steps={STEPS} currentIndex={step} />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleNext()
        }}
      >
        {/* Step 0 — Sender */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name" htmlFor="sender-name" error={errors.senderName?.message}>
                <Input id="sender-name" {...register("senderName")} className={INPUT_CLS} placeholder="John Doe" />
              </FormField>
              <FormField label="Phone" htmlFor="sender-phone" error={errors.senderPhone?.message}>
                <Input id="sender-phone" {...register("senderPhone")} className={INPUT_CLS} placeholder="9876543210" />
              </FormField>
            </div>
            <SmartAddressFields
              label="Sender address"
              value={senderAddr}
              onChange={setSenderAddr}
              hideLine2
              idPrefix="sender-addr"
              errors={{
                line1: errors.senderAddress?.message,
                city: errors.senderCity?.message,
                state: errors.senderState?.message,
                zip: errors.senderPincode?.message,
              }}
            />
          </div>
        )}

        {/* Step 1 — Receiver */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name" htmlFor="receiver-name" error={errors.receiverName?.message}>
                <Input id="receiver-name" {...register("receiverName")} className={INPUT_CLS} placeholder="Jane Doe" />
              </FormField>
              <FormField label="Phone" htmlFor="receiver-phone" error={errors.receiverPhone?.message}>
                <Input id="receiver-phone" {...register("receiverPhone")} className={INPUT_CLS} placeholder="9876543210" />
              </FormField>
            </div>
            <SmartAddressFields
              label="Receiver address"
              value={receiverAddr}
              onChange={setReceiverAddr}
              hideLine2
              idPrefix="receiver-addr"
              errors={{
                line1: errors.receiverAddress?.message,
                city: errors.receiverCity?.message,
                state: errors.receiverState?.message,
                zip: errors.receiverPincode?.message,
              }}
            />
          </div>
        )}

        {/* Step 2 — Package */}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Weight (kg)" htmlFor="pkg-weight" error={errors.weight?.message}>
              <Input id="pkg-weight" {...register("weight")} type="number" step="0.01" className={INPUT_CLS} placeholder="1.50" />
            </FormField>
            <FormField label="Declared Value (₹)" htmlFor="pkg-declared-value" error={errors.declaredValue?.message}>
              <Input id="pkg-declared-value" {...register("declaredValue")} type="number" className={INPUT_CLS} placeholder="500" />
            </FormField>
            <FormField label="Length (cm)" htmlFor="pkg-length" error={errors.length?.message}>
              <Input id="pkg-length" {...register("length")} type="number" className={INPUT_CLS} placeholder="30" />
            </FormField>
            <FormField label="Breadth (cm)" htmlFor="pkg-breadth" error={errors.breadth?.message}>
              <Input id="pkg-breadth" {...register("breadth")} type="number" className={INPUT_CLS} placeholder="20" />
            </FormField>
            <FormField label="Height (cm)" htmlFor="pkg-height" error={errors.height?.message}>
              <Input id="pkg-height" {...register("height")} type="number" className={INPUT_CLS} placeholder="15" />
            </FormField>
            <FormField label="Description" htmlFor="pkg-description" error={errors.description?.message}>
              <Input id="pkg-description" {...register("description")} className={INPUT_CLS} placeholder="Electronic items" />
            </FormField>
            <FormField label="Payment Mode" htmlFor="pkg-payment-mode" error={errors.paymentMode?.message}>
              <Controller
                control={control}
                name="paymentMode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="pkg-payment-mode" className={SELECT_TRIGGER_CLS}>
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((p) => (
                        <SelectItem key={p.value} value={p.value} className={SELECT_ITEM_CLS}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Service Type" htmlFor="pkg-service-type" error={errors.serviceType?.message}>
              <Controller
                control={control}
                name="serviceType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="pkg-service-type" className={SELECT_TRIGGER_CLS}>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((s) => (
                        <SelectItem key={s.value} value={s.value} className={SELECT_ITEM_CLS}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <div className="space-y-4 border border-border bg-card p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Review Details</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {[
                ["Sender", values.senderName],
                ["Sender Phone", values.senderPhone],
                ["Sender Address", `${values.senderAddress}, ${values.senderCity} - ${values.senderPincode}`],
                ["Receiver", values.receiverName],
                ["Receiver Phone", values.receiverPhone],
                ["Receiver Address", `${values.receiverAddress}, ${values.receiverCity} - ${values.receiverPincode}`],
                ["Weight", `${values.weight} kg`],
                ["Dimensions", `${values.length}×${values.breadth}×${values.height} cm`],
                ["Declared Value", `₹${values.declaredValue}`],
                ["Payment", values.paymentMode],
                ["Service", values.serviceType],
                ["Contents", values.description],
              ].map(([label, val]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="font-mono text-3xs uppercase tracking-wider text-muted-foreground">{label}</span>
                  <span className="font-sans text-sm text-foreground">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <WizardActions
          className="mt-6"
          currentIndex={step}
          totalSteps={STEPS.length}
          onBack={handleBack}
          onNext={handleNext}
          isSubmitting={isLoading}
          finalLabel="CREATE SHIPMENT"
          submittingLabel="CREATING…"
        />
      </form>
    </div>
  )
}

export { CreateShipmentForm }
// Schema + type re-exported here for backwards compatibility; new consumers
// should import directly from `./create-shipment-schema`.
export {
  createShipmentSchema,
  type CreateShipmentInput,
} from "./create-shipment-schema"
