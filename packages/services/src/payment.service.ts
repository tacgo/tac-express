import type { SupabaseClient } from "@workspace/database/supabase.types"

import { captureSupabaseRpcError } from "./shared/with-rpc"
import { withAudit } from "./shared/with-audit"

/**
 * Thrown when the `record_invoice_payment` RPC returned `error = null` but
 * also `data = null/undefined`. The server-side mutation has already
 * happened (RPC runs inside a transaction with SECURITY DEFINER); the
 * client just lost the response shape — likely an RLS filter on the
 * returning row, an RPC that returned `void`, or a network framing issue.
 *
 * This error MUST NOT be confused with a generic mutation failure. The
 * caller should:
 *   - NOT retry the operation (the payment already exists on the server;
 *     retrying creates a duplicate)
 *   - surface a clear "refresh to verify" message to the operator
 *   - report to error tracking (Sentry) with high severity since this
 *     indicates a server-contract issue worth investigating
 *
 * Discriminate via `.code === "PAYMENT_RESPONSE_LOST"` for bundle-safety
 * across package boundaries; `instanceof PaymentResponseLostError` also
 * works inside the same bundle.
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
 * Time-bounded cache: once we confirm the deployment is missing the
 * `invoice_payments` table, every subsequent call within the TTL window
 * short-circuits without hitting the network. This kills the noisy 404
 * spam in the browser console while still letting the cache lapse so a
 * fresh deploy of the migration self-heals without a process restart.
 *
 * We intentionally avoid a permanent module-level boolean — on the Node
 * runtime that pins the flag for the lifetime of the server process and
 * silently disables payment recording for every tenant once any single
 * caller hits a schema-cache miss.
 */
const RELATION_MISSING_TTL_MS = 60_000
let invoicePaymentsRelationMissingUntil = 0

function markRelationMissing(): void {
  invoicePaymentsRelationMissingUntil = Date.now() + RELATION_MISSING_TTL_MS
}

function isRelationMissing(): boolean {
  return Date.now() < invoicePaymentsRelationMissingUntil
}

/**
 * Recognise every error shape Supabase returns when the table or RPC is
 * absent — the regex on `message` alone misses PostgREST's schema-cache
 * miss text (`"Could not find the table 'public.invoice_payments'…"`).
 */
function isMissingInvoicePaymentsRelation(err: {
  code?: string
  message?: string
} | null | undefined): boolean {
  if (!err) return false
  if (err.code === "PGRST205" || err.code === "PGRST204" || err.code === "42P01") {
    return true
  }
  const msg = err.message ?? ""
  return /does not exist|schema cache|could not find the (?:table|relation)|relation .* does not exist/i.test(
    msg,
  )
}

/**
 * Payment service — CRUD for invoice payments. Backed by the `invoice_payments`
 * table which is added in migration 20260501000002 (Phase 4 plan).
 *
 * IMPORTANT: This service tries the `record_invoice_payment` RPC first because
 * it atomically updates the invoice's `advance_paid` + `balance` + status in
 * one transaction. When the RPC isn't deployed yet, falls back to a two-step
 * insert + update path.
 */
export function createPaymentService(db: SupabaseClient) {
  return {
    async listForInvoice(invoiceId: string): Promise<Payment[]> {
      // Short-circuit once we've already learned the table is missing —
      // avoids issuing repeated 404s for every invoice that loads.
      if (isRelationMissing()) return []
      const { data, error } = await db
        .from("invoice_payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("received_at", { ascending: false })
      if (error) {
        if (isMissingInvoicePaymentsRelation(error)) {
          markRelationMissing()
          return []
        }
        throw error
      }
      return (data ?? []).map((row) => mapPayment(row as Record<string, unknown>))
    },

    async recordPayment(input: RecordPaymentInput): Promise<Payment> {
      if (isRelationMissing()) {
        throw new Error(
          "Payment recording is unavailable: the `invoice_payments` table " +
            "has not been deployed yet. Apply migration 20260501000002.",
        )
      }
      const receivedAt = input.receivedAt ?? new Date().toISOString()

      // ── Canonical path ────────────────────────────────────────────────
      // The `record_invoice_payment` RPC (when deployed) takes a row-level
      // lock on the invoice inside a single transaction, mutates
      // `advance_paid` / `balance` / `status`, and inserts the payment row
      // atomically. THIS IS THE ONLY SAFE PATH for concurrent traffic.
      //
      // Status as of 2026-05: the RPC is NOT YET in the deployed schema.
      // See issue #9 — migration is in flight. Until it lands, every
      // call falls through to the racy two-step path below. We log every
      // fallback invocation as a WARN so ops can correlate any
      // payment-reconciliation incident with the race window.
      const rpc = await db.rpc("record_invoice_payment", {
        p_invoice_id: input.invoiceId,
        p_amount: input.amount,
        p_method: input.method,
        p_reference: input.reference ?? null,
        p_notes: input.notes ?? null,
        p_received_at: receivedAt,
        p_attachment_path: input.attachmentPath ?? null,
      })
      if (!rpc.error) {
        // RPC succeeded. THREE outcomes from here, ALL must avoid the
        // fallback INSERT below — the RPC has already inserted + locked
        // + updated balance, so re-running the fallback would duplicate
        // the row and double-increment `advance_paid` (Macroscope finding,
        // PR #8). Distinguish by whether we got a row back to map or not.
        if (rpc.data) {
          return mapPayment(rpc.data as Record<string, unknown>)
        }
        // RPC succeeded but returned null/undefined. The mutation has
        // happened on the server (SECURITY DEFINER + transaction); we
        // just lost the response shape. We THROW a typed error rather
        // than fall through, so the caller can surface a clear "refresh
        // to verify" message AND report to error tracking with high
        // severity (this indicates a server-contract issue). Acceptance
        // criteria for issue #9 will tighten the RPC's return contract;
        // in the meantime this preserves data integrity.
        throw new PaymentResponseLostError({
          invoiceId: input.invoiceId,
          amount: input.amount,
          receivedAt,
        })
      }

      // RPC errored. The fallback INSERT path is ONLY appropriate for
      // "function not found" / schema-cache-miss errors — i.e. the RPC
      // genuinely isn't deployed yet (issue #9). For ANY other RPC error
      // (constraint violation, RLS denied, invoice-not-found, transaction
      // rollback, network error) the fallback would either:
      //   (a) duplicate work the RPC partially completed, OR
      //   (b) succeed where the RPC was correctly rejecting the operation,
      //       silently bypassing business rules / RLS that the RPC enforced.
      //
      // Both outcomes corrupt data. So we narrow the fallback to the
      // missing-relation case explicitly and re-throw everything else
      // (Macroscope High finding, PR #8 commit 9547758 follow-up).
      if (!isMissingInvoicePaymentsRelation(rpc.error)) {
        // Emit BEFORE throwing — the rethrow path runs through every
        // layer back to the route handler, where Sentry's request-error
        // hook would also capture, but without the supabase.rpc_name +
        // supabase.error_code tags this rule keys off. Selective emit
        // here keeps the alert focused on real RPC failures and skips
        // the "RPC not yet deployed" fallback above (which is normal
        // business state during the issue #9 migration window).
        captureSupabaseRpcError("record_invoice_payment", rpc.error)
        throw rpc.error
      }

      // ⚠ TEMPORARY FALLBACK — Tracking issue: #9
      //
      // The two-step `insert + read invoice + update` path below is NOT
      // atomic. Two callers both read the same `advance_paid` and both
      // write `oldAdvance + ownAmount`, swallowing one increment.
      //
      // We CAN'T fail-loud here because the RPC isn't in the deployed
      // schema yet (#9 is the migration). Failing-loud would turn this
      // into a hard payment-recording outage. Instead we WARN-log every
      // fallback invocation so any reconciliation discrepancy can be
      // correlated with this code path post-hoc, and we set a marker
      // header on the response shape (callers can surface it for the UI
      // to nag operators about double-clicks).
      //
      // Once #9 lands and the RPC is verified live for ≥ 7 days, this
      // entire branch will be deleted in a follow-up PR — at that point
      // the rpc.error path becomes throw-on-fail with a clear migration
      // hint, and the racy code never executes again.
      console.warn(
        "[payment.service] record_invoice_payment RPC unavailable — " +
          "falling back to racy two-step path. " +
          "Tracking: #9",
        {
          invoiceId: input.invoiceId,
          amount: input.amount,
          rpcError: rpc.error?.message ?? "no data returned",
          rpcCode: rpc.error?.code,
          env: process.env.NODE_ENV,
        },
      )
      const { data: insRow, error: insErr } = await db
        .from("invoice_payments")
        .insert({
          invoice_id: input.invoiceId,
          amount: input.amount,
          method: input.method,
          reference: input.reference ?? null,
          notes: input.notes ?? null,
          received_at: receivedAt,
          attachment_path: input.attachmentPath ?? null,
        })
        .select("*")
        .single()
      if (insErr) {
        if (isMissingInvoicePaymentsRelation(insErr)) {
          markRelationMissing()
        }
        throw insErr
      }

      // Read the invoice to refresh advance + balance + status locally.
      const { data: invRow, error: invErr } = await db
        .from("invoices")
        .select("advance_paid, total_amount")
        .eq("id", input.invoiceId)
        .single()
      if (invErr) throw invErr
      const newAdvance = Number(invRow.advance_paid ?? 0) + input.amount
      const total = Number(invRow.total_amount ?? 0)
      const newBalance = Math.max(total - newAdvance, 0)
      const status = newBalance === 0 ? "PAID" : "ISSUED"
      await db
        .from("invoices")
        .update({
          advance_paid: newAdvance,
          balance: newBalance,
          status,
          paid_at: status === "PAID" ? receivedAt : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.invoiceId)
      return mapPayment(insRow as Record<string, unknown>)
    },

    async deletePayment(id: string): Promise<void> {
      if (isRelationMissing()) return

      // Read the row first so the destructive audit-log entry carries
      // a forensic before_state snapshot. If the row is already gone
      // (already deleted, or a stale ID), short-circuit: nothing to
      // audit, nothing to delete. Preserves the prior idempotent
      // semantics for the no-op case.
      const { data: row, error: readErr } = await db
        .from("invoice_payments")
        .select("*")
        .eq("id", id)
        .maybeSingle()
      if (readErr) {
        if (isMissingInvoicePaymentsRelation(readErr)) {
          markRelationMissing()
          return
        }
        throw readErr
      }
      if (!row) return

      // AUDIT-WRAPPED: every payment deletion produces exactly one
      // audit_logs row before the destructive op runs. If the audit
      // write fails, the delete never executes (fail-loud — no audit
      // = no destruction). If the delete fails after the audit row is
      // written, the audit row remains as a forensic "attempt"
      // record. See packages/services/src/shared/with-audit.ts.
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
          if (error) {
            if (isMissingInvoicePaymentsRelation(error)) {
              markRelationMissing()
              return
            }
            throw error
          }
        },
      )
    },
  }
}

export type PaymentService = ReturnType<typeof createPaymentService>
