import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { HubCode, ShipmentStatus } from "@workspace/types"

import { registerSentry } from "../shared/sentry-tagger"
import { SUPABASE_RPC_TAG_KEYS } from "../shared/with-rpc"
import { makeDb } from "./helpers/make-db"
import {
  makeBuilderSpy,
  makeBuilderSpyByTable,
} from "./helpers/make-builder-spy"

/**
 * Test floor for shipment.service.ts — ticks the #102 Sprint 2 sub-item:
 *   - Unit tests for shipment.service.ts (9.2KB, 0 tests today)
 *
 * Mirrors PR #118 (payment.service.test.ts) + PR #123 (invoice.service.test.ts)
 * pattern verbatim:
 *   - `makeDb` from helpers/make-db.ts (shared builder; not forked)
 *   - `freshShipmentService()` factory with vi.resetModules() per test
 *   - Mock at the Supabase client factory boundary; let withRpc +
 *     sentry-tagger run as real code
 *   - `makeBuilderSpy` / `makeBuilderSpyByTable` from helpers/make-builder-spy.ts
 *     (newly-extracted at this PR's commit 1, third consumer of the inline
 *     pattern per catalog entry #9 abstract-on-second-use rule)
 *
 * Scope (JS-side only, no real Postgres):
 *   - getShipments: 9 filter/branch combinations (default+order, status,
 *     originHub, destHub, search, pageSize, null-data, error, multi-filter)
 *   - getShipmentById / getShipmentByAwb: found / null / error each
 *   - getTrackingEvents: rows / null / error
 *   - createShipment: happy + payload capture / error
 *   - generateAwbNumber: full withRpc decision tree (success / empty data
 *     contract / non-string data / RPC error → emit + throw)
 *   - bulkCreateShipments: full RPC-or-fallback decision tree mirroring
 *     payment.service's recordPayment shape — RPC happy / RPC defaults /
 *     RPC real-error emit+throw / RPC missing fallback (PGRST205 + 42883) /
 *     chunking at 100-row boundary / per-row error indexing /
 *     Sentry NOT emitted on missing-RPC (selective adoption)
 *   - updateStatus: payload + .eq guard / error
 *   - countByStatus: aggregation / null-data / error
 *   - ShipmentStatus enum exhaustiveness via dual-sentinel (Object.values +
 *     satisfies + Exclude<>) — same shape as InvoiceStatus in PR #123 +
 *     PaymentMethod in PR #118
 *   - Sentry tag emission (negative): non-emitting methods do not trigger
 *     captureException — passive sanity check on the EMITTED_TAG_KEYS
 *     contract
 *
 * NOT IN SCOPE (documented absences per acceptance criteria):
 *   - Mapper helpers (mapShipment / mapSummary / mapTrackingEvent) are
 *     exercised via the public methods. The mapShipment row.service_level
 *     → serviceLevel implicit-string-shape coupling IS captured here as
 *     CURRENT BEHAVIOR — issue #131's branded-ServiceLevel-type work will
 *     require updating these tests when it lands. Designer-flag: this is
 *     the `track/[awb]/page.tsx` Mode column failure mode (see PR #128).
 *   - Source-file `as unknown as Shipment` casts at lines 203/260/276 of
 *     shipment.service.ts: per the "no unrelated bugs" rule, NOT touched
 *     here. Catalog #11 candidates for a future cast-cleanup session.
 *   - Real-Postgres concurrent semantics for bulkCreateShipments and the
 *     fallback's racy two-step nature — those need integration tests
 *     against real Postgres, tracked separately.
 *   - Multi-tenant RLS isolation — same.
 *
 * Sentry registration kept consistent with payment/invoice. shipment.service
 *   DOES emit captureSupabaseRpcError via withRpc on the generateAwbNumber
 *   path AND directly on bulkCreateShipments's real-error branch. Both
 *   positive emissions are pinned in their describe blocks; non-emission
 *   on every other public method is pinned in the negative-assertion
 *   describe at the bottom of this file.
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
 * Import shipment.service.ts FRESH each call. Mirrors freshPaymentService /
 * freshInvoiceService. shipment.service.ts has no module-level mutable
 * state today, but the pattern is retained for consistency — if a future
 * refactor adds module-level caching, tests don't need to be reshuffled.
 */
async function freshShipmentService() {
  vi.resetModules()
  const { registerSentry: register } = await import("../shared/sentry-tagger")
  register({ captureException: captureExceptionMock })
  const mod = await import("../shipment.service")
  return mod
}

// ─── getShipments ────────────────────────────────────────────────────────────

describe("getShipments", () => {
  const SAMPLE_SUMMARY_ROW = {
    id: "ship-1",
    awb_number: "TAC26001",
    status: "CREATED",
    sender_name: "Acme",
    receiver_name: "Beta",
    origin_hub: "BLR",
    dest_hub: "BOM",
    chargeable_weight: 12.5,
    total_amount: 1500,
    pieces: 3,
    manifest_number: "MAN-001",
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
  }

  it("returns mapped ShipmentSummary[] on success", async () => {
    const db = makeDb({
      fromResults: { shipments: { data: [SAMPLE_SUMMARY_ROW], error: null } },
    })
    const { createShipmentService } = await freshShipmentService()
    const summaries = await createShipmentService(db).getShipments()
    expect(summaries).toHaveLength(1)
    expect(summaries[0]).toMatchObject({
      id: "ship-1",
      awbNumber: "TAC26001",
      status: "CREATED",
      senderName: "Acme",
      receiverName: "Beta",
      originHub: "BLR",
      destHub: "BOM",
      chargeableWeight: 12.5,
      totalAmount: 1500,
      pieces: 3,
      manifestNumber: "MAN-001",
    })
    expect(db.from).toHaveBeenCalledWith("shipments")
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("returns empty array when DB returns null data", async () => {
    const db = makeDb({
      fromResults: { shipments: { data: null, error: null } },
    })
    const { createShipmentService } = await freshShipmentService()
    expect(await createShipmentService(db).getShipments()).toEqual([])
  })

  it("throws on DB error", async () => {
    const db = makeDb({
      fromResults: {
        shipments: { data: null, error: { code: "57P01", message: "admin shutdown" } },
      },
    })
    const { createShipmentService } = await freshShipmentService()
    await expect(createShipmentService(db).getShipments()).rejects.toMatchObject({
      code: "57P01",
    })
  })

  it("defaults pageSize to 50 + orders by created_at DESC", async () => {
    // Pin BOTH default predicates: .limit(50) and .order("created_at",
    // {ascending:false}). Catalog entry #1: bare `db.from("shipments")`
    // assertion would pass even if the default were 100 or order were
    // reversed.
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createShipmentService } = await freshShipmentService()
    await createShipmentService(db).getShipments()
    expect(spy.firstCallArgs("limit")?.[0]).toBe(50)
    const orderArgs = spy.firstCallArgs("order")
    expect(orderArgs?.[0]).toBe("created_at")
    expect(orderArgs?.[1]).toEqual({ ascending: false })
  })

  it("applies a status[] filter via .in('status', [...])", async () => {
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createShipmentService } = await freshShipmentService()
    await createShipmentService(db).getShipments({
      status: [ShipmentStatus.CREATED, ShipmentStatus.IN_TRANSIT],
    })
    const inArgs = spy.firstCallArgs("in")
    expect(inArgs?.[0]).toBe("status")
    expect(inArgs?.[1]).toEqual(["CREATED", "IN_TRANSIT"])
  })

  it("applies originHub filter via .eq('origin_hub', X)", async () => {
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createShipmentService } = await freshShipmentService()
    await createShipmentService(db).getShipments({ originHub: HubCode.IMPHAL })
    const eqCalls = spy.calls.eq.map(([col, val]) => ({ col, val }))
    expect(eqCalls).toContainEqual({ col: "origin_hub", val: "IMPHAL" })
  })

  it("applies destHub filter via .eq('dest_hub', X)", async () => {
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createShipmentService } = await freshShipmentService()
    await createShipmentService(db).getShipments({ destHub: HubCode.NEW_DELHI })
    const eqCalls = spy.calls.eq.map(([col, val]) => ({ col, val }))
    expect(eqCalls).toContainEqual({ col: "dest_hub", val: "NEW_DELHI" })
  })

  it("applies search filter via .or() with awb/sender/receiver ilike columns", async () => {
    // Pin ALL THREE column predicates in the .or() string. A regression
    // that drops any one (e.g. removing receiver_name from the search)
    // would still pass a length / exists check but fail the value
    // contract per catalog entry #1.
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createShipmentService } = await freshShipmentService()
    await createShipmentService(db).getShipments({ search: "TAC26001" })
    const orArg = spy.firstCallArgs("or")?.[0] as string
    expect(typeof orArg).toBe("string")
    expect(orArg).toContain("awb_number.ilike.%TAC26001%")
    expect(orArg).toContain("sender_name.ilike.%TAC26001%")
    expect(orArg).toContain("receiver_name.ilike.%TAC26001%")
  })

  it("respects pageSize override via .limit(N)", async () => {
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createShipmentService } = await freshShipmentService()
    await createShipmentService(db).getShipments({ pageSize: 25 })
    expect(spy.firstCallArgs("limit")?.[0]).toBe(25)
  })

  it("combines multiple filters in a single chained query", async () => {
    // Pin that all four filters land on the SAME builder chain (one
    // .from() call). A regression that re-issued .from() per filter
    // would explode the call count and silently bypass the AND-semantics
    // that callers depend on.
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createShipmentService } = await freshShipmentService()
    await createShipmentService(db).getShipments({
      status: [ShipmentStatus.IN_TRANSIT],
      originHub: HubCode.IMPHAL,
      destHub: HubCode.NEW_DELHI,
      search: "TAC",
    })
    expect(db.from).toHaveBeenCalledTimes(1)
    expect(spy.calls.in).toHaveLength(1)
    expect(spy.calls.or).toHaveLength(1)
    // .eq is called twice: origin_hub + dest_hub.
    expect(spy.calls.eq).toHaveLength(2)
  })
})

// ─── getShipmentById ─────────────────────────────────────────────────────────

describe("getShipmentById", () => {
  const SAMPLE_SHIPMENT_ROW = {
    id: "ship-1",
    awb_number: "TAC26001",
    status: "CREATED",
    service_level: "EXPRESS",
    payment_mode: "PAID",
    transport_mode: "AIR",
    origin_hub: "BLR",
    dest_hub: "BOM",
    sender_name: "Acme",
    sender_phone: "+91...",
    sender_email: "a@b.c",
    sender_address: "...",
    sender_city: "BLR",
    sender_state: "KA",
    sender_pincode: "560001",
    sender_gstin: null,
    receiver_name: "Beta",
    receiver_phone: "+91...",
    receiver_email: "x@y.z",
    receiver_address: "...",
    receiver_city: "BOM",
    receiver_state: "MH",
    receiver_pincode: "400001",
    receiver_gstin: null,
    dead_weight: 10,
    volumetric_weight: 12,
    chargeable_weight: 12.5,
    pieces: 3,
    description: "test",
    financials: null,
    manifest_id: null,
    manifest_number: null,
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
    created_by: "user-a",
    delivered_at: null,
    cancelled_at: null,
  }

  it("returns mapped Shipment when found", async () => {
    const db = makeDb({
      fromResults: { shipments: { data: SAMPLE_SHIPMENT_ROW, error: null } },
    })
    const { createShipmentService } = await freshShipmentService()
    const shipment = await createShipmentService(db).getShipmentById("ship-1")
    expect(shipment).not.toBeNull()
    expect(shipment!.id).toBe("ship-1")
    expect(shipment!.awbNumber).toBe("TAC26001")
    expect(shipment!.status).toBe("CREATED")
    // Designer-flag: serviceLevel is read from row.service_level by
    // mapShipment. This test pins CURRENT BEHAVIOR — if #131's branded-
    // type work lands, this assertion will need to assert the branded
    // shape (e.g., expect(shipment!.serviceLevel).toMatchBrand(...)).
    expect(shipment!.serviceLevel).toBe("EXPRESS")
  })

  it("returns null when DB returns no data", async () => {
    const db = makeDb({
      fromResults: { shipments: { data: null, error: null } },
    })
    const { createShipmentService } = await freshShipmentService()
    expect(await createShipmentService(db).getShipmentById("missing")).toBeNull()
  })

  it("throws on DB error", async () => {
    const db = makeDb({
      fromResults: {
        shipments: { data: null, error: { code: "PGRST116", message: "row not found" } },
      },
    })
    const { createShipmentService } = await freshShipmentService()
    await expect(
      createShipmentService(db).getShipmentById("ship-1"),
    ).rejects.toMatchObject({ code: "PGRST116" })
  })
})

// ─── getShipmentByAwb ────────────────────────────────────────────────────────

describe("getShipmentByAwb", () => {
  it("queries .eq('awb_number', awb) + returns mapped Shipment", async () => {
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({
      data: { id: "ship-1", awb_number: "TAC26001", status: "CREATED" },
      error: null,
    })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createShipmentService } = await freshShipmentService()
    const shipment = await createShipmentService(db).getShipmentByAwb("TAC26001")
    expect(shipment).not.toBeNull()
    expect(shipment!.awbNumber).toBe("TAC26001")
    const eqCalls = spy.calls.eq.map(([col, val]) => ({ col, val }))
    expect(eqCalls).toContainEqual({ col: "awb_number", val: "TAC26001" })
  })

  it("returns null when DB returns no data", async () => {
    const db = makeDb({
      fromResults: { shipments: { data: null, error: null } },
    })
    const { createShipmentService } = await freshShipmentService()
    expect(await createShipmentService(db).getShipmentByAwb("MISSING")).toBeNull()
  })

  it("throws on DB error", async () => {
    const db = makeDb({
      fromResults: {
        shipments: { data: null, error: { code: "57P01", message: "shutdown" } },
      },
    })
    const { createShipmentService } = await freshShipmentService()
    await expect(
      createShipmentService(db).getShipmentByAwb("TAC26001"),
    ).rejects.toMatchObject({ code: "57P01" })
  })
})

// ─── getTrackingEvents ───────────────────────────────────────────────────────

describe("getTrackingEvents", () => {
  const SAMPLE_EVENT_ROW = {
    id: "evt-1",
    awb_number: "TAC26001",
    status: "PICKED_UP",
    description: "Pickup completed",
    location: "BLR Warehouse",
    hub_code: "BLR",
    source: "scanner",
    staff_id: "user-a",
    staff_name: "Operator A",
    metadata: { device: "scan-1" },
    created_at: "2026-05-15T01:00:00Z",
  }

  it("returns mapped TrackingEvent[] ordered by created_at DESC", async () => {
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({ data: [SAMPLE_EVENT_ROW], error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createShipmentService } = await freshShipmentService()
    const events = await createShipmentService(db).getTrackingEvents("TAC26001")
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      id: "evt-1",
      awbNumber: "TAC26001",
      status: "PICKED_UP",
      description: "Pickup completed",
    })
    const orderArgs = spy.firstCallArgs("order")
    expect(orderArgs?.[0]).toBe("created_at")
    expect(orderArgs?.[1]).toEqual({ ascending: false })
  })

  it("returns [] when DB returns null data", async () => {
    const db = makeDb({
      fromResults: { tracking_events: { data: null, error: null } },
    })
    const { createShipmentService } = await freshShipmentService()
    expect(await createShipmentService(db).getTrackingEvents("AWB")).toEqual([])
  })

  it("throws on DB error", async () => {
    const db = makeDb({
      fromResults: {
        tracking_events: { data: null, error: { code: "X", message: "fail" } },
      },
    })
    const { createShipmentService } = await freshShipmentService()
    await expect(
      createShipmentService(db).getTrackingEvents("AWB"),
    ).rejects.toMatchObject({ code: "X" })
  })
})

// ─── createShipment ──────────────────────────────────────────────────────────

describe("createShipment", () => {
  it("inserts and returns mapped Shipment + pins insert payload", async () => {
    // Capture the .insert() arg to pin the value contract — bare
    // toHaveBeenCalledWith("shipments") would pass even if the service
    // dropped fields silently.
    const NEW_ROW = { id: "ship-99", awb_number: "TAC26099", status: "CREATED" }
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({ data: NEW_ROW, error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createShipmentService } = await freshShipmentService()
    const created = await createShipmentService(db).createShipment({
      awb_number: "TAC26099",
      sender_name: "Acme",
      receiver_name: "Beta",
    } as never)
    expect(created.id).toBe("ship-99")
    expect(created.awbNumber).toBe("TAC26099")
    const insertArg = spy.firstCallArgs("insert")?.[0] as Record<string, unknown>
    expect(insertArg.awb_number).toBe("TAC26099")
    expect(insertArg.sender_name).toBe("Acme")
    expect(insertArg.receiver_name).toBe("Beta")
  })

  it("rethrows on insert error", async () => {
    const db = makeDb({
      fromResults: {
        shipments: { data: null, error: { code: "23505", message: "duplicate AWB" } },
      },
    })
    const { createShipmentService } = await freshShipmentService()
    await expect(
      createShipmentService(db).createShipment({} as never),
    ).rejects.toMatchObject({ code: "23505" })
  })
})

// ─── generateAwbNumber — withRpc-wrapped RPC ─────────────────────────────────

describe("generateAwbNumber — withRpc wrapper", () => {
  it("returns the AWB string from RPC data", async () => {
    const db = makeDb({
      rpcResult: { data: "TAC26043010002", error: null },
    })
    const { createShipmentService } = await freshShipmentService()
    expect(await createShipmentService(db).generateAwbNumber()).toBe("TAC26043010002")
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("throws when RPC returns an empty string", async () => {
    const db = makeDb({ rpcResult: { data: "", error: null } })
    const { createShipmentService } = await freshShipmentService()
    await expect(
      createShipmentService(db).generateAwbNumber(),
    ).rejects.toThrow(/returned an empty value/)
  })

  it("throws when RPC data is non-string (null)", async () => {
    const db = makeDb({ rpcResult: { data: null, error: null } })
    const { createShipmentService } = await freshShipmentService()
    await expect(
      createShipmentService(db).generateAwbNumber(),
    ).rejects.toThrow(/returned an empty value/)
  })

  it("emits captureSupabaseRpcError + rethrows on RPC error", async () => {
    // withRpc emits Sentry tags BEFORE returning to the service; the
    // service then rethrows the raw error. Pin BOTH the Sentry call
    // (with the correct tag values) AND the rethrown error shape.
    const errObj = { code: "42501", message: "permission denied" }
    const db = makeDb({ rpcResult: { data: null, error: errObj } })
    const { createShipmentService } = await freshShipmentService()
    await expect(
      createShipmentService(db).generateAwbNumber(),
    ).rejects.toMatchObject({ code: "42501" })
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [, tags] = captureExceptionMock.mock.calls[0]!
    const tagMap = tags as Record<string, string>
    expect(tagMap[SUPABASE_RPC_TAG_KEYS.rpcName]).toBe("generate_awb_number")
    expect(tagMap[SUPABASE_RPC_TAG_KEYS.errorCode]).toBe("42501")
  })
})

// ─── bulkCreateShipments — RPC primary path ──────────────────────────────────

describe("bulkCreateShipments — RPC primary path", () => {
  it("returns aggregated outcome on RPC success", async () => {
    const db = makeDb({
      rpcResult: {
        data: { inserted: 50, failed: 2, errors: [{ row: 3, message: "validation failed" }] },
        error: null,
      },
    })
    const { createShipmentService } = await freshShipmentService()
    const out = await createShipmentService(db).bulkCreateShipments([
      { awb_number: "A1" } as never,
      { awb_number: "A2" } as never,
    ])
    expect(out.inserted).toBe(50)
    expect(out.failed).toBe(2)
    expect(out.errors).toEqual([{ row: 3, message: "validation failed" }])
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("normalizes missing fields in RPC response (defaults inserted/failed/errors)", async () => {
    // Pin the defaulting behavior at the JS-side aggregation step.
    // A regression that returned the raw RPC payload would surface
    // `undefined` values to the UI.
    const db = makeDb({
      rpcResult: { data: {}, error: null },
    })
    const { createShipmentService } = await freshShipmentService()
    const out = await createShipmentService(db).bulkCreateShipments([
      { awb_number: "A1" } as never,
    ])
    expect(out.inserted).toBe(0)
    expect(out.failed).toBe(0)
    expect(out.errors).toEqual([])
  })

  it("emits Sentry + rethrows on real RPC error (RLS denial — NOT swallowed by fallback)", async () => {
    // Per audit doc § 3.2 selective-adoption + isMissingRpcOrRelation
    // discriminator: RLS denials, FK errors, business-rule rejections
    // MUST re-throw — letting them bypass to the JS fallback would
    // silently void the very server-side validation the RPC enforces.
    const errObj = { code: "42501", message: "new row violates row-level security" }
    const db = makeDb({ rpcResult: { data: null, error: errObj } })
    const { createShipmentService } = await freshShipmentService()
    await expect(
      createShipmentService(db).bulkCreateShipments([{ awb_number: "X" } as never]),
    ).rejects.toMatchObject({ code: "42501" })
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [, tags] = captureExceptionMock.mock.calls[0]!
    const tagMap = tags as Record<string, string>
    expect(tagMap[SUPABASE_RPC_TAG_KEYS.rpcName]).toBe("bulk_create_shipments")
    expect(tagMap[SUPABASE_RPC_TAG_KEYS.errorCode]).toBe("42501")
  })
})

// ─── bulkCreateShipments — chunked-insert fallback ───────────────────────────

describe("bulkCreateShipments — chunked-insert fallback", () => {
  it("falls back to chunked insert when RPC is missing (PGRST205)", async () => {
    // RPC missing → fallback via isMissingRpcOrRelation discriminator.
    // Sentry NOT emitted on missing-RPC fallback (selective adoption per
    // audit doc § 3.2 — distinct from the real-error branch above).
    const inputs = [{ awb_number: "A1" }, { awb_number: "A2" }] as never
    const db = makeDb({})
    const rpc = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: "PGRST205", message: "not found" } }),
    )
    ;(db as unknown as { rpc: typeof rpc }).rpc = rpc
    const insertArgs: unknown[] = []
    vi.mocked(db.from).mockImplementation(() => {
      const { builder } = makeBuilderSpy({
        data: [{ id: "ship-1" }, { id: "ship-2" }],
        error: null,
      })
      const inner = builder as unknown as {
        insert: (arg: unknown) => unknown
      }
      const origInsert = inner.insert
      inner.insert = vi.fn((arg: unknown) => {
        insertArgs.push(arg)
        return origInsert(arg)
      }) as never
      return builder
    })
    const { createShipmentService } = await freshShipmentService()
    const out = await createShipmentService(db).bulkCreateShipments(inputs)
    expect(out.inserted).toBe(2)
    expect(out.failed).toBe(0)
    expect(insertArgs).toHaveLength(1)
    expect(insertArgs[0]).toEqual(inputs)
    // CRITICAL: missing-RPC path does NOT emit Sentry (selective adoption).
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("falls back when RPC reports 42883 (function does not exist)", async () => {
    const inputs = [{ awb_number: "A1" }] as never
    const db = makeDb({})
    const rpc = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: "42883", message: "function does not exist" } }),
    )
    ;(db as unknown as { rpc: typeof rpc }).rpc = rpc
    const { fromImpl } = makeBuilderSpyByTable({
      shipments: { data: [{ id: "ship-1" }], error: null },
    })
    vi.mocked(db.from).mockImplementation(fromImpl)
    const { createShipmentService } = await freshShipmentService()
    const out = await createShipmentService(db).bulkCreateShipments(inputs)
    expect(out.inserted).toBe(1)
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("chunks inserts at the 100-row boundary (250 rows → 3 chunks of 100/100/50)", async () => {
    // Pin the chunking discipline. A regression that bumped chunk size
    // to 1000 (or removed chunking entirely) would still produce the
    // right inserted count for small inputs but would fail on very large
    // ones. Pinning chunk SIZES catches the regression at small scale.
    const inputs = Array.from({ length: 250 }, (_, i) => ({
      awb_number: `A${i}`,
    })) as never
    const db = makeDb({})
    const rpc = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: "PGRST205", message: "missing" } }),
    )
    ;(db as unknown as { rpc: typeof rpc }).rpc = rpc
    const insertArgs: unknown[] = []
    vi.mocked(db.from).mockImplementation(() => {
      const { builder } = makeBuilderSpy({
        data: [{ id: "x" }],
        error: null,
      })
      const inner = builder as unknown as {
        insert: (arg: unknown) => unknown
      }
      const origInsert = inner.insert
      inner.insert = vi.fn((arg: unknown) => {
        insertArgs.push(arg)
        return origInsert(arg)
      }) as never
      return builder
    })
    const { createShipmentService } = await freshShipmentService()
    await createShipmentService(db).bulkCreateShipments(inputs)
    expect(insertArgs).toHaveLength(3)
    expect(insertArgs.map((c) => (c as unknown[]).length)).toEqual([100, 100, 50])
  })

  it("records per-row errors with correct 1-based row indices on insert failure", async () => {
    // The service indexes rows as `i + j + 1` where i is the chunk start
    // offset and j is the in-chunk index. Pin BOTH the count AND the
    // exact row indices — a regression that used 0-based indexing or
    // shifted by chunk offset would still produce 3 errors but with
    // wrong row numbers (which surface in the import-error UI).
    const inputs = [
      { awb_number: "A1" },
      { awb_number: "A2" },
      { awb_number: "A3" },
    ] as never
    const db = makeDb({})
    const rpc = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: "PGRST205", message: "missing" } }),
    )
    ;(db as unknown as { rpc: typeof rpc }).rpc = rpc
    const { fromImpl } = makeBuilderSpyByTable({
      shipments: { data: null, error: { code: "23505", message: "duplicate AWB" } },
    })
    vi.mocked(db.from).mockImplementation(fromImpl)
    const { createShipmentService } = await freshShipmentService()
    const out = await createShipmentService(db).bulkCreateShipments(inputs)
    expect(out.inserted).toBe(0)
    expect(out.failed).toBe(3)
    expect(out.errors).toHaveLength(3)
    expect(out.errors[0]).toEqual({ row: 1, message: "duplicate AWB" })
    expect(out.errors[1]).toEqual({ row: 2, message: "duplicate AWB" })
    expect(out.errors[2]).toEqual({ row: 3, message: "duplicate AWB" })
  })
})

// ─── updateStatus ────────────────────────────────────────────────────────────

describe("updateStatus", () => {
  it("updates status + updated_at + guards on .eq('id', id)", async () => {
    // Capture both the update payload AND the .eq guard. Without value-
    // capture, a regression that dropped the .eq("id", id) guard would
    // ship — the update would then run unscoped on every row in the
    // shipments table. Catastrophic data shape.
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({ data: null, error: null })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createShipmentService } = await freshShipmentService()
    await expect(
      createShipmentService(db).updateStatus("ship-1", ShipmentStatus.IN_TRANSIT),
    ).resolves.toBeUndefined()

    const updatePayload = spy.firstCallArgs("update")?.[0] as Record<string, unknown> | undefined
    expect(updatePayload?.status).toBe("IN_TRANSIT")
    expect(typeof updatePayload?.updated_at).toBe("string")

    const eqCalls = spy.calls.eq.map(([col, val]) => ({ col, val }))
    expect(eqCalls).toContainEqual({ col: "id", val: "ship-1" })
  })

  it("rethrows on DB error", async () => {
    const db = makeDb({
      fromResults: {
        shipments: { data: null, error: { code: "P0001", message: "trigger blocked" } },
      },
    })
    const { createShipmentService } = await freshShipmentService()
    await expect(
      createShipmentService(db).updateStatus("ship-1", ShipmentStatus.DELIVERED),
    ).rejects.toMatchObject({ code: "P0001" })
  })
})

// ─── countByStatus ───────────────────────────────────────────────────────────

describe("countByStatus", () => {
  it("aggregates row.status counts into Record<ShipmentStatus, number>", async () => {
    const db = makeDb({
      fromResults: {
        shipments: {
          data: [
            { status: "CREATED" },
            { status: "CREATED" },
            { status: "IN_TRANSIT" },
            { status: "DELIVERED" },
          ],
          error: null,
        },
      },
    })
    const { createShipmentService } = await freshShipmentService()
    const counts = await createShipmentService(db).countByStatus()
    expect(counts.CREATED).toBe(2)
    expect(counts.IN_TRANSIT).toBe(1)
    expect(counts.DELIVERED).toBe(1)
  })

  it("returns {} when data is null", async () => {
    const db = makeDb({
      fromResults: { shipments: { data: null, error: null } },
    })
    const { createShipmentService } = await freshShipmentService()
    const counts = await createShipmentService(db).countByStatus()
    expect(counts).toEqual({})
  })

  it("throws on DB error", async () => {
    const db = makeDb({
      fromResults: {
        shipments: { data: null, error: { code: "X", message: "fail" } },
      },
    })
    const { createShipmentService } = await freshShipmentService()
    await expect(
      createShipmentService(db).countByStatus(),
    ).rejects.toMatchObject({ code: "X" })
  })
})

// ─── ShipmentStatus enum exhaustiveness sentinel ─────────────────────────────

describe("ShipmentStatus enum exhaustiveness sentinel", () => {
  // Dual sentinel pattern: runtime `Object.values` + compile-time
  // `satisfies readonly ShipmentStatus[]` + `Exclude<>` extends-never.
  // Same shape as InvoiceStatus in PR #123 and PaymentMethod in PR #118.
  // Catalog entry #8 (enum exhaustiveness via satisfies + Exclude).

  it("has exactly the expected set of statuses", () => {
    expect(new Set(Object.values(ShipmentStatus))).toEqual(
      new Set([
        ShipmentStatus.CREATED,
        ShipmentStatus.PICKUP_SCHEDULED,
        ShipmentStatus.PICKED_UP,
        ShipmentStatus.RECEIVED_AT_ORIGIN,
        ShipmentStatus.IN_TRANSIT,
        ShipmentStatus.RECEIVED_AT_DEST,
        ShipmentStatus.OUT_FOR_DELIVERY,
        ShipmentStatus.DELIVERED,
        ShipmentStatus.CANCELLED,
        ShipmentStatus.RTO,
        ShipmentStatus.EXCEPTION,
      ]),
    )
  })

  // Compile-time exhaustiveness sentinel — adding a new status WITHOUT
  // a corresponding entry below fails `pnpm typecheck`. The variable is
  // unused at runtime; the type check IS the assertion.
  const ALL_STATUSES = [
    ShipmentStatus.CREATED,
    ShipmentStatus.PICKUP_SCHEDULED,
    ShipmentStatus.PICKED_UP,
    ShipmentStatus.RECEIVED_AT_ORIGIN,
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.RECEIVED_AT_DEST,
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.CANCELLED,
    ShipmentStatus.RTO,
    ShipmentStatus.EXCEPTION,
  ] as const satisfies readonly ShipmentStatus[]
  type _MissingStatuses = Exclude<ShipmentStatus, (typeof ALL_STATUSES)[number]>
  const _allCovered: _MissingStatuses extends never ? true : never = true
  void _allCovered

  it.each(ALL_STATUSES)("status %s is a valid enum member", (status) => {
    expect(Object.values(ShipmentStatus)).toContain(status)
  })
})

// ─── Sentry tag emission (negative assertion) ────────────────────────────────

describe("Sentry tag emission (negative assertion)", () => {
  it("non-RPC methods do NOT emit Sentry events during normal CRUD", async () => {
    // Positive emissions are pinned in the generateAwbNumber +
    // bulkCreateShipments-real-error describes above. THIS test pins the
    // negative: every other public method must NOT trigger
    // captureException. If a future refactor adds captureSupabaseRpcError
    // (e.g. wrapping a future RPC inside getShipments), this assertion
    // fails — forcing the developer to update both EMITTED_TAG_KEYS in
    // scripts/sentry/canonical-rules.mjs AND the cross-package contract
    // sentinel test.
    const db = makeDb({
      fromResults: {
        shipments: { data: [], error: null },
        tracking_events: { data: [], error: null },
      },
    })
    const { createShipmentService } = await freshShipmentService()
    const service = createShipmentService(db)
    await service.getShipments()
    await service.getShipmentById("ship-1")
    await service.getShipmentByAwb("AWB")
    await service.getTrackingEvents("AWB")
    await service.createShipment({} as never)
    await service.updateStatus("ship-1", ShipmentStatus.DELIVERED)
    await service.countByStatus()
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })
})
