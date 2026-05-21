"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { cn } from "@workspace/ui/lib/utils"
import {
  RiCalculatorLine,
  RiAddLine,
  RiLoaderLine,
} from "@workspace/ui/icons"

import { OpsCard } from "../ops-card"
import { OpsButton } from "../ops-button"
import { OpsFieldInput, OpsFieldSelect, OpsFieldLabel } from "../ops-field"

export const opsRateCardFormSchema = z.object({
  originHub: z.string().min(2, "Required"),
  destHub: z.string().min(2, "Required"),
  serviceLevel: z.enum(["STANDARD", "PRIORITY", "EXPRESS"]),
  weightSlabMin: z.coerce.number().nonnegative("≥ 0"),
  weightSlabMax: z.coerce.number().positive("> 0"),
  ratePerKg: z.coerce.number().nonnegative("≥ 0"),
  docketCharge: z.coerce.number().nonnegative("≥ 0"),
  fuelSurchargePct: z.coerce.number().min(0).max(100, "≤ 100"),
  handlingFee: z.coerce.number().nonnegative("≥ 0"),
})

export type OpsRateCardFormInput = z.infer<typeof opsRateCardFormSchema>

interface OpsRateCardFormProps {
  onSubmit: (data: OpsRateCardFormInput) => Promise<void> | void
  isLoading?: boolean
  className?: string
}

interface FieldErrorProps {
  id?: string
  message?: string
}

function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="font-mono text-destructive text-ui-11 mt-1">
      {message}
    </p>
  )
}

export function OpsRateCardForm({ onSubmit, isLoading, className }: OpsRateCardFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OpsRateCardFormInput>({
    resolver: zodResolver(opsRateCardFormSchema),
    mode: "onBlur",
    defaultValues: { serviceLevel: "STANDARD" },
  })

  // a11y helper: every input gets aria-invalid + aria-describedby pointing
  // at its error message when validation fails. Closes R0 audit C1.
  // WCAG 4.1.3 Status Messages (AA) + 3.3.1 Error Identification (A).
  const errorAttrs = (id: string, hasError: boolean) =>
    hasError
      ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` }
      : {}

  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d))} className={cn("space-y-4", className)} noValidate>
      <OpsCard ticks className="p-6">
        <div className="flex items-center gap-2 paper-eyebrow mb-4">
          <RiCalculatorLine aria-hidden className="size-3.5" />
          <span>Route + Service</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <OpsFieldLabel htmlFor="rc-origin">Origin Hub</OpsFieldLabel>
            <OpsFieldInput
              id="rc-origin"
              placeholder="E.G. IMPHAL"
              {...register("originHub")}
              {...errorAttrs("rc-origin", !!errors.originHub)}
            />
            <FieldError id="rc-origin-error" message={errors.originHub?.message} />
          </div>
          <div>
            <OpsFieldLabel htmlFor="rc-dest">Destination Hub</OpsFieldLabel>
            <OpsFieldInput
              id="rc-dest"
              placeholder="E.G. NEW_DELHI"
              {...register("destHub")}
              {...errorAttrs("rc-dest", !!errors.destHub)}
            />
            <FieldError id="rc-dest-error" message={errors.destHub?.message} />
          </div>
          <div>
            <OpsFieldLabel htmlFor="rc-service">Service Level</OpsFieldLabel>
            <OpsFieldSelect id="rc-service" {...register("serviceLevel")}>
              <option value="STANDARD">STANDARD</option>
              <option value="PRIORITY">PRIORITY</option>
              <option value="EXPRESS">EXPRESS</option>
            </OpsFieldSelect>
          </div>
        </div>
      </OpsCard>

      <OpsCard ticks className="p-6">
        <div className="paper-eyebrow mb-4">Weight Slab + Charges</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <OpsFieldLabel htmlFor="rc-min">Slab Min (kg)</OpsFieldLabel>
            <OpsFieldInput
              id="rc-min"
              inputMode="decimal"
              placeholder="0"
              {...register("weightSlabMin")}
              {...errorAttrs("rc-min", !!errors.weightSlabMin)}
            />
            <FieldError id="rc-min-error" message={errors.weightSlabMin?.message} />
          </div>
          <div>
            <OpsFieldLabel htmlFor="rc-max">Slab Max (kg)</OpsFieldLabel>
            <OpsFieldInput
              id="rc-max"
              inputMode="decimal"
              placeholder="5"
              {...register("weightSlabMax")}
              {...errorAttrs("rc-max", !!errors.weightSlabMax)}
            />
            <FieldError id="rc-max-error" message={errors.weightSlabMax?.message} />
          </div>
          <div>
            <OpsFieldLabel htmlFor="rc-rate">Rate ₹/kg</OpsFieldLabel>
            <OpsFieldInput
              id="rc-rate"
              inputMode="decimal"
              placeholder="80"
              {...register("ratePerKg")}
              {...errorAttrs("rc-rate", !!errors.ratePerKg)}
            />
            <FieldError id="rc-rate-error" message={errors.ratePerKg?.message} />
          </div>
          <div>
            <OpsFieldLabel htmlFor="rc-docket">Docket ₹</OpsFieldLabel>
            <OpsFieldInput
              id="rc-docket"
              inputMode="decimal"
              placeholder="40"
              {...register("docketCharge")}
              {...errorAttrs("rc-docket", !!errors.docketCharge)}
            />
            <FieldError id="rc-docket-error" message={errors.docketCharge?.message} />
          </div>
          <div>
            <OpsFieldLabel htmlFor="rc-fuel">Fuel %</OpsFieldLabel>
            <OpsFieldInput
              id="rc-fuel"
              inputMode="decimal"
              placeholder="6"
              {...register("fuelSurchargePct")}
              {...errorAttrs("rc-fuel", !!errors.fuelSurchargePct)}
            />
            <FieldError id="rc-fuel-error" message={errors.fuelSurchargePct?.message} />
          </div>
          <div>
            <OpsFieldLabel htmlFor="rc-handling">Handling ₹</OpsFieldLabel>
            <OpsFieldInput
              id="rc-handling"
              inputMode="decimal"
              placeholder="0"
              {...register("handlingFee")}
              {...errorAttrs("rc-handling", !!errors.handlingFee)}
            />
            <FieldError id="rc-handling-error" message={errors.handlingFee?.message} />
          </div>
        </div>
      </OpsCard>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <OpsButton type="reset" variant="ghost">Reset</OpsButton>
        <OpsButton type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? (
            <><RiLoaderLine aria-hidden className="size-3 animate-spin motion-reduce:animate-none" />Saving…</>
          ) : (
            <><RiAddLine aria-hidden className="size-3" />Add Rate Card</>
          )}
        </OpsButton>
      </div>
    </form>
  )
}
