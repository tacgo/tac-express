import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { InvoiceStatus, PaymentMode } from "@workspace/types"

import { registerSentry } from "../shared/sentry-tagger"
import { makeDb } from "./helpers/make-db"
import {
  makeBuilderSpy,
  makeBuilderSpyByTable,
} from "./helpers/make-builder-spy"

// Chainable-builder spies for value-contract assertions are produced by
// `makeBuilderSpy` / `makeBuilderSpyByTable` in helpers/make-builder-spy.ts.
// The POSTGREST-BUILDER-TYPE-GAP cast is centralized in that helper; call
// sites here stay free of `as unknown as never`. See catalog entries #1
// (value-contract over call-existence) and #11 (cast-comment-as-bug-ticket)
// for the reasoning.

/**
 * Test floor for invoice.service.ts — ticks the #102 Sprint 1 Testing
 * sub-item:
 *   - Unit tests for packages/services/src/invoice.service.ts
 *     (financial; 0 tests today)
 *
 * Mirrors PR #118's payment.service.test.ts pattern verbatim:
 *   - `makeDb` from helpers/make-db.ts (shared builder; not forked)
 *   - `freshInvoiceService()` factory with vi.resetModules() per test
 *   - Mock at the Supabase client factory boundary; let withRpc +
 *     sentry-tagger run as real code (irrelevant here since invoice.service
 *     doesn't use them, but kept for pattern consistency)
 *
 * Scope (JS-side only, no real Postgres):
 *   - getInvoices: filter combinations + DB error + null data
 *   - getInvoiceById: found / null / error
 *   - createInvoice: full multi-step decision tree
 *     - awb_number provided → findShipmentForInvoice branch
 *       - shipment found → uses found awb + id
 *       - shipment not found → null linkage + notes.externalAwbNumber
 *     - customer_id provided → customerExistsForInvoice branch
 *       - valid UUID + exists → keeps id
 *       - valid UUID + missing → null + notes.invalidCustomerId
 *       - invalid UUID → UUID-guard short-circuits + null + notes metadata
 *     - findShipment error → throws
 *     - customerExists error → throws
 *     - insert error → throws
 *     - multi-step path: shipments → customers → invoices in EXACT order
 *       (preempts CodeRabbit's PR #118 finding about call-order assertions)
 *   - issueInvoice: success (DRAFT → ISSUED guard) / error
 *   - markPaid: default-now timestamp / explicit timestamp / error
 *   - cancelInvoice: DRAFT|ISSUED guard via .in() / error
 *   - getOverdueCount: count returned / null → 0 / error
 *   - InvoiceStatus enum exhaustiveness (5 values: DRAFT, ISSUED, PAID,
 *     CANCELLED, OVERDUE) via TypeScript-native `satisfies` + `Exclude<>`
 *     — same pattern as PR #118's PaymentMethod sentinel
 *   - PaymentMode enum exhaustiveness (3 values: PAID, TO_PAY, TBB) +
 *     legacy alias round-trip (topay/credit/prepaid)
 *
 * NOT IN SCOPE (documented absences per acceptance criteria):
 *   - No RPC-or-fallback decision tree — invoice.service.ts has NO .rpc()
 *     calls. All operations use the Supabase query builder (.from().select()
 *     etc.). The full RPC-success/null-data/real-error/RPC-missing tree
 *     from PR #118's recordPayment tests doesn't apply here.
 *   - No custom error classes — invoice.service.ts rethrows raw Supabase
 *     errors without wrapping (no InvoiceResponseLostError analog).
 *   - No new Sentry tag emissions — invoice.service.ts doesn't import
 *     captureSupabaseRpcError or interact with the sentry-tagger surface.
 *     EMITTED_TAG_KEYS unaffected; canonical-rules-tag-contract.test.ts
 *     stays green without extension.
 *   - Multi-table transactional semantics (does createInvoice's
 *     shipment-lookup + customer-lookup + insert sequence handle a mid-
 *     flight RLS denial atomically?) — those need integration tests
 *     against a real Postgres, tracked separately.
 *
 * Sentry registration kept for pattern consistency with payment.service.test.ts
 *   invoice.service.ts itself does NOT emit Sentry events, so the
 *   captureExceptionMock should never be invoked during these tests.
 *   We assert it stays clean as a passive sanity check on the "no new
 *   tag emissions" contract.
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
 * Import invoice.service.ts FRESH each call. Mirrors freshPaymentService
 * from payment.service.test.ts. invoice.service.ts has no module-level
 * mutable state today, but the pattern is retained for consistency —
 * if a future refactor adds module-level caching (like payment.service's
 * relation-missing TTL), tests don't need to be reshuffled.
 */
async function freshInvoiceService() {
  vi.resetModules()
  const { registerSentry: register } = await import("../shared/sentry-tagger")
  register({ captureException: captureExceptionMock })
  const mod = await import("../invoice.service")
  return mod
}

// ─── getInvoices ─────────────────────────────────────────────────────────────

describe("getInvoices", () => {
  const SAMPLE_ROW = {
    id: "inv-1",
    invoice_number: "INV-2026-001",
    awb_number: "TAC26001",
    shipment_id: "ship-1",
    customer_id: "cust-1",
    customer_name: "Acme Logistics",
    customer_gstin: "29ABCDE1234F1Z5",
    status: "DRAFT",
    payment_mode: "PAID",
    base_freight: 1000,
    docket_charge: 50,
    pickup_charge: 0,
    packing_charge: 0,
    fuel_surcharge: 0,
    handling_fee: 0,
    insurance: 0,
    discount: 0,
    tax: { cgst: 90, sgst: 90, igst: 0, total: 180 },
    total_amount: 1230,
    advance_paid: 0,
    balance: 1230,
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
  }

  it("returns mapped invoices when DB returns rows", async () => {
    const db = makeDb({
      fromResults: { invoices: { data: [SAMPLE_ROW], error: null } },
    })
    const { createInvoiceService } = await freshInvoiceService()
    const invoices = await createInvoiceService(db).getInvoices()
    expect(invoices).toHaveLength(1)
    expect(invoices[0]).toMatchObject({
      id: "inv-1",
      invoiceNumber: "INV-2026-001",
      status: "DRAFT",
      totalAmount: 1230,
    })
    expect(db.from).toHaveBeenCalledWith("invoices")
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("returns empty array when DB returns null data", async () => {
    const db = makeDb({
      fromResults: { invoices: { data: null, error: null } },
    })
    const { createInvoiceService } = await freshInvoiceService()
    const invoices = await createInvoiceService(db).getInvoices()
    expect(invoices).toEqual([])
  })

  it("throws on DB error", async () => {
    const db = makeDb({
      fromResults: {
        invoices: { data: null, error: { code: "57P01", message: "admin shutdown" } },
      },
    })
    const { createInvoiceService } = await freshInvoiceService()
    await expect(createInvoiceService(db).getInvoices()).rejects.toMatchObject({
      code: "57P01",
    })
  })

  it("applies a status-array filter via .in('status', [...])", async () => {
    // Capture the .in() args to pin the actual filter predicate, not
    // just that the chain stayed alive. CodeRabbit caught the prior
    // assertion was too weak: a regression that dropped the status
    // filter entirely would still have passed `from('invoices')`.
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createInvoiceService } = await freshInvoiceService()
    await createInvoiceService(db).getInvoices({
      status: [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED],
    })
    // Service uppercases via toDbInvoiceStatus before sending to PG.
    const inArgs = spy.firstCallArgs("in")
    expect(inArgs?.[0]).toBe("status")
    expect(inArgs?.[1]).toEqual(["DRAFT", "ISSUED"])
  })

  it("applies search + date-range filters with the expected predicate values", async () => {
    // Capture .or(), .gte(), .lte() args. Pins all three filter predicates
    // in one test — a regression that drops any one of them fails loud.
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createInvoiceService } = await freshInvoiceService()
    await createInvoiceService(db).getInvoices({
      search: "TAC26001",
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    })
    // Search uses a multi-column ilike .or() — the service constructs
    // the exact string; pin both column predicates.
    const orArg = spy.firstCallArgs("or")?.[0]
    expect(typeof orArg).toBe("string")
    expect(orArg as string).toContain("invoice_number.ilike.%TAC26001%")
    expect(orArg as string).toContain("awb_number.ilike.%TAC26001%")
    expect(spy.firstCallArgs("gte")).toEqual(["created_at", "2026-01-01"])
    expect(spy.firstCallArgs("lte")).toEqual(["created_at", "2026-12-31"])
  })

  it("defaults pageSize to 50 when caller omits it", async () => {
    // Capture the .limit() arg directly — the previous version of this
    // test only asserted .from("invoices") was called, which would pass
    // if the default were 100, 25, or any other value. CodeRabbit caught
    // that the contract is about the VALUE (50), not just call existence.
    const db = makeDb({})
    const { fromImpl, spies } = makeBuilderSpyByTable({
      invoices: { data: [], error: null },
    })
    vi.mocked(db.from).mockImplementation(fromImpl)
    const { createInvoiceService } = await freshInvoiceService()
    await createInvoiceService(db).getInvoices()
    expect(spies.invoices?.firstCallArgs("limit")?.[0]).toBe(50)
  })
})

// ─── getInvoiceById ──────────────────────────────────────────────────────────

describe("getInvoiceById", () => {
  it("returns mapped Invoice when found", async () => {
    const db = makeDb({
      fromResults: {
        invoices: {
          data: { id: "inv-1", invoice_number: "INV-2026-001", status: "DRAFT" },
          error: null,
        },
      },
    })
    const { createInvoiceService } = await freshInvoiceService()
    const invoice = await createInvoiceService(db).getInvoiceById("inv-1")
    expect(invoice).not.toBeNull()
    expect(invoice!.id).toBe("inv-1")
    expect(invoice!.status).toBe("DRAFT")
  })

  it("returns null when DB returns no data (.single() with maybeSingle-like contract)", async () => {
    const db = makeDb({
      fromResults: { invoices: { data: null, error: null } },
    })
    const { createInvoiceService } = await freshInvoiceService()
    expect(await createInvoiceService(db).getInvoiceById("missing")).toBeNull()
  })

  it("throws on DB error", async () => {
    const db = makeDb({
      fromResults: {
        invoices: {
          data: null,
          error: { code: "PGRST116", message: "row not found" },
        },
      },
    })
    const { createInvoiceService } = await freshInvoiceService()
    await expect(
      createInvoiceService(db).getInvoiceById("inv-1"),
    ).rejects.toMatchObject({ code: "PGRST116" })
  })
})

// ─── createInvoice ───────────────────────────────────────────────────────────

describe("createInvoice — multi-step path (shipments → customers → invoices)", () => {
  const SHIPMENT_ROW = { id: "ship-1", awb_number: "TAC26001" }
  const CUSTOMER_ROW = { id: "11111111-1111-1111-1111-111111111111" }
  const INSERTED_ROW = {
    id: "inv-new",
    invoice_number: "INV-2026-099",
    status: "DRAFT",
    payment_mode: "TO_PAY",
    total_amount: 0,
  }
  const VALID_UUID = "11111111-1111-1111-1111-111111111111"

  it("happy path: awb + valid customer UUID + shipment found + customer exists", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      fromResults: {
        shipments: { data: SHIPMENT_ROW, error: null },
        customers: { data: CUSTOMER_ROW, error: null },
        invoices: { data: INSERTED_ROW, error: null },
      },
    })
    const { createInvoiceService } = await freshInvoiceService()
    const created = await createInvoiceService(db).createInvoice({
      invoice_number: "INV-2026-099",
      awb_number: "tac26001", // lowercased — service uppercases before lookup
      customer_id: VALID_UUID,
    })
    expect(created.id).toBe("inv-new")

    // CodeRabbit preempt (PR #118 pattern): assert EXACT call order +
    // count on multi-step chains. Bare toHaveBeenCalledWith would not
    // catch a regression that skipped the customer lookup.
    expect(db.from).toHaveBeenCalledTimes(3)
    expect(db.from).toHaveBeenNthCalledWith(1, "shipments")
    expect(db.from).toHaveBeenNthCalledWith(2, "customers")
    expect(db.from).toHaveBeenNthCalledWith(3, "invoices")
  })

  it("shipment not found → null linkage + notes.externalAwbNumber metadata", async () => {
    const db = makeDb({})
    const { fromImpl, spies, tableCalls } = makeBuilderSpyByTable({
      shipments: { data: null, error: null },
      invoices: { data: INSERTED_ROW, error: null },
    })
    vi.mocked(db.from).mockImplementation(fromImpl)

    const { createInvoiceService } = await freshInvoiceService()
    await createInvoiceService(db).createInvoice({
      invoice_number: "INV-2026-100",
      awb_number: "ORPHAN1234",
    })

    const insertArgs = spies.invoices?.argsFor("insert") ?? []
    expect(insertArgs).toHaveLength(1)
    const payload = insertArgs[0] as Record<string, unknown>
    expect(payload.awb_number).toBeNull()
    expect(payload.shipment_id).toBeNull()
    // Notes field should be JSON containing externalAwbNumber=ORPHAN1234
    expect(typeof payload.notes).toBe("string")
    expect(JSON.parse(payload.notes as string)).toMatchObject({
      externalAwbNumber: "ORPHAN1234",
    })
    expect(tableCalls).toEqual(["shipments", "invoices"])
  })

  it("invalid UUID short-circuits the customer lookup (UUID-guard)", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      fromResults: {
        invoices: { data: INSERTED_ROW, error: null },
      },
    })
    const { createInvoiceService } = await freshInvoiceService()
    await createInvoiceService(db).createInvoice({
      invoice_number: "INV-2026-101",
      customer_id: "not-a-uuid", // fails UUID_RE
    })
    // UUID-guard prevented the customers table from being queried.
    // tableCalls should NOT include "customers".
    expect(tableCalls).not.toContain("customers")
  })

  it("valid UUID but customer not in DB → null customer_id + notes.invalidCustomerId", async () => {
    const db = makeDb({})
    const { fromImpl, spies } = makeBuilderSpyByTable({
      customers: { data: null, error: null }, // customer NOT found
      invoices: { data: INSERTED_ROW, error: null },
    })
    vi.mocked(db.from).mockImplementation(fromImpl)
    const { createInvoiceService } = await freshInvoiceService()
    await createInvoiceService(db).createInvoice({
      invoice_number: "INV-2026-102",
      customer_id: VALID_UUID,
    })
    const insertArgs = spies.invoices?.argsFor("insert") ?? []
    expect(insertArgs).toHaveLength(1)
    const payload = insertArgs[0] as Record<string, unknown>
    expect(payload.customer_id).toBeNull()
    expect(JSON.parse(payload.notes as string)).toMatchObject({
      invalidCustomerId: VALID_UUID,
    })
  })

  it("findShipment error rethrows", async () => {
    const db = makeDb({
      fromResults: {
        shipments: { data: null, error: { code: "57P01", message: "shutdown" } },
      },
    })
    const { createInvoiceService } = await freshInvoiceService()
    await expect(
      createInvoiceService(db).createInvoice({
        invoice_number: "X",
        awb_number: "TAC26001",
      }),
    ).rejects.toMatchObject({ code: "57P01" })
  })

  it("customerExists error rethrows", async () => {
    const db = makeDb({
      fromResults: {
        customers: { data: null, error: { code: "42501", message: "RLS denied" } },
      },
    })
    const { createInvoiceService } = await freshInvoiceService()
    await expect(
      createInvoiceService(db).createInvoice({
        invoice_number: "X",
        customer_id: VALID_UUID,
      }),
    ).rejects.toMatchObject({ code: "42501" })
  })

  it("insert error rethrows", async () => {
    const db = makeDb({
      fromResults: {
        invoices: {
          data: null,
          error: { code: "23505", message: "duplicate invoice_number" },
        },
      },
    })
    const { createInvoiceService } = await freshInvoiceService()
    await expect(
      createInvoiceService(db).createInvoice({ invoice_number: "DUP" }),
    ).rejects.toMatchObject({ code: "23505" })
  })

  it("preserves existing JSON notes when merging metadata", async () => {
    const db = makeDb({})
    const { fromImpl, spies } = makeBuilderSpyByTable({
      shipments: { data: null, error: null },
      invoices: { data: INSERTED_ROW, error: null },
    })
    vi.mocked(db.from).mockImplementation(fromImpl)
    const { createInvoiceService } = await freshInvoiceService()
    await createInvoiceService(db).createInvoice({
      invoice_number: "INV-2026-104",
      awb_number: "ORPHAN",
      notes: JSON.stringify({ preExisting: "value" }),
    })
    const insertArgs = spies.invoices?.argsFor("insert") ?? []
    const parsed = JSON.parse((insertArgs[0] as Record<string, unknown>).notes as string)
    expect(parsed).toMatchObject({
      preExisting: "value",
      externalAwbNumber: "ORPHAN",
    })
  })

  it("falls back gracefully when existing notes is not valid JSON", async () => {
    // mergeInvoiceNotes catches the parse failure and wraps the
    // non-JSON notes value into a `notes` field of the new JSON object.
    const db = makeDb({})
    const { fromImpl, spies } = makeBuilderSpyByTable({
      shipments: { data: null, error: null },
      invoices: { data: INSERTED_ROW, error: null },
    })
    vi.mocked(db.from).mockImplementation(fromImpl)
    const { createInvoiceService } = await freshInvoiceService()
    await createInvoiceService(db).createInvoice({
      invoice_number: "INV-2026-105",
      awb_number: "ORPHAN",
      notes: "free-text note (not JSON)",
    })
    const insertArgs = spies.invoices?.argsFor("insert") ?? []
    const parsed = JSON.parse((insertArgs[0] as Record<string, unknown>).notes as string)
    expect(parsed).toMatchObject({
      notes: "free-text note (not JSON)",
      externalAwbNumber: "ORPHAN",
    })
  })
})

// ─── issueInvoice / markPaid / cancelInvoice ─────────────────────────────────

describe("issueInvoice", () => {
  it("issues with status=ISSUED + guards on current state DRAFT", async () => {
    // Capture both the .update() payload AND the .eq() guard predicates.
    // CodeRabbit caught that a "did not throw" assertion would pass even
    // if a regression dropped the .eq("status", "DRAFT") guard — which
    // would silently allow ISSUE on any current status, a real bug.
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({ data: null, error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createInvoiceService } = await freshInvoiceService()
    await expect(
      createInvoiceService(db).issueInvoice("inv-1"),
    ).resolves.toBeUndefined()

    // Update payload: status flipped to ISSUED + issued_at populated
    const updatePayload = spy.firstCallArgs("update")?.[0] as Record<string, unknown> | undefined
    expect(updatePayload?.status).toBe("ISSUED")
    expect(typeof updatePayload?.issued_at).toBe("string")

    // Two guards must run: id match + current-status=DRAFT.
    // The current-status guard is load-bearing — drop it and the
    // service would issue invoices in any state including PAID/CANCELLED.
    const eqCalls = spy.calls.eq.map(([col, val]) => ({ col, val }))
    expect(eqCalls).toContainEqual({ col: "id", val: "inv-1" })
    expect(eqCalls).toContainEqual({ col: "status", val: "DRAFT" })
  })

  it("rethrows on DB error", async () => {
    const db = makeDb({
      fromResults: {
        invoices: {
          data: null,
          error: { code: "P0001", message: "trigger blocked update" },
        },
      },
    })
    const { createInvoiceService } = await freshInvoiceService()
    await expect(
      createInvoiceService(db).issueInvoice("inv-1"),
    ).rejects.toMatchObject({ code: "P0001" })
  })
})

describe("markPaid", () => {
  it("uses provided paidAt when caller passes one (asserts the value reaches the DB payload)", async () => {
    // Symmetric to the default-now test below: capture .update() args
    // and pin paid_at === the provided value. CodeRabbit caught that
    // I missed this site in the prior arg-capture sweep — bare resolves-
    // undefined would pass even if the service ignored the caller's
    // input and wrote a different timestamp (or `undefined`).
    const providedPaidAt = "2026-05-15T10:00:00Z"
    const db = makeDb({})
    const { fromImpl, spies } = makeBuilderSpyByTable({
      invoices: { data: null, error: null },
    })
    vi.mocked(db.from).mockImplementation(fromImpl)
    const { createInvoiceService } = await freshInvoiceService()
    await expect(
      createInvoiceService(db).markPaid("inv-1", providedPaidAt),
    ).resolves.toBeUndefined()
    const updateArg = spies.invoices?.firstCallArgs("update")?.[0] as
      | { paid_at?: unknown }
      | undefined
    expect(updateArg?.paid_at).toBe(providedPaidAt)
  })

  it("defaults paidAt to now-ish ISO when caller omits it", async () => {
    // Capture the .update() arg's paid_at field directly — the previous
    // version of this test asserted only wall-clock progression, which
    // would pass even if the service sent `paid_at: undefined` or a
    // hardcoded epoch timestamp. CodeRabbit caught that the contract is
    // about the VALUE in the update payload, not the wall clock.
    const before = new Date().toISOString()
    const db = makeDb({})
    const { fromImpl, spies } = makeBuilderSpyByTable({
      invoices: { data: null, error: null },
    })
    vi.mocked(db.from).mockImplementation(fromImpl)
    const { createInvoiceService } = await freshInvoiceService()
    await createInvoiceService(db).markPaid("inv-1")
    const after = new Date().toISOString()
    const updateArg = spies.invoices?.firstCallArgs("update")?.[0] as
      | { paid_at?: unknown }
      | undefined
    const paidAtArg = updateArg?.paid_at
    expect(typeof paidAtArg).toBe("string")
    expect(
      (paidAtArg as string) >= before && (paidAtArg as string) <= after,
    ).toBe(true)
  })

  it("rethrows on DB error", async () => {
    const db = makeDb({
      fromResults: {
        invoices: {
          data: null,
          error: { code: "23514", message: "check violation" },
        },
      },
    })
    const { createInvoiceService } = await freshInvoiceService()
    await expect(
      createInvoiceService(db).markPaid("inv-1"),
    ).rejects.toMatchObject({ code: "23514" })
  })
})

describe("cancelInvoice (post-#134 withAudit-wrapped)", () => {
  // Per the audit-logs PR-2 adoption (#134), cancelInvoice now:
  //   1. SELECTs the invoice row (forensic before_state).
  //   2. If the row doesn't exist, short-circuits — no audit, no UPDATE.
  //   3. Wraps the UPDATE in withAudit. Audit-first / fail-loud.
  // The .in("status", [DRAFT, ISSUED]) guard is PRESERVED inside the
  // wrapper — a regression that drops it would still let the audit row
  // commit (operator attempted to cancel), then the UPDATE would
  // affect zero rows. That divergence between "audit says cancelled"
  // and "DB row unchanged" is exactly the forensic signal an audit
  // surface should record.
  const SAMPLE_INVOICE = {
    id: "inv-1",
    invoice_number: "INV-001",
    status: "ISSUED",
    total_amount: 2000,
    customer_id: "cust-1",
    created_at: "2026-05-15T10:00:00Z",
  }

  it("cancels with status=CANCELLED + preserves the DRAFT|ISSUED status guard", async () => {
    // Single-builder pattern still works: every db.from() call shares
    // the spy, so we can read both the audit INSERT and the UPDATE
    // payload off the same recording. The SELECT returns the row
    // because we configured data: SAMPLE_INVOICE.
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({ data: SAMPLE_INVOICE, error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createInvoiceService } = await freshInvoiceService()
    await expect(
      createInvoiceService(db).cancelInvoice("inv-1"),
    ).resolves.toBeUndefined()

    // Audit INSERT happened with the right shape — the action literal
    // is the one the registry knows + the CHECK constraint accepts.
    const insertPayload = spy.firstCallArgs("insert")?.[0] as
      | Record<string, unknown>
      | undefined
    expect(insertPayload?.action).toBe("invoice_cancel")
    expect(insertPayload?.entity_type).toBe("invoice")
    expect(insertPayload?.entity_id).toBe("inv-1")
    expect(insertPayload?.before_state).toEqual(SAMPLE_INVOICE)

    // Status UPDATE payload + the load-bearing guard.
    const updatePayload = spy.firstCallArgs("update")?.[0] as Record<string, unknown> | undefined
    expect(updatePayload?.status).toBe("CANCELLED")

    // Critical guard: in("status", [DRAFT, ISSUED]) — restricts cancel
    // to the two pre-paid states. Without this, cancel could overwrite
    // PAID/OVERDUE/CANCELLED rows.
    const inArgs = spy.firstCallArgs("in")
    expect(inArgs?.[0]).toBe("status")
    expect(inArgs?.[1]).toEqual(["DRAFT", "ISSUED"])

    // No-double-audit: audit_logs hit exactly once.
    const tableCalls = vi.mocked(db.from).mock.calls.map((c) => c[0])
    expect(tableCalls.filter((t) => t === "audit_logs")).toHaveLength(1)
  })

  it("reads the row, writes one audit row, then updates — table-call ordering", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      fromResults: {
        invoices: { data: SAMPLE_INVOICE, error: null },
        audit_logs: { data: null, error: null },
      },
    })
    const { createInvoiceService } = await freshInvoiceService()
    await createInvoiceService(db).cancelInvoice("inv-1")
    expect(tableCalls).toEqual([
      "invoices",   // SELECT (read row for before_state)
      "audit_logs", // audit INSERT (audit-first)
      "invoices",   // UPDATE (cancel, with status guard)
    ])
  })

  it("short-circuits silently with no audit when the invoice doesn't exist", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      fromResults: {
        invoices: { data: null, error: null },
        audit_logs: { data: null, error: null },
      },
    })
    const { createInvoiceService } = await freshInvoiceService()
    await expect(
      createInvoiceService(db).cancelInvoice("inv-missing"),
    ).resolves.toBeUndefined()
    // Only one .from() — the SELECT that found nothing.
    expect(tableCalls).toEqual(["invoices"])
  })

  it("audit-write failure: AuditWriteFailedError surfaces and the UPDATE never runs", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      fromResults: {
        invoices: { data: SAMPLE_INVOICE, error: null },
        audit_logs: {
          data: null,
          error: { code: "23514", message: "violates audit_logs CHECK" },
        },
      },
    })
    const { createInvoiceService } = await freshInvoiceService()
    await expect(
      createInvoiceService(db).cancelInvoice("inv-1"),
    ).rejects.toMatchObject({ code: "AUDIT_WRITE_FAILED" })
    // SELECT happened, audit INSERT was attempted, UPDATE was NOT.
    expect(tableCalls).toEqual(["invoices", "audit_logs"])
  })

  it("rethrows on DB error from the SELECT pre-fetch", async () => {
    const db = makeDb({
      fromResults: {
        invoices: {
          data: null,
          error: { code: "P0001", message: "trigger refused read" },
        },
      },
    })
    const { createInvoiceService } = await freshInvoiceService()
    await expect(
      createInvoiceService(db).cancelInvoice("inv-1"),
    ).rejects.toMatchObject({ code: "P0001" })
  })
})

// ─── getOverdueCount ─────────────────────────────────────────────────────────

describe("getOverdueCount", () => {
  it("queries invoices with .eq('status', 'OVERDUE') + returns the count", async () => {
    // Pin the table + the overdue predicate. CodeRabbit caught that the
    // prior mock accepted any table — if the service pointed at the wrong
    // table or dropped the status filter, the test would still have passed.
    const db = makeDb({})
    const { fromImpl, spies, tableCalls } = makeBuilderSpyByTable({
      invoices: { count: 7, error: null },
    })
    vi.mocked(db.from).mockImplementation(fromImpl)
    const { createInvoiceService } = await freshInvoiceService()
    expect(await createInvoiceService(db).getOverdueCount()).toBe(7)
    expect(tableCalls).toContain("invoices")
    const eqCalls = (spies.invoices?.calls.eq ?? []).map(([col, val]) => ({ col, val }))
    expect(eqCalls).toContainEqual({ col: "status", val: "OVERDUE" })
  })

  it("returns 0 when count is null", async () => {
    const db = makeDb({})
    const { builder } = makeBuilderSpy({ count: null, error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createInvoiceService } = await freshInvoiceService()
    expect(await createInvoiceService(db).getOverdueCount()).toBe(0)
  })

  it("throws on DB error", async () => {
    const db = makeDb({})
    const { builder } = makeBuilderSpy({ count: null, error: { code: "X", message: "fail" } })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createInvoiceService } = await freshInvoiceService()
    await expect(
      createInvoiceService(db).getOverdueCount(),
    ).rejects.toMatchObject({ code: "X" })
  })
})

// ─── InvoiceStatus enum exhaustiveness sentinel ──────────────────────────────

describe("InvoiceStatus enum exhaustiveness sentinel", () => {
  // Hardcoded list pinned to the InvoiceStatus runtime enum. Unlike
  // PaymentMethod (string-union) from PR #118, InvoiceStatus is a
  // runtime enum, so Object.values would work — but per the campaign's
  // project laws, hardcoded matrices + sentinel is the contract.
  // The forcing function: adding a new status fails the sentinel,
  // forcing the developer to update every matrix using InvoiceStatus
  // with conscious intent (status-transition guards, status-filter
  // arrays, etc.). Same shape as packages/auth/src/rbac.test.ts's
  // UserRole sentinel.
  it("has exactly the expected set of statuses", () => {
    expect(new Set(Object.values(InvoiceStatus))).toEqual(
      new Set([
        InvoiceStatus.DRAFT,
        InvoiceStatus.ISSUED,
        InvoiceStatus.PAID,
        InvoiceStatus.CANCELLED,
        InvoiceStatus.OVERDUE,
      ]),
    )
  })

  // String-union exhaustiveness pattern carried forward from PR #118's
  // PaymentMethod sentinel. Even though InvoiceStatus is a runtime enum,
  // pinning a const list with `satisfies readonly InvoiceStatus[]` +
  // `Exclude<>` provides compile-time forcing-function — adding a new
  // status fails `pnpm typecheck`, not just runtime.
  const ALL_STATUSES = [
    InvoiceStatus.DRAFT,
    InvoiceStatus.ISSUED,
    InvoiceStatus.PAID,
    InvoiceStatus.CANCELLED,
    InvoiceStatus.OVERDUE,
  ] as const satisfies readonly InvoiceStatus[]
  type _MissingStatuses = Exclude<InvoiceStatus, (typeof ALL_STATUSES)[number]>
  const _allCovered: _MissingStatuses extends never ? true : never = true
  void _allCovered // reference to silence unused-var; the type check IS the assertion

  it.each(ALL_STATUSES)(
    "status %s is a valid enum member",
    (status) => {
      expect(Object.values(InvoiceStatus)).toContain(status)
    },
  )
})

// ─── PaymentMode enum sentinel + legacy-alias round-trip ─────────────────────

describe("PaymentMode enum sentinel + toDbPaymentMode legacy aliases", () => {
  it("PaymentMode has exactly the canonical set", () => {
    expect(new Set(Object.values(PaymentMode))).toEqual(
      new Set([PaymentMode.PAID, PaymentMode.TO_PAY, PaymentMode.TBB]),
    )
  })

  // Compile-time exhaustiveness sentinel — same pattern as
  // InvoiceStatus above + PR #118's PaymentMethod.
  const ALL_MODES = [
    PaymentMode.PAID,
    PaymentMode.TO_PAY,
    PaymentMode.TBB,
  ] as const satisfies readonly PaymentMode[]
  type _MissingModes = Exclude<PaymentMode, (typeof ALL_MODES)[number]>
  const _allModesCovered: _MissingModes extends never ? true : never = true
  void _allModesCovered
  void ALL_MODES // reference to silence no-unused-vars; the type-check IS the assertion

  // Round-trip the three legacy lowercase aliases the service maps. We
  // verify behavior via createInvoice — the service's toDbPaymentMode
  // is private, but its output lands in the insert payload.
  it.each([
    ["topay", "TO_PAY"],
    ["credit", "TBB"],
    ["prepaid", "PAID"],
  ])("legacy alias %s maps to canonical %s in the insert payload", async (input, expected) => {
    const db = makeDb({})
    const { fromImpl, spies } = makeBuilderSpyByTable({
      invoices: { data: { id: "x", invoice_number: "Y", status: "DRAFT" }, error: null },
    })
    vi.mocked(db.from).mockImplementation(fromImpl)
    const { createInvoiceService } = await freshInvoiceService()
    await createInvoiceService(db).createInvoice({
      invoice_number: "PM-TEST",
      payment_mode: input,
    } as never)
    const insertArg = spies.invoices?.firstCallArgs("insert")?.[0] as Record<string, unknown>
    expect(insertArg.payment_mode).toBe(expected)
  })

  it("unknown payment_mode falls back to TO_PAY default in the insert payload", async () => {
    const db = makeDb({})
    const { fromImpl, spies } = makeBuilderSpyByTable({
      invoices: { data: { id: "x", invoice_number: "Y", status: "DRAFT" }, error: null },
    })
    vi.mocked(db.from).mockImplementation(fromImpl)
    const { createInvoiceService } = await freshInvoiceService()
    await createInvoiceService(db).createInvoice({
      invoice_number: "PM-MISSING",
      payment_mode: undefined,
    } as never)
    const insertArg = spies.invoices?.firstCallArgs("insert")?.[0] as Record<string, unknown>
    expect(insertArg.payment_mode).toBe("TO_PAY")
  })
})

// ─── Sentry-tag-emission sanity check (negative assertion) ───────────────────

describe("Sentry tag emission (negative assertion)", () => {
  it("invoice.service does NOT emit Sentry events during normal CRUD", async () => {
    // Passive sanity check on the "no new tag emissions" contract
    // documented in the file docstring. If a future refactor adds
    // a captureSupabaseRpcError call (e.g. wrapping a future RPC),
    // this assertion fails — forcing the developer to update both
    // EMITTED_TAG_KEYS in scripts/sentry/canonical-rules.mjs AND
    // the cross-package contract sentinel test.
    const db = makeDb({
      fromResults: { invoices: { data: [], error: null } },
    })
    const { createInvoiceService } = await freshInvoiceService()
    const service = createInvoiceService(db)
    await service.getInvoices()
    await service.getInvoiceById("inv-1")
    // createInvoice is the multi-step path with the riskiest accidental-
    // emission surface (shipments lookup + customers lookup + insert).
    // CodeRabbit caught this was missing from the prior CRUD sequence.
    // Cast as never because createInvoice's input type requires fields
    // we don't need to populate for this passive check.
    await service.createInvoice({ invoice_number: "INV-SMOKE-1" } as never)
    await service.issueInvoice("inv-1")
    await service.markPaid("inv-1")
    await service.cancelInvoice("inv-1")
    await service.getOverdueCount()
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })
})
