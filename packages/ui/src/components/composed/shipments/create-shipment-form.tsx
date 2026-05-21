"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@workspace/ui/lib/utils"
import {
  Wizard,
  WizardActions,
  type WizardStep,
} from "@workspace/ui/components/primitives/wizard"
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
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  )
}

const inputClass = cn(
  "w-full h-8 border border-border bg-background px-3 text-sm font-sans",
  "placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
)

const selectClass = cn(inputClass, "cursor-pointer")

function CreateShipmentForm({ onSubmit, isLoading, className }: CreateShipmentFormProps) {
  const [step, setStep] = React.useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
    watch,
    setValue,
  } = useForm<CreateShipmentInput>({
    resolver: zodResolver(createShipmentSchema),
    mode: "onBlur",
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
              <FormField label="Full Name" error={errors.senderName?.message}>
                <input {...register("senderName")} className={inputClass} placeholder="John Doe" />
              </FormField>
              <FormField label="Phone" error={errors.senderPhone?.message}>
                <input {...register("senderPhone")} className={inputClass} placeholder="9876543210" />
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
              <FormField label="Full Name" error={errors.receiverName?.message}>
                <input {...register("receiverName")} className={inputClass} placeholder="Jane Doe" />
              </FormField>
              <FormField label="Phone" error={errors.receiverPhone?.message}>
                <input {...register("receiverPhone")} className={inputClass} placeholder="9876543210" />
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
            <FormField label="Weight (kg)" error={errors.weight?.message}>
              <input {...register("weight")} type="number" step="0.01" className={inputClass} placeholder="1.50" />
            </FormField>
            <FormField label="Declared Value (₹)" error={errors.declaredValue?.message}>
              <input {...register("declaredValue")} type="number" className={inputClass} placeholder="500" />
            </FormField>
            <FormField label="Length (cm)" error={errors.length?.message}>
              <input {...register("length")} type="number" className={inputClass} placeholder="30" />
            </FormField>
            <FormField label="Breadth (cm)" error={errors.breadth?.message}>
              <input {...register("breadth")} type="number" className={inputClass} placeholder="20" />
            </FormField>
            <FormField label="Height (cm)" error={errors.height?.message}>
              <input {...register("height")} type="number" className={inputClass} placeholder="15" />
            </FormField>
            <FormField label="Description" error={errors.description?.message}>
              <input {...register("description")} className={inputClass} placeholder="Electronic items" />
            </FormField>
            <FormField label="Payment Mode" error={errors.paymentMode?.message}>
              <select {...register("paymentMode")} className={selectClass}>
                <option value="TO_PAY">To Pay</option>
                <option value="PAID">Paid</option>
                <option value="TBB">To Be Billed</option>
              </select>
            </FormField>
            <FormField label="Service Type" error={errors.serviceType?.message}>
              <select {...register("serviceType")} className={selectClass}>
                <option value="STANDARD">Standard</option>
                <option value="EXPRESS">Express</option>
                <option value="PRIORITY">Priority</option>
              </select>
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
