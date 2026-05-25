"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { cn } from "@workspace/ui/lib/utils"
import { RiLoader4Line, RiAddLine } from "@workspace/ui/icons"
import { Input } from "@workspace/ui/components/primitives/input"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  FormCard,
  FormSection,
  FormGrid,
  FormField,
  FormFooter,
} from "@workspace/ui/components/composed/forms/form-primitives"

import {
  opsRateCardFormSchema,
  type OpsRateCardFormInput,
} from "@workspace/ui/components/composed/ops-console/forms/ops-rate-card-form"

/**
 * V7RateCardForm — Violet-Grid v7 rate-card create form.
 *
 * Mirrors V7CustomerForm (the canonical v7 form pattern): react-hook-form +
 * zod resolver on the behaviour layer, v7 form primitives (FormCard /
 * FormSection / FormGrid / FormField with semantic control widths) on the
 * visual layer. Reuses the `opsRateCardFormSchema` + `OpsRateCardFormInput`
 * from the v6 OpsRateCardForm so the live wrapper submits the same payload —
 * the v6 module stays as the schema home.
 *
 * Structure preserved from v6: route + service section, then weight-slab +
 * charges section, then a reset / submit footer.
 */

const SERVICE_LEVELS = [
  { value: "STANDARD", label: "Standard" },
  { value: "PRIORITY", label: "Priority" },
  { value: "EXPRESS", label: "Express" },
] as const

interface V7RateCardFormProps {
  onSubmit: (data: OpsRateCardFormInput) => Promise<void> | void
  isLoading?: boolean
  className?: string
}

function V7RateCardForm({ onSubmit, isLoading, className }: V7RateCardFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OpsRateCardFormInput>({
    resolver: zodResolver(opsRateCardFormSchema),
    mode: "onBlur",
    defaultValues: { serviceLevel: "STANDARD" },
  })

  return (
    <FormCard
      maxWidth="lg"
      onSubmit={handleSubmit((d) => onSubmit(d))}
      className={cn(className)}
      noValidate
    >
      <FormSection title="Route + service" description="Which lane does this rate cover?">
        <FormGrid cols={2}>
          <FormField
            fieldId="rc-origin"
            controlWidth="sm"
            label="Origin hub"
            required
            error={errors.originHub?.message}
          >
            <Input
              id="rc-origin"
              placeholder="e.g. IMPHAL"
              className="font-mono uppercase"
              aria-invalid={errors.originHub ? "true" : undefined}
              {...register("originHub")}
            />
          </FormField>
          <FormField
            fieldId="rc-dest"
            controlWidth="sm"
            label="Destination hub"
            required
            error={errors.destHub?.message}
          >
            <Input
              id="rc-dest"
              placeholder="e.g. NEW_DELHI"
              className="font-mono uppercase"
              aria-invalid={errors.destHub ? "true" : undefined}
              {...register("destHub")}
            />
          </FormField>
          <FormField
            fieldId="rc-service"
            controlWidth="md"
            label="Service level"
            required
            error={errors.serviceLevel?.message}
          >
            <Controller
              control={control}
              name="serviceLevel"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="rc-service" aria-invalid={errors.serviceLevel ? "true" : undefined}>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_LEVELS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection
        title="Weight slab + charges"
        description="Rate band and the per-lane charge components."
      >
        <FormGrid cols={2}>
          <FormField
            fieldId="rc-min"
            controlWidth="code"
            label="Slab min (kg)"
            required
            error={errors.weightSlabMin?.message}
          >
            <Input
              id="rc-min"
              type="number"
              inputMode="decimal"
              step="0.001"
              min={0}
              placeholder="0"
              className="font-mono tabular-nums"
              aria-invalid={errors.weightSlabMin ? "true" : undefined}
              {...register("weightSlabMin")}
            />
          </FormField>
          <FormField
            fieldId="rc-max"
            controlWidth="code"
            label="Slab max (kg)"
            required
            error={errors.weightSlabMax?.message}
          >
            <Input
              id="rc-max"
              type="number"
              inputMode="decimal"
              step="0.001"
              min={0}
              placeholder="5"
              className="font-mono tabular-nums"
              aria-invalid={errors.weightSlabMax ? "true" : undefined}
              {...register("weightSlabMax")}
            />
          </FormField>
          <FormField
            fieldId="rc-rate"
            controlWidth="sm"
            label="Rate ₹/kg"
            required
            error={errors.ratePerKg?.message}
          >
            <Input
              id="rc-rate"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="80"
              className="font-mono tabular-nums"
              aria-invalid={errors.ratePerKg ? "true" : undefined}
              {...register("ratePerKg")}
            />
          </FormField>
          <FormField
            fieldId="rc-docket"
            controlWidth="sm"
            label="Docket ₹"
            required
            error={errors.docketCharge?.message}
          >
            <Input
              id="rc-docket"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="40"
              className="font-mono tabular-nums"
              aria-invalid={errors.docketCharge ? "true" : undefined}
              {...register("docketCharge")}
            />
          </FormField>
          <FormField
            fieldId="rc-fuel"
            controlWidth="code"
            label="Fuel %"
            required
            error={errors.fuelSurchargePct?.message}
          >
            <Input
              id="rc-fuel"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              max={100}
              placeholder="6"
              className="font-mono tabular-nums"
              aria-invalid={errors.fuelSurchargePct ? "true" : undefined}
              {...register("fuelSurchargePct")}
            />
          </FormField>
          <FormField
            fieldId="rc-handling"
            controlWidth="sm"
            label="Handling ₹"
            required
            error={errors.handlingFee?.message}
          >
            <Input
              id="rc-handling"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="0"
              className="font-mono tabular-nums"
              aria-invalid={errors.handlingFee ? "true" : undefined}
              {...register("handlingFee")}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormFooter>
        <Button type="reset" variant="ghost" size="sm">
          Reset
        </Button>
        <Button type="submit" disabled={isLoading} aria-label="Add rate card">
          {isLoading ? (
            <>
              <RiLoader4Line className="size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <RiAddLine className="size-4" aria-hidden />
              Add rate card
            </>
          )}
        </Button>
      </FormFooter>
    </FormCard>
  )
}

export { V7RateCardForm }
export type { V7RateCardFormProps }
