import { z } from "zod"

// JSX render (OpsCustomerForm component) retired in Phase 4-B — the
// customers/create route renders V7CustomerForm from
// `composed/customers/v7-customer-form.tsx` and imports only the type below.
// This module is kept as the schema home so V7CustomerForm's resolver and the
// live route's type annotation keep working without touching those files.

export const opsCustomerFormSchema = z.object({
  name: z.string().min(2, "Name required"),
  phone: z.string().min(10, "Valid phone required"),
  email: z.string().email("Valid email").optional().or(z.literal("")),
  gstin: z.string().optional().or(z.literal("")),
  addressLine1: z.string().min(5, "Address required"),
  addressLine2: z.string().optional().or(z.literal("")),
  city: z.string().min(2, "City required"),
  state: z.string().min(2, "State required"),
  zip: z.string().length(6, "6-digit PIN required"),
})

export type OpsCustomerFormInput = z.infer<typeof opsCustomerFormSchema>
