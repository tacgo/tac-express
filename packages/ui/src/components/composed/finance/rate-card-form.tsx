"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { HubCode } from "@workspace/types"
import type { RateCardInput } from "@workspace/types"

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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
      {error && <p className="font-mono text-2xs text-destructive">{error}</p>}
    </div>
  )
}

const INPUT_CLS = "h-9 w-full border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
const SELECT_CLS = `${INPUT_CLS} cursor-pointer`

export function RateCardForm({ onSubmit, isLoading }: RateCardFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
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
        <Field label="Origin Hub" error={errors.originHub?.message}>
          <select {...register("originHub")} className={SELECT_CLS}>
            <option value="">Select hub</option>
            {Object.values(HubCode).map((h) => (
              <option key={h} value={h}>{h.replace(/_/g, " ")}</option>
            ))}
          </select>
        </Field>
        <Field label="Destination Hub" error={errors.destHub?.message}>
          <select {...register("destHub")} className={SELECT_CLS}>
            <option value="">Select hub</option>
            {Object.values(HubCode).map((h) => (
              <option key={h} value={h}>{h.replace(/_/g, " ")}</option>
            ))}
          </select>
        </Field>
        <Field label="Service Level" error={errors.serviceLevel?.message}>
          <select {...register("serviceLevel")} className={SELECT_CLS}>
            <option value="STANDARD">Standard</option>
            <option value="PRIORITY">Priority</option>
            <option value="EXPRESS">Express</option>
          </select>
        </Field>
        <Field label="Weight Min (kg)" error={errors.weightSlabMin?.message}>
          <input type="number" step="0.001" min={0} {...register("weightSlabMin")} className={INPUT_CLS} />
        </Field>
        <Field label="Weight Max (kg)" error={errors.weightSlabMax?.message}>
          <input type="number" step="0.001" min={0} {...register("weightSlabMax")} className={INPUT_CLS} />
        </Field>
        <Field label="Rate / kg (₹)" error={errors.ratePerKg?.message}>
          <input type="number" step="0.01" min={0} {...register("ratePerKg")} className={INPUT_CLS} />
        </Field>
        <Field label="Docket Charge (₹)" error={errors.docketCharge?.message}>
          <input type="number" step="0.01" min={0} {...register("docketCharge")} className={INPUT_CLS} />
        </Field>
        <Field label="Fuel Surcharge (%)" error={errors.fuelSurchargePct?.message}>
          <input type="number" step="0.1" min={0} max={100} {...register("fuelSurchargePct")} className={INPUT_CLS} />
        </Field>
        <Field label="Handling Fee (₹)" error={errors.handlingFee?.message}>
          <input type="number" step="0.01" min={0} {...register("handlingFee")} className={INPUT_CLS} />
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="h-9 px-6 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Saving..." : "Add Rate Card"}
        </button>
      </div>
    </form>
  )
}
