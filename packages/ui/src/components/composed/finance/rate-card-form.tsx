"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { HubCode } from "@workspace/types"
import type { RateCardInput } from "@workspace/types"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

const rateCardSchema = z.object({
  originHub: z.string().min(1, "Required"),
  destHub: z.string().min(1, "Required"),
  serviceLevel: z.enum(["STANDARD", "PRIORITY", "EXPRESS"]),
  weightSlabMin: z.coerce.number().min(0),
  weightSlabMax: z.coerce.number().min(0),
  ratePerKg: z.coerce.number().min(0),
  docketCharge: z.coerce.number().min(0),
  fuelSurchargePct: z.coerce.number().min(0).max(100),
  handlingFee: z.coerce.number().min(0),
}).refine((v) => v.weightSlabMax > v.weightSlabMin, {
  message: "Max must be greater than min",
  path: ["weightSlabMax"],
})

type FormValues = z.infer<typeof rateCardSchema>

interface RateCardFormProps {
  onSubmit: (values: RateCardInput) => Promise<void>
  isLoading?: boolean
}

const LABEL_CLS = "font-mono text-2xs uppercase tracking-wider text-muted-foreground"
const SELECT_TRIGGER_CLS = "h-9 w-full font-sans text-sm"
const SELECT_ITEM_CLS = "font-sans text-sm"

function Field({
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
      <Label htmlFor={htmlFor} className={LABEL_CLS}>
        {label}
      </Label>
      {children}
      {error && <p role="alert" className="font-mono text-2xs text-destructive">{error}</p>}
    </div>
  )
}

const SERVICE_LEVELS = [
  { value: "STANDARD", label: "Standard" },
  { value: "PRIORITY", label: "Priority" },
  { value: "EXPRESS", label: "Express" },
] as const

export function RateCardForm({ onSubmit, isLoading }: RateCardFormProps) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(rateCardSchema),
    defaultValues: {
      serviceLevel: "STANDARD",
      weightSlabMin: 0,
      weightSlabMax: 99999,
      ratePerKg: 0,
      docketCharge: 50,
      fuelSurchargePct: 8,
      handlingFee: 0,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Field label="Origin Hub" htmlFor="rc-origin-hub" error={errors.originHub?.message}>
          <Controller
            control={control}
            name="originHub"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="rc-origin-hub" className={SELECT_TRIGGER_CLS}>
                  <SelectValue placeholder="Select hub" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(HubCode).map((h) => (
                    <SelectItem key={h} value={h} className={SELECT_ITEM_CLS}>
                      {h.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Destination Hub" htmlFor="rc-dest-hub" error={errors.destHub?.message}>
          <Controller
            control={control}
            name="destHub"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="rc-dest-hub" className={SELECT_TRIGGER_CLS}>
                  <SelectValue placeholder="Select hub" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(HubCode).map((h) => (
                    <SelectItem key={h} value={h} className={SELECT_ITEM_CLS}>
                      {h.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Service Level" htmlFor="rc-service-level" error={errors.serviceLevel?.message}>
          <Controller
            control={control}
            name="serviceLevel"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="rc-service-level" className={SELECT_TRIGGER_CLS}>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_LEVELS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className={SELECT_ITEM_CLS}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Weight Min (kg)" htmlFor="rc-weight-min" error={errors.weightSlabMin?.message}>
          <Input id="rc-weight-min" type="number" step="0.001" min={0} {...register("weightSlabMin")} className="h-9 font-sans text-sm" />
        </Field>
        <Field label="Weight Max (kg)" htmlFor="rc-weight-max" error={errors.weightSlabMax?.message}>
          <Input id="rc-weight-max" type="number" step="0.001" min={0} {...register("weightSlabMax")} className="h-9 font-sans text-sm" />
        </Field>
        <Field label="Rate / kg (₹)" htmlFor="rc-rate-per-kg" error={errors.ratePerKg?.message}>
          <Input id="rc-rate-per-kg" type="number" step="0.01" min={0} {...register("ratePerKg")} className="h-9 font-sans text-sm" />
        </Field>
        <Field label="Docket Charge (₹)" htmlFor="rc-docket-charge" error={errors.docketCharge?.message}>
          <Input id="rc-docket-charge" type="number" step="0.01" min={0} {...register("docketCharge")} className="h-9 font-sans text-sm" />
        </Field>
        <Field label="Fuel Surcharge (%)" htmlFor="rc-fuel-surcharge" error={errors.fuelSurchargePct?.message}>
          <Input id="rc-fuel-surcharge" type="number" step="0.1" min={0} max={100} {...register("fuelSurchargePct")} className="h-9 font-sans text-sm" />
        </Field>
        <Field label="Handling Fee (₹)" htmlFor="rc-handling-fee" error={errors.handlingFee?.message}>
          <Input id="rc-handling-fee" type="number" step="0.01" min={0} {...register("handlingFee")} className="h-9 font-sans text-sm" />
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading} className="px-6 font-mono text-xs uppercase tracking-wider">
          {isLoading ? "Saving..." : "Add Rate Card"}
        </Button>
      </div>
    </form>
  )
}
