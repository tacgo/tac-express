import { z } from "zod"
import { ShipmentStatus, ServiceLevel, PaymentMode, TransportMode, HubCode } from "../domain.types"

export const addressSchema = z.object({
  line1: z.string().min(1, "Address is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(6, "Valid PIN required").max(6),
  country: z.string().optional().default("India"),
})

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Valid 10-digit mobile number required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  address: addressSchema,
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Valid GSTIN required")
    .optional()
    .or(z.literal("")),
})

export const weightSchema = z.object({
  dead: z.number().positive("Dead weight must be positive"),
  volumetric: z.number().nonnegative("Volumetric weight cannot be negative"),
  chargeable: z.number().positive("Chargeable weight must be positive"),
})

export const createShipmentSchema = z.object({
  serviceLevel: z.nativeEnum(ServiceLevel),
  paymentMode: z.nativeEnum(PaymentMode),
  transportMode: z.nativeEnum(TransportMode),
  originHub: z.nativeEnum(HubCode),
  destHub: z.nativeEnum(HubCode),
  pieces: z.number().int().positive("At least 1 piece required"),
  weight: weightSchema,
  description: z.string().min(1, "Description is required").max(500),
  sender: contactSchema,
  receiver: contactSchema,
  ratePerKg: z.number().nonnegative(),
  docketCharge: z.number().nonnegative().default(0),
  pickupCharge: z.number().nonnegative().default(0),
  packingCharge: z.number().nonnegative().default(0),
  fuelSurcharge: z.number().nonnegative().default(0),
  handlingFee: z.number().nonnegative().default(0),
  insurance: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  advancePaid: z.number().nonnegative().default(0),
})

export const updateShipmentStatusSchema = z.object({
  status: z.nativeEnum(ShipmentStatus),
  notes: z.string().optional(),
})

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>
export type UpdateShipmentStatusInput = z.infer<typeof updateShipmentStatusSchema>
