import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { PaymentMethod } from "../payment.service"
import { registerSentry } from "../shared/sentry-tagger"
import { SUPABASE_RPC_TAG_KEYS } from "../shared/with-rpc"
import { makeDb } from "./helpers/make-db"

/**
 * Test floor for payment.service.ts — ticks the #102 Sprint 1 Testing
 * sub-items:
 *   - Unit tests for packages/services/src/payment.service.ts
 *     (financial; 0 tests today)
 *   - Unit tests for record_invoice_payment RPC (would have caught the
 *     OPERATOR bug from #97)
 *
 * Scope (JS-side only, no real Postgres):
 *   - listForInvoice: success, no-data, error, relation-missing TTL cache
 *   - recordPayment: full RPC-or-fallback decision tree
 *     - RPC success with data → mapped Payment
 *     - RPC success with null data → PaymentResponseLostError
 *     - RPC real error (e.g. 23505 unique violation) → emit + throw
 *     - RPC missing (PGRST202/42883) → fallback INSERT path
 *     - Fallback INSERT success → invoice balance recalculated
 *     - Fallback INSERT error → throws
 *   - deletePayment: success, error, relation-missing TTL cache
 *   - PaymentResponseLostError: shape contract (code, fields)
 *   - All 8 PaymentMethod enum values pass through to the RPC arg
 *     (would have caught a JS-side validation that excluded a method —
 *     same shape as the OPERATOR-role bug, but applied to payment
 *     methods, which is the surface this layer can actually validate).
 *
 * Out of scope:
 *   - RPC SQL semantics (lock acquisition, balance recalc inside
 *     SECURITY DEFINER) — those need integration tests against real
 *     Postgres, tracked separately.
 *   - The fallback path's race-condition behavior — documented in
 *     payment.service.ts:240 as "racy by design, fixed by #9"; an
 *     integration test would be needed to verify the race occurs and
 *     to verify #9's RPC closes it.
 *
 * Module-level state isolation:
 *   payment.service.ts caches a relation-missing TTL at module scope.
 *   Tests that hit the cache (or want to verify it does NOT hit) need
 *   a fresh module instance. We use vi.resetModules() + dynamic import
 *   in a helper rather than exposing a test-only reset in production code.
 */

const captureExceptionMock = vi.fn()

beforeEach(() => {
  captureExceptionMock.mockClear()
  registerSentry({ captureException: captureExceptionMock })
  vi.resetModules()
})

afterEach(() => {
  registerSentry(null)
})

/**
 * Import payment.service.ts FRESH each call. Resets the module-level
 * TTL cache between tests without exposing a test-only reset in
 * production code.
 */
async function freshPaymentService() {
  vi.resetModules()
  // Re-register Sentry since vi.resetModules() invalidates the
  // sentry-tagger module's singleton state. Each test calls this
  // helper, so registration happens after reset.
  const { registerSentry: register } = await import("../shared/sentry-tagger")
  register({ captureException: captureExceptionMock })
  const mod = await import("../payment.service")
  return mod
}

describe("PaymentResponseLostError shape", () => {
  it("has the bundle-safe discriminator code", async () => {
    const { PaymentResponseLostError } = await freshPaymentService()
    const err = new PaymentResponseLostError({
      invoiceId: "inv-1",
      amount: 100,
      receivedAt: "2026-05-15T00:00:00Z",
    })
    expect(err.code).toBe("PAYMENT_RESPONSE_LOST")
    expect(err.invoiceId).toBe("inv-1")
    expect(err.amount).toBe(100)
    expect(err.receivedAt).toBe("2026-05-15T00:00:00Z")
    expect(err.name).toBe("PaymentResponseLostError")
    expect(err.message).toMatch(/Payment was recorded on the server/)
    expect(err.message).toMatch(/do NOT retry/)
  })

  it("is detectable via instanceof inside the same bundle", async () => {
    const { PaymentResponseLostError } = await freshPaymentService()
    const err = new PaymentResponseLostError({
      invoiceId: "inv-1",
      amount: 100,
      receivedAt: "2026-05-15T00:00:00Z",
    })
    expect(err).toBeInstanceOf(PaymentResponseLostError)
    expect(err).toBeInstanceOf(Error)
  })
})

describe("listForInvoice", () => {
  const SAMPLE_PAYMENT_ROW = {
    id: "pay-1",
    invoice_id: "inv-1",
    amount: 250,
    method: "UPI",
    reference: "UPI-REF-001",
    notes: "Partial",
    received_at: "2026-05-15T12:00:00Z",
    recorded_by: "user-a",
    attachment_path: null,
  }

  it("returns mapped Payment rows on success", async () => {
    const db = makeDb({
      fromResults: {
        invoice_payments: { data: [SAMPLE_PAYMENT_ROW], error: null },
      },
    })
    const { createPaymentService } = await freshPaymentService()
    const payments = await createPaymentService(db).listForInvoice("inv-1")
    expect(payments).toHaveLength(1)
    expect(payments[0]).toMatchObject({
      id: "pay-1",
      invoiceId: "inv-1",
      amount: 250,
      method: "UPI",
      reference: "UPI-REF-001",
    })
  })

  it("returns empty array when db returns null data", async () => {
    const db = makeDb({
      fromResults: { invoice_payments: { data: null, error: null } },
    })
    const { createPaymentService } = await freshPaymentService()
    const payments = await createPaymentService(db).listForInvoice("inv-1")
    expect(payments).toEqual([])
  })

  it("throws on generic db error", async () => {
    const db = makeDb({
      fromResults: {
        invoice_payments: { data: null, error: { code: "57P01", message: "admin shutdown" } },
      },
    })
    const { createPaymentService } = await freshPaymentService()
    await expect(createPaymentService(db).listForInvoice("inv-1")).rejects.toMatchObject({
      code: "57P01",
    })
  })

  it("throws on PGRST205 (relation missing) — no silent fallback after RPC is live", async () => {
    const db = makeDb({
      fromResults: {
        invoice_payments: {
          data: null,
          error: { code: "PGRST205", message: "Could not find the table" },
        },
      },
    })
    const { createPaymentService } = await freshPaymentService()
    await expect(createPaymentService(db).listForInvoice("inv-1")).rejects.toMatchObject({
      code: "PGRST205",
    })
  })

  it("throws on schema-cache miss (regex-matched message)", async () => {
    const db = makeDb({
      fromResults: {
        invoice_payments: {
          data: null,
          error: { message: 'Could not find the relation "invoice_payments"' },
        },
      },
    })
    const { createPaymentService } = await freshPaymentService()
    await expect(
      createPaymentService(db).listForInvoice("inv-1"),
    ).rejects.toMatchObject({ message: expect.stringContaining("invoice_payments") })
  })

  it("throws on raw Postgres relation-does-not-exist (code 42P01)", async () => {
    const db = makeDb({
      fromResults: {
        invoice_payments: { data: null, error: { code: "42P01", message: "" } },
      },
    })
    const { createPaymentService } = await freshPaymentService()
    await expect(createPaymentService(db).listForInvoice("inv-1")).rejects.toMatchObject({
      code: "42P01",
    })
  })
})

describe("recordPayment — RPC success branches", () => {
  it("returns mapped Payment when RPC returns data", async () => {
    const db = makeDb({
      rpcResult: {
        data: {
          id: "pay-1",
          invoice_id: "inv-1",
          amount: 500,
          method: "CASH",
          received_at: "2026-05-15T13:00:00Z",
        },
        error: null,
      },
    })
    const { createPaymentService } = await freshPaymentService()
    const result = await createPaymentService(db).recordPayment({
      invoiceId: "inv-1",
      amount: 500,
      method: "CASH",
    })
    expect(result).toMatchObject({
      id: "pay-1",
      invoiceId: "inv-1",
      amount: 500,
      method: "CASH",
    })
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("throws PaymentResponseLostError when RPC succeeds with null data", async () => {
    const db = makeDb({
      rpcResult: { data: null, error: null },
    })
    const { createPaymentService, PaymentResponseLostError } = await freshPaymentService()
    await expect(
      createPaymentService(db).recordPayment({
        invoiceId: "inv-99",
        amount: 12.34,
        method: "WALLET",
        receivedAt: "2026-05-15T14:00:00Z",
      }),
    ).rejects.toBeInstanceOf(PaymentResponseLostError as new (input: unknown) => Error)
  })

  it("PaymentResponseLostError carries the input identifiers for caller diagnostics", async () => {
    const db = makeDb({ rpcResult: { data: null, error: null } })
    const { createPaymentService } = await freshPaymentService()
    try {
      await createPaymentService(db).recordPayment({
        invoiceId: "inv-99",
        amount: 12.34,
        method: "WALLET",
        receivedAt: "2026-05-15T14:00:00Z",
      })
      throw new Error("should have thrown")
    } catch (err: unknown) {
      const e = err as { code: string; invoiceId: string; amount: number; receivedAt: string }
      expect(e.code).toBe("PAYMENT_RESPONSE_LOST")
      expect(e.invoiceId).toBe("inv-99")
      expect(e.amount).toBe(12.34)
      expect(e.receivedAt).toBe("2026-05-15T14:00:00Z")
    }
  })

  it("default-receivedAt is now-ish ISO when caller omits it", async () => {
    const before = new Date().toISOString()
    const db = makeDb({
      rpcResult: {
        data: {
          id: "pay-1",
          invoice_id: "inv-1",
          amount: 1,
          method: "OTHER",
          received_at: "2026-05-15T15:00:00Z",
        },
        error: null,
      },
    })
    const { createPaymentService } = await freshPaymentService()
    await createPaymentService(db).recordPayment({
      invoiceId: "inv-1",
      amount: 1,
      method: "OTHER",
    })
    // The RPC mock captures the args at call time. The 7th key is
    // p_received_at — verify it was set to an ISO string near "now".
    const rpcCall = (db.rpc as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]!
    const args = rpcCall[1] as { p_received_at: string }
    expect(args.p_received_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(args.p_received_at >= before).toBe(true)
  })
})

describe("recordPayment — RPC error branches", () => {
  it("emits captureSupabaseRpcError + rethrows on real RPC error (e.g. unique violation)", async () => {
    const errObj = { code: "23505", message: "duplicate key value violates unique constraint" }
    const db = makeDb({ rpcResult: { data: null, error: errObj } })
    const { createPaymentService } = await freshPaymentService()

    await expect(
      createPaymentService(db).recordPayment({
        invoiceId: "inv-1",
        amount: 100,
        method: "CASH",
      }),
    ).rejects.toMatchObject({ code: "23505" })

    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [, tags] = captureExceptionMock.mock.calls[0]!
    const tagMap = tags as Record<string, string>
    expect(tagMap[SUPABASE_RPC_TAG_KEYS.rpcName]).toBe("record_invoice_payment")
    expect(tagMap[SUPABASE_RPC_TAG_KEYS.errorCode]).toBe("23505")
  })

  it("emits + rethrows on RLS-denial errors (NOT swallowed by fallback)", async () => {
    // The post-PR-#8 fix: only PGRST202/42883/relation-missing route to
    // the fallback. An RLS denial (42501 or PostgREST permission error)
    // MUST rethrow — silently falling through would bypass the very
    // policy the RPC enforces.
    const errObj = { code: "42501", message: "new row violates row-level security" }
    const db = makeDb({ rpcResult: { data: null, error: errObj } })
    const { createPaymentService } = await freshPaymentService()
    await expect(
      createPaymentService(db).recordPayment({
        invoiceId: "inv-blocked",
        amount: 100,
        method: "CASH",
      }),
    ).rejects.toMatchObject({ code: "42501" })
    // Captured by the RPC-failure tagging surface.
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
  })

  it("emits + throws on PGRST205 RPC error (no fallback — RPC is live)", async () => {
    const errObj = { code: "PGRST205", message: "Could not find the function" }
    const db = makeDb({ rpcResult: { data: null, error: errObj } })
    const { createPaymentService } = await freshPaymentService()
    await expect(
      createPaymentService(db).recordPayment({ invoiceId: "inv-1", amount: 200, method: "BANK_TRANSFER" }),
    ).rejects.toMatchObject({ code: "PGRST205" })
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [, tags] = captureExceptionMock.mock.calls[0]!
    expect((tags as Record<string, string>)[SUPABASE_RPC_TAG_KEYS.rpcName]).toBe("record_invoice_payment")
  })
})

describe("recordPayment — PaymentMethod enum sentinel", () => {
  // Pinned hardcoded list — the OPERATOR-role bug from #97 happened
  // because a new enum value got added in TypeScript but the SQL CHECK
  // constraint wasn't updated. We can't test the SQL side here, but we
  // CAN pin: every PaymentMethod value the service exports MUST round-
  // trip through recordPayment's RPC arg without transformation.
  //
  // The pedagogical pattern parallels packages/auth/src/rbac.test.ts's
  // UserRole sentinel, but PaymentMethod is a string-union type (no
  // runtime representation, so `Object.values()` doesn't apply). We use
  // the TypeScript-native equivalent: `satisfies readonly PaymentMethod[]`
  // asserts every entry IS a PaymentMethod, and the `_Missing` type below
  // is `never` if-and-only-if ALL_METHODS is exhaustive — so the
  // declaration becomes a type error when a new method is added without
  // an entry here. CodeRabbit caught the prior weaker hardcoded list
  // (suggestion accepted on PR review).
  const ALL_METHODS = [
    "CASH",
    "UPI",
    "BANK_TRANSFER",
    "CHEQUE",
    "CARD",
    "NEFT_RTGS",
    "WALLET",
    "OTHER",
  ] as const satisfies readonly PaymentMethod[]

  // Compile-time exhaustiveness sentinel. If a new method is added to
  // PaymentMethod and NOT to ALL_METHODS above, _Missing becomes the
  // missing union member instead of `never`, and the `true` literal
  // can't be assigned to `never` — TypeScript flags it as an error.
  // The variable is unused at runtime; the type check is the assertion.
  type _Missing = Exclude<PaymentMethod, (typeof ALL_METHODS)[number]>
  const _allPaymentMethodsCovered: _Missing extends never ? true : never = true
  void _allPaymentMethodsCovered // reference to silence the unused-var rule; the type-check IS the assertion

  it.each(ALL_METHODS)("passes %s through to RPC p_method arg unchanged", async (method) => {
    const db = makeDb({
      rpcResult: {
        data: {
          id: "pay-x",
          invoice_id: "inv-x",
          amount: 1,
          method,
          received_at: "2026-05-15T17:00:00Z",
        },
        error: null,
      },
    })
    const { createPaymentService } = await freshPaymentService()
    await createPaymentService(db).recordPayment({
      invoiceId: "inv-x",
      amount: 1,
      method,
    })
    const rpcCall = (db.rpc as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]!
    const args = rpcCall[1] as { p_method: string }
    expect(args.p_method).toBe(method)
  })
})

describe("deletePayment (post-#134 withAudit-wrapped)", () => {
  // Per the audit-logs PR-2 adoption (#134), deletePayment now:
  //   1. SELECTs the row to be deleted (so the audit row carries a
  //      forensic before_state).
  //   2. If the row is gone, short-circuits — no audit, no delete.
  //   3. Otherwise wraps the DELETE via withAudit (fail-loud audit
  //      INSERT before DELETE; AuditWriteFailedError if audit
  //      INSERT errors; audit row preserved if DELETE errors).
  // The fromResults convention below: invoice_payments returns
  // SAMPLE_ROW so SELECT finds it; audit_logs returns null/null so the
  // audit INSERT succeeds. Override per-test for failure paths.

  const SAMPLE_ROW = {
    id: "pay-1",
    invoice_id: "inv-1",
    amount: 250,
    method: "CASH",
    received_at: "2026-05-16T10:00:00Z",
    notes: null,
    reference: null,
  }

  it("reads the row, writes one audit row, then deletes — table-call ordering", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      fromResults: {
        invoice_payments: { data: SAMPLE_ROW, error: null },
        audit_logs: { data: null, error: null },
      },
    })
    const { createPaymentService } = await freshPaymentService()
    await expect(
      createPaymentService(db).deletePayment("pay-1"),
    ).resolves.toBeUndefined()
    // Read invoice_payments -> insert into audit_logs -> delete from
    // invoice_payments. Audit-first ordering is the load-bearing
    // tamper-evidence property; pinning the sequence in a sentinel
    // protects it from accidental refactor.
    expect(tableCalls).toEqual([
      "invoice_payments", // SELECT
      "audit_logs",       // audit INSERT
      "invoice_payments", // DELETE
    ])
  })

  it("no-double-audit: the audit_logs table is hit exactly once", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      fromResults: {
        invoice_payments: { data: SAMPLE_ROW, error: null },
        audit_logs: { data: null, error: null },
      },
    })
    const { createPaymentService } = await freshPaymentService()
    await createPaymentService(db).deletePayment("pay-1")
    expect(tableCalls.filter((t) => t === "audit_logs")).toHaveLength(1)
  })

  it("short-circuits silently with no audit when the row is already gone", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      fromResults: {
        invoice_payments: { data: null, error: null }, // no row found
        audit_logs: { data: null, error: null },
      },
    })
    const { createPaymentService } = await freshPaymentService()
    await expect(
      createPaymentService(db).deletePayment("pay-already-gone"),
    ).resolves.toBeUndefined()
    // Only one .from() — the SELECT that found nothing. NO audit row,
    // NO delete attempt. Preserves the prior idempotent semantics.
    expect(tableCalls).toEqual(["invoice_payments"])
  })

  it("throws on generic delete error AFTER the audit row is committed", async () => {
    // To distinguish SELECT vs DELETE results we use mockImplementation
    // — the per-table single-result default of makeDb returns the
    // same shape for every call to the same table, so we cannot
    // differentiate the SELECT (must return a row) from the DELETE
    // (must return an error) without overriding.
    const SAMPLE_ROW_LOCAL = { ...SAMPLE_ROW }
    const tableCalls: string[] = []
    const invoicePaymentsCalls: Array<{ data: unknown; error: unknown }> = [
      { data: SAMPLE_ROW_LOCAL, error: null }, // SELECT
      { data: null, error: { code: "P0001", message: "trigger blocked delete" } }, // DELETE
    ]
    let invoiceCallIdx = 0
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation((table: string) => {
      tableCalls.push(table)
      const result =
        table === "invoice_payments"
          ? invoicePaymentsCalls[invoiceCallIdx++]!
          : { data: null, error: null }
      const builder: Record<string, unknown> = {}
      for (const m of [
        "select", "insert", "update", "upsert", "delete",
        "eq", "in", "or", "gte", "lte", "order", "limit", "range",
        "single", "maybeSingle",
      ]) {
        builder[m] = vi.fn(() => builder)
      }
      ;(builder as { then: unknown }).then = (resolve: (v: unknown) => void) =>
        Promise.resolve(result).then(resolve)
      return builder as never
    })

    const { createPaymentService } = await freshPaymentService()
    await expect(
      createPaymentService(db).deletePayment("pay-1"),
    ).rejects.toMatchObject({ code: "P0001" })
    // Audit row WAS written before the delete failed — the audit
    // table appears between the SELECT and the failed DELETE.
    expect(tableCalls).toEqual([
      "invoice_payments", // SELECT (returned row)
      "audit_logs",       // audit INSERT (succeeded)
      "invoice_payments", // DELETE (errored)
    ])
  })

  it("audit-write failure: AuditWriteFailedError surfaces and the delete never runs", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      fromResults: {
        invoice_payments: { data: SAMPLE_ROW, error: null },
        audit_logs: {
          data: null,
          error: { code: "23514", message: "violates audit_logs CHECK" },
        },
      },
    })
    const { createPaymentService } = await freshPaymentService()
    await expect(
      createPaymentService(db).deletePayment("pay-1"),
    ).rejects.toMatchObject({ code: "AUDIT_WRITE_FAILED" })
    // SELECT happened, audit INSERT was attempted, DELETE was NOT.
    // The fail-loud contract is the whole point.
    expect(tableCalls).toEqual(["invoice_payments", "audit_logs"])
  })

  it("throws when the SELECT hits PGRST205 (no silent TTL fallback — RPC is live)", async () => {
    const db = makeDb({
      fromResults: {
        invoice_payments: {
          data: null,
          error: { code: "PGRST205", message: "Could not find" },
        },
      },
    })
    const { createPaymentService } = await freshPaymentService()
    const svc = createPaymentService(db)
    await expect(svc.deletePayment("pay-1")).rejects.toMatchObject({ code: "PGRST205" })
    // A second call also throws — no silent TTL caching after fallback removal.
    await expect(svc.deletePayment("pay-2")).rejects.toMatchObject({ code: "PGRST205" })
    // Both calls hit the DB (two separate SELECTs, one for each call).
    expect(db.from).toHaveBeenCalledTimes(2)
  })
})
