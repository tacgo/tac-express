import type { SupabaseClient } from "@workspace/database/supabase.types"

import { captureSupabaseRpcError } from "./shared/with-rpc"
import { withAudit } from "./shared/with-audit"

/**
 * Thrown when the `record_invoice_payment` RPC returned `error = null` but
 * also `data = null/undefined`. The server-side mutation has already
 * happened (RPC runs inside a transaction with SECURITY DEFINER); the
 * client just lost the response shape.
 *
 * Caller MUST NOT retry — the payment already exists on the server.
 * Surface a "refresh to verify" message and report to Sentry.
 * Discriminate via `.code === "PAYMENT_RESPONSE_LOST"`.
 */
export class PaymentResponseLostError extends Error {
  readonly code = "PAYMENT_RESPONSE_LOST" as const
  readonly invoiceId: string
  readonly amount: number
  readonly receivedAt: string

  constructor(input: { invoiceId: string; amount: number; receivedAt: string }) {
    super(
      "Payment was recorded on the server but the response was empty. " +
        "Refresh the invoice to see the new entry. If the payment does " +
        "not appear, contact support — do NOT retry from the dialog.",
    )
    this.name = "PaymentResponseLostError"
    this.invoiceId = input.invoiceId
    this.amount = input.amount
    this.receivedAt = input.receivedAt
  }
}

export type PaymentMethod =
  | "CASH"
  | "UPI"
  | "BANK_TRANSFER"
  | "CHEQUE"
  | "CARD"
  | "NEFT_RTGS"
  | "WALLET"
  | "OTHER"

export interface Payment {
  id: string
  invoiceId: string
  amount: number
  method: PaymentMethod
  reference?: string
  notes?: string
  receivedAt: string
  recordedBy?: string
  attachmentPath?: string
}

export interface RecordPaymentInput {
  invoiceId: string
  amount: number
  method: PaymentMethod
  reference?: string
  notes?: string
  receivedAt?: string
  attachmentPath?: string
}

function mapPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    invoiceId: row.invoice_id as string,
    amount: Number(row.amount ?? 0),
    method: (row.method as PaymentMethod) ?? "OTHER",
    reference: row.reference as string | undefined,
    notes: row.notes as string | undefined,
    receivedAt: row.received_at as string,
    recordedBy: row.recorded_by as string | undefined,
    attachmentPath: row.attachment_path as string | undefined,
  }
}

/**
 * Payment service — CRUD for invoice payments.
 * Uses the `record_invoice_payment` RPC (atomic, row-locked) as the
 * canonical write path. The racy two-step fallback (issue #9) was removed
 * once the RPC was confirmed live in production.
 */
export function createPaymentService(db: SupabaseClient) {
  return {
    async listForInvoice(invoiceId: string): Promise<Payment[]> {
      const { data, error } = await db
        .from("invoice_payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("received_at", { ascending: false })
      if (error) throw error
      return (data ?? []).map((row) => mapPayment(row as Record<string, unknown>))
    },

    async recordPayment(input: RecordPaymentInput): Promise<Payment> {
      const receivedAt = input.receivedAt ?? new Date().toISOString()

      const rpc = await db.rpc("record_invoice_payment", {
        p_invoice_id: input.invoiceId,
        p_amount: input.amount,
        p_method: input.method,
        p_reference: input.reference ?? null,
        p_notes: input.notes ?? null,
        p_received_at: receivedAt,
        p_attachment_path: input.attachmentPath ?? null,
      })

      if (rpc.error) {
        captureSupabaseRpcError("record_invoice_payment", rpc.error)
        throw rpc.error
      }

      if (!rpc.data) {
        throw new PaymentResponseLostError({
          invoiceId: input.invoiceId,
          amount: input.amount,
          receivedAt,
        })
      }

      return mapPayment(rpc.data as Record<string, unknown>)
    },

    async deletePayment(id: string): Promise<void> {
      const { data: row, error: readErr } = await db
        .from("invoice_payments")
        .select("*")
        .eq("id", id)
        .maybeSingle()
      if (readErr) throw readErr
      if (!row) return

      await withAudit(
        db,
        {
          action: "payment_delete",
          entityType: "payment",
          entityId: id,
          beforeState: row as Record<string, unknown>,
        },
        async () => {
          const { error } = await db
            .from("invoice_payments")
            .delete()
            .eq("id", id)
          if (error) throw error
        },
      )
    },
  }
}

export type PaymentService = ReturnType<typeof createPaymentService>
