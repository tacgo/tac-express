"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@workspace/ui/lib/utils"
import { RiUserLine, RiMapPinLine } from "@workspace/ui/icons"
import {
  Wizard,
  WizardActions,
} from "@workspace/ui/components/primitives/wizard"
import {
  SmartAddressFields,
  type SmartAddressValue,
} from "@workspace/ui/components/composed/smart-address-fields"

const customerSchema = z.object({
  name: z.string().min(2, "Name required"),
  phone: z.string().min(10, "Valid phone required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  gstin: z.string().optional().or(z.literal("")),
  addressLine1: z.string().min(1, "Address required"),
  addressLine2: z.string().optional().or(z.literal("")),
  city: z.string().min(1, "City required"),
  state: z.string().min(1, "State required"),
  zip: z.string().min(4, "ZIP required"),
})

export type CustomerFormValues = z.infer<typeof customerSchema>

interface CustomerFormProps {
  defaultValues?: Partial<CustomerFormValues>
  onSubmit: (values: CustomerFormValues) => Promise<void>
  isLoading?: boolean
}

type StepKey = "identity" | "address"
type StepDef = {
  id: StepKey
  label: string
  caption: string
  icon: React.ElementType
  fields: (keyof CustomerFormValues)[]
}

const STEPS: StepDef[] = [
  {
    id: "identity",
    label: "Identity",
    caption: "Who are they?",
    icon: RiUserLine,
    fields: ["name", "phone", "email", "gstin"],
  },
  {
    id: "address",
    label: "Address",
    caption: "Where are they?",
    icon: RiMapPinLine,
    fields: ["addressLine1", "addressLine2", "city", "state", "zip"],
  },
]

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p className="font-mono text-2xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="font-mono text-2xs text-muted-foreground/60">{hint}</p>
      ) : null}
    </div>
  )
}

function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full border border-border bg-background px-3 font-sans text-sm text-foreground",
        "placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring",
        className
      )}
      {...props}
    />
  )
}

export function CustomerForm({
  defaultValues,
  onSubmit,
  isLoading,
}: CustomerFormProps) {
  const [step, setStep] = React.useState(0)
  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
    mode: "onTouched",
  })

  // Bridge SmartAddressFields (controlled) into RHF's hidden fields.
  React.useEffect(() => {
    register("addressLine1")
    register("addressLine2")
    register("city")
    register("state")
    register("zip")
  }, [register])

  const watched = watch(["addressLine1", "addressLine2", "city", "state", "zip"])
  const addressValue: SmartAddressValue = {
    line1: watched[0],
    line2: watched[1],
    city: watched[2],
    state: watched[3],
    zip: watched[4],
  }

  const handleAddressChange = React.useCallback(
    (next: SmartAddressValue) => {
      setValue("addressLine1", next.line1 ?? "", { shouldDirty: true, shouldValidate: false })
      setValue("addressLine2", next.line2 ?? "", { shouldDirty: true, shouldValidate: false })
      setValue("city", next.city ?? "", { shouldDirty: true, shouldValidate: false })
      setValue("state", next.state ?? "", { shouldDirty: true, shouldValidate: false })
      setValue("zip", next.zip ?? "", { shouldDirty: true, shouldValidate: false })
    },
    [setValue],
  )

  const isLastStep = step === STEPS.length - 1
  const currentStep = STEPS[step]!

  const handleNext = async () => {
    if (isLastStep) {
      await handleSubmit(onSubmit)()
      return
    }
    const valid = await trigger(currentStep.fields, { shouldFocus: true })
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const handleBack = () => setStep((s) => Math.max(s - 1, 0))

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      data-slot="customer-form"
    >
      <Wizard
        steps={STEPS.map((s) => ({ id: s.id, label: s.label, icon: s.icon }))}
        currentIndex={step}
      />

      <div className="bg-background border border-border p-5 space-y-4">
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <p className="font-serif text-base text-foreground">
            {currentStep.caption}
          </p>
          <span className="font-mono text-2xs uppercase tracking-widest text-muted-foreground tabular-nums">
            {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
          </span>
        </div>

        {step === 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Full Name / Company Name"
                error={errors.name?.message}
              >
                <Input
                  {...register("name")}
                  placeholder="Acme Logistics"
                  autoComplete="organization"
                />
              </Field>
              <Field label="Phone" error={errors.phone?.message}>
                <Input
                  {...register("phone")}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </Field>
              <Field
                label="Email"
                hint="Optional — used for invoices & alerts"
                error={errors.email?.message}
              >
                <Input
                  {...register("email")}
                  placeholder="contact@acme.com"
                  type="email"
                  autoComplete="email"
                />
              </Field>
              <Field
                label="GSTIN"
                hint="Optional — required for tax invoicing"
                error={errors.gstin?.message}
              >
                <Input
                  {...register("gstin")}
                  placeholder="29ABCDE1234F1Z5"
                  autoComplete="off"
                />
              </Field>
            </div>
          </div>
        ) : (
          <SmartAddressFields
            label="Billing address"
            value={addressValue}
            onChange={handleAddressChange}
            idPrefix="customer-addr"
            errors={{
              line1: errors.addressLine1?.message,
              line2: errors.addressLine2?.message,
              city: errors.city?.message,
              state: errors.state?.message,
              zip: errors.zip?.message,
            }}
          />
        )}
      </div>

      <WizardActions
        currentIndex={step}
        totalSteps={STEPS.length}
        onBack={handleBack}
        onNext={handleNext}
        isSubmitting={isLoading}
        finalLabel="SAVE CUSTOMER"
        submittingLabel="SAVING…"
      />
    </form>
  )
}
