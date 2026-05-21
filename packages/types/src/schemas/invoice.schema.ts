import { z } from "zod"
import { InvoiceStatus } from "../domain.types"

export const createInvoiceSchema = z.object({
  shipmentId: z.string().uuid("Invalid shipment ID"),
  discount: z.number().nonnegative().default(0),
  notes: z.string().max(500).optional(),
  dueDate: z.string().optional(),
})

export const updateInvoiceStatusSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
  notes: z.string().optional(),
})

export const recordPaymentSchema = z.object({
  amount: z.number().positive("Payment amount must be positive"),
  paymentDate: z.string(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>
