import { z } from "zod"

// JSX render (OpsRateCardForm component) retired in Phase 4-B — the
// rates/create route renders V7RateCardForm from
// `composed/rates/v7-rate-card-form.tsx` and imports only the type below.
// This module is kept as the schema home so V7RateCardForm's resolver and the
// live route's type annotation keep working without touching those files.

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
