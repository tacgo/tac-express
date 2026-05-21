import { z } from "zod"

/**
 * Canonical zod schema + inferred type for the shipment-creation form.
 *
 * Lives in its own file (instead of inside `create-shipment-form.tsx`)
 * because both the v6 form and the v7 wizard consume it, and the v7
 * wizard test must import the type without transitively pulling the v6
 * form's component graph (which depends on @workspace/types subpath
 * imports that aren't resolvable from the vite test runner).
 *
 * Bumping fields here is a breaking change for both v6 and v7 — and for
 * any persisted localStorage drafts. When that happens, also bump
 * SHIPMENT_DRAFT_SCHEMA_VERSION in use-shipment-draft.ts so older drafts
 * are silently invalidated rather than silently rehydrated into a form
 * shape that no longer matches.
 */
// Indian phone numbers are exactly 10 digits; pincodes are exactly 6 digits.
// Use regex (not min/length on a generic string) so non-digit input is rejected
// at the schema level — these values flow into AWBs, invoices, and printed
// labels where a stray space or letter is a real operational problem.
const PHONE_REGEX = /^\d{10}$/
const PINCODE_REGEX = /^\d{6}$/

export const createShipmentSchema = z.object({
  senderName: z.string().min(2, "Name required"),
  senderPhone: z.string().trim().regex(PHONE_REGEX, "10-digit phone required"),
  senderAddress: z.string().min(5, "Address required"),
  senderCity: z.string().min(2, "City required"),
  senderState: z.string().min(2, "State required"),
  senderPincode: z.string().trim().regex(PINCODE_REGEX, "6-digit pincode required"),
  receiverName: z.string().min(2, "Name required"),
  receiverPhone: z.string().trim().regex(PHONE_REGEX, "10-digit phone required"),
  receiverAddress: z.string().min(5, "Address required"),
  receiverCity: z.string().min(2, "City required"),
  receiverState: z.string().min(2, "State required"),
  receiverPincode: z.string().trim().regex(PINCODE_REGEX, "6-digit pincode required"),
  weight: z.coerce.number().positive("Weight must be positive"),
  length: z.coerce.number().positive(),
  breadth: z.coerce.number().positive(),
  height: z.coerce.number().positive(),
  declaredValue: z.coerce.number().min(0),
  description: z.string().min(2, "Description required"),
  paymentMode: z.enum(["TO_PAY", "PAID", "TBB"]),
  serviceType: z.enum(["STANDARD", "EXPRESS", "PRIORITY"]),
})

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>
