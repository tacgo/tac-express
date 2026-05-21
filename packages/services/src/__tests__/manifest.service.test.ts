import { beforeEach, describe, expect, it, vi } from "vitest"

import { HubCode, ManifestStatus } from "@workspace/types"

import { SUPABASE_RPC_TAG_KEYS } from "../shared/with-rpc"
import { makeDb } from "./helpers/make-db"
import {
  makeBuilderSpy,
  makeBuilderSpyByTable,
} from "./helpers/make-builder-spy"
// NOTE: createManifestService and registerSentry are NOT statically imported.
// Per CodeRabbit's PR #147 isolation finding, static imports of these modules
// (combined with vi.resetModules() + dynamic re-import in freshManifestService)
// create two parallel module instances and a split isolation contract. Every
// test must go through freshManifestService() so service code + Sentry-tagger
// registration share the same dynamically-loaded instance.

/**
 * Full test floor for manifest.service.ts — extends the audit-wired surface
 * coverage shipped in PR #135 (the `removeShipmentFromManifest` describe
 * block at the bottom of this file, preserved verbatim) to every other
 * public method.
 *
 * Discharges #102 backlog item O1 — `manifest.service.ts` full test floor.
 *
 * Mirrors PR #118 (payment) + PR #123 (invoice) + PR #132 (shipment) +
 * PR #138 (whatsapp) pattern verbatim:
 *   - `makeDb` from helpers/make-db.ts (shared builder; not forked)
 *   - `freshManifestService()` factory with vi.resetModules() per test
 *   - Mock at the Supabase client factory boundary; let withRpc +
 *     sentry-tagger run as real code
 *   - `makeBuilderSpy` / `makeBuilderSpyByTable` for value-contract
 *     assertions per catalog #1 (no bare toHaveBeenCalledWith)
 *
 * Scope (JS-side only, no real Postgres):
 *   - getManifests: 9 filter/branch combinations (default + order, status,
 *     originHub, destHub, search, pageSize, multi-filter, null-data, error)
 *   - getManifestById: UUID lookup / manifest-number fallback (regex
 *     branch), not-found, error
 *   - getManifestShipments: rows + shipment join / row with missing join
 *     (UNKNOWN fallback) / null data / error
 *   - createManifest: happy with notes / happy without notes / error;
 *     ManifestStatus.DRAFT pinned at insert; insert → select → single
 *     ordering
 *   - addShipmentToManifest: full RPC-or-fallback decision tree (RPC happy
 *     / RPC missing PGRST202 → fallback INSERT / RPC missing 42883 →
 *     fallback / RPC missing "function does not exist" message → fallback
 *     / RPC real-error → captureSupabaseRpcError emit + throw / fallback
 *     INSERT error). Same shape as shipment.service's bulkCreateShipments.
 *   - removeShipmentFromManifest (audit-wired) — PRESERVED VERBATIM from
 *     PR #135 (the original audit-adoption coverage).
 *   - closeManifest: RPC happy / RPC error via withRpc → throws + emit
 *   - departManifest / arriveManifest / reconcileManifest: update payload
 *     + .eq("id", ...) + status literal + timestamp (where applicable) /
 *     error. ManifestStatus enum literals pinned at write time.
 *   - ManifestStatus enum exhaustiveness via dual-sentinel (Object.values
 *     + satisfies + Exclude<>) — same shape as ShipmentStatus / InvoiceStatus
 *     / PaymentMethod in PR #132 / #123 / #118.
 *   - Sentry tag emission (negative): non-emitting methods do not trigger
 *     captureException — passive sanity check on the EMITTED_TAG_KEYS
 *     contract.
 *
 * NOT IN SCOPE (documented absences):
 *   - Mapper helpers (mapManifest / mapManifestSummary) are exercised via
 *     the public methods. The `as unknown as` casts at lines 218/241 are
 *     not catalog #11 cleanup targets in this PR (tests-only discipline).
 *   - Real-Postgres concurrent semantics for add_shipment_to_manifest's
 *     RPC-or-fallback path — needs integration tests; tracked separately.
 *   - Multi-tenant RLS isolation — same.
 *
 * Sentry registration: manifest.service.ts DOES emit captureSupabaseRpcError
 *   via withRpc on the closeManifest path AND directly on the
 *   addShipmentToManifest real-error branch. Both positive emissions are
 *   pinned in their describe blocks; non-emission on every other public
 *   method is pinned in the negative-assertion describe at the bottom.
 */

const captureExceptionMock = vi.fn()

beforeEach(() => {
  // mockClear resets recorded calls between tests so per-test assertions on
  // captureExceptionMock are deterministic. vi.resetModules() clears the
  // module cache so the NEXT freshManifestService() call dynamically re-imports
  // both sentry-tagger and manifest.service fresh — single isolation contract.
  // NO call to registerSentry here: the freshManifestService() factory below
  // owns registration on the freshly-loaded sentry-tagger instance. Calling
  // registerSentry on a STATICALLY-imported instance would create a parallel
  // module instance that the dynamically-loaded service code never sees
  // (CodeRabbit's PR #147 finding).
  captureExceptionMock.mockClear()
  vi.resetModules()
})

/**
 * Import manifest.service.ts FRESH each call. Mirrors freshPaymentService /
 * freshInvoiceService / freshShipmentService. manifest.service.ts has no
 * module-level mutable state today, but the pattern is retained for
 * consistency AND because — per CodeRabbit's PR #147 finding — this is the
 * ONLY way to guarantee that the service code's transitive import of
 * sentry-tagger resolves to the same instance the test registered the mock on.
 *
 * Returns the freshly-loaded module so callers can destructure
 * `createManifestService`.
 */
async function freshManifestService() {
  vi.resetModules()
  const { registerSentry: register } = await import("../shared/sentry-tagger")
  register({ captureException: captureExceptionMock })
  const mod = await import("../manifest.service")
  return mod
}

const SAMPLE_MANIFEST_ROW = {
  id: "33333333-3333-3333-3333-333333333333",
  manifest_number: "MAN2605170001",
  status: "DRAFT",
  transport_mode: "ROAD",
  origin_hub: "DEL",
  dest_hub: "IMP",
  total_shipments: 0,
  total_pieces: 0,
  total_weight: 0,
  departure_date: null,
  arrival_date: null,
  created_by: "user-1",
  closed_by: null,
  departed_by: null,
  arrived_by: null,
  notes: null,
  created_at: "2026-05-17T08:00:00Z",
  updated_at: "2026-05-17T08:00:00Z",
}

// ─── getManifests ────────────────────────────────────────────────────────────

describe("getManifests", () => {
  it("default call: select shape + order created_at desc + limit 50", async () => {
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).getManifests()
    expect(db.from).toHaveBeenCalledTimes(1)
    expect(db.from).toHaveBeenCalledWith("manifests")
    // Catalog #1: value-contract on select column list — the column projection
    // is the integration contract with the caller (UI lists rely on it).
    const selectArg = spy.firstCallArgs("select")?.[0] as string
    expect(selectArg).toContain("id")
    expect(selectArg).toContain("manifest_number")
    expect(selectArg).toContain("status")
    expect(selectArg).toContain("created_at")
    expect(spy.firstCallArgs("order")).toEqual([
      "created_at",
      { ascending: false },
    ])
    expect(spy.argsFor("limit")).toEqual([50])
    // No filter chains were called with default args.
    expect(spy.calls.in).toHaveLength(0)
    expect(spy.calls.eq).toHaveLength(0)
    expect(spy.calls.ilike).toHaveLength(0)
  })

  it("status filter: passed to .in(status, [...])", async () => {
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).getManifests({
      status: [ManifestStatus.DRAFT, ManifestStatus.DEPARTED],
    })
    expect(spy.calls.in).toEqual([
      ["status", [ManifestStatus.DRAFT, ManifestStatus.DEPARTED]],
    ])
  })

  it("originHub filter: passed to .eq(origin_hub, hub)", async () => {
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).getManifests({ originHub: HubCode.NEW_DELHI })
    expect(spy.calls.eq).toContainEqual(["origin_hub", HubCode.NEW_DELHI])
  })

  it("destHub filter: passed to .eq(dest_hub, hub)", async () => {
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).getManifests({ destHub: HubCode.IMPHAL })
    expect(spy.calls.eq).toContainEqual(["dest_hub", HubCode.IMPHAL])
  })

  it("search filter: passed to .ilike(manifest_number, %term%)", async () => {
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).getManifests({ search: "MAN26" })
    // Value-contract: the % wildcards are part of the contract — drop them
    // and the search becomes an exact match.
    expect(spy.calls.ilike).toEqual([["manifest_number", "%MAN26%"]])
  })

  it("custom pageSize: passed to .limit(n)", async () => {
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).getManifests({ pageSize: 17 })
    expect(spy.argsFor("limit")).toEqual([17])
  })

  it("multi-filter: all chains applied; combined predicate count correct", async () => {
    const { builder, spy } = makeBuilderSpy({ data: [], error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).getManifests({
      status: [ManifestStatus.DRAFT],
      originHub: HubCode.NEW_DELHI,
      destHub: HubCode.IMPHAL,
      search: "FOO",
      pageSize: 25,
    })
    expect(spy.calls.in).toHaveLength(1)
    expect(spy.calls.eq).toHaveLength(2) // originHub + destHub
    expect(spy.calls.ilike).toHaveLength(1)
    expect(spy.argsFor("limit")).toEqual([25])
  })

  it("returns an empty array when data is null (Supabase no-rows contract)", async () => {
    const { builder } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    const result = await factory(db).getManifests()
    expect(result).toEqual([])
  })

  it("rethrows on DB error", async () => {
    const { builder } = makeBuilderSpy({
      data: null,
      error: { code: "P0001", message: "rls denied" },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await expect(factory(db).getManifests()).rejects.toMatchObject({
      code: "P0001",
    })
  })

  it("maps row shape: snake_case columns → camelCase summary fields with sane defaults", async () => {
    const { builder } = makeBuilderSpy({
      data: [
        {
          id: "m-1",
          manifest_number: "MAN001",
          status: "DRAFT",
          transport_mode: "ROAD",
          origin_hub: "DEL",
          dest_hub: "IMP",
          total_shipments: null, // exercises the ?? 0 default
          total_pieces: undefined,
          total_weight: 0,
          departure_date: "2026-05-17",
          created_at: "2026-05-17T00:00:00Z",
        },
      ],
      error: null,
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    const rows = await factory(db).getManifests()
    expect(rows).toHaveLength(1)
    const row = rows[0] as unknown as Record<string, unknown>
    expect(row.manifestNumber).toBe("MAN001")
    expect(row.totalShipments).toBe(0) // null → 0 default
    expect(row.totalPieces).toBe(0) // undefined → 0 default
  })
})

// ─── getManifestById ─────────────────────────────────────────────────────────

describe("getManifestById", () => {
  const UUID = "44444444-4444-4444-4444-444444444444"
  const MANIFEST_NUMBER = "MAN2605170002"

  it("UUID input → looks up by 'id' column", async () => {
    const { builder, spy } = makeBuilderSpy({
      data: SAMPLE_MANIFEST_ROW,
      error: null,
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).getManifestById(UUID)
    expect(spy.calls.eq).toEqual([["id", UUID]])
    expect(spy.calls.maybeSingle).toHaveLength(1)
  })

  it("non-UUID input → looks up by 'manifest_number' column (operator-paste path)", async () => {
    const { builder, spy } = makeBuilderSpy({
      data: SAMPLE_MANIFEST_ROW,
      error: null,
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).getManifestById(MANIFEST_NUMBER)
    expect(spy.calls.eq).toEqual([["manifest_number", MANIFEST_NUMBER]])
  })

  it("returns null when not found (data null)", async () => {
    const { builder } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    const result = await factory(db).getManifestById(UUID)
    expect(result).toBeNull()
  })

  it("rethrows on DB error", async () => {
    const { builder } = makeBuilderSpy({
      data: null,
      error: { code: "P0001", message: "rls denied" },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await expect(factory(db).getManifestById(UUID)).rejects.toMatchObject({
      code: "P0001",
    })
  })

  it("UUID detection: uppercase hex digits still match the regex (case-insensitive)", async () => {
    const UPPER_UUID = "ABCDEF12-3456-7890-ABCD-EF1234567890"
    const { builder, spy } = makeBuilderSpy({
      data: SAMPLE_MANIFEST_ROW,
      error: null,
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).getManifestById(UPPER_UUID)
    // Must use 'id' column, not 'manifest_number' — otherwise a paste of an
    // uppercase UUID would silently miss.
    expect(spy.calls.eq).toEqual([["id", UPPER_UUID]])
  })
})

// ─── getManifestShipments ────────────────────────────────────────────────────

describe("getManifestShipments", () => {
  const MID = "manifest-uuid-1"

  it("returns rows mapped with nested shipment join", async () => {
    const { builder, spy } = makeBuilderSpy({
      data: [
        {
          shipment_id: "ship-1",
          awb_number: "AWB-1",
          added_at: "2026-05-17T01:00:00Z",
          added_by: "user-1",
          shipments: {
            status: "IN_TRANSIT",
            pieces: 3,
            chargeable_weight: 4.5,
          },
        },
      ],
      error: null,
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    const result = await factory(db).getManifestShipments(MID)
    expect(spy.calls.eq).toEqual([["manifest_id", MID]])
    expect(result).toEqual([
      {
        id: "ship-1",
        awb_number: "AWB-1",
        added_at: "2026-05-17T01:00:00Z",
        status: "IN_TRANSIT",
        pieces: 3,
        chargeable_weight: 4.5,
      },
    ])
  })

  it("row with missing shipment join → UNKNOWN status + zero defaults", async () => {
    const { builder } = makeBuilderSpy({
      data: [
        {
          shipment_id: "ship-2",
          awb_number: "AWB-2",
          added_at: "2026-05-17T02:00:00Z",
          shipments: null, // join target gone (FK on-delete-set-null or RLS hide)
        },
      ],
      error: null,
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    const result = await factory(db).getManifestShipments(MID)
    expect(result[0]).toMatchObject({
      id: "ship-2",
      status: "UNKNOWN",
      pieces: 0,
      chargeable_weight: 0,
    })
  })

  it("returns empty array when data is null", async () => {
    const { builder } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    const result = await factory(db).getManifestShipments(MID)
    expect(result).toEqual([])
  })

  it("rethrows on DB error", async () => {
    const { builder } = makeBuilderSpy({
      data: null,
      error: { code: "P0001", message: "rls denied" },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await expect(
      factory(db).getManifestShipments(MID),
    ).rejects.toMatchObject({ code: "P0001" })
  })
})

// ─── createManifest ──────────────────────────────────────────────────────────

describe("createManifest", () => {
  const INPUT = {
    transportMode: "ROAD",
    originHub: "DEL",
    destHub: "IMP",
    notes: "Test manifest",
  }

  it("happy path: insert payload carries snake_case + DRAFT default + select + single chain", async () => {
    const { builder, spy } = makeBuilderSpy({
      data: SAMPLE_MANIFEST_ROW,
      error: null,
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).createManifest(INPUT)
    expect(db.from).toHaveBeenCalledWith("manifests")
    // Catalog #1: value-contract on the insert payload.
    const insertPayload = spy.firstCallArgs("insert")?.[0] as Record<
      string,
      unknown
    >
    expect(insertPayload).toMatchObject({
      transport_mode: "ROAD",
      origin_hub: "DEL",
      dest_hub: "IMP",
      notes: "Test manifest",
      // Enum-literal pin: must equal ManifestStatus.DRAFT. Drift in the enum
      // value would silently insert the new literal — this pins the contract.
      status: ManifestStatus.DRAFT,
    })
    // Catalog #2: select → single called after insert (multi-step chain).
    expect(spy.calls.select).toHaveLength(1)
    expect(spy.calls.single).toHaveLength(1)
  })

  it("notes omitted → insert payload carries notes: undefined (no surprise default)", async () => {
    const { builder, spy } = makeBuilderSpy({
      data: SAMPLE_MANIFEST_ROW,
      error: null,
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).createManifest({
      transportMode: "AIR",
      originHub: "DEL",
      destHub: "IMP",
    })
    const insertPayload = spy.firstCallArgs("insert")?.[0] as Record<
      string,
      unknown
    >
    expect(insertPayload.notes).toBeUndefined()
    expect(insertPayload.transport_mode).toBe("AIR")
  })

  it("rethrows on DB error", async () => {
    const { builder } = makeBuilderSpy({
      data: null,
      error: { code: "23505", message: "duplicate manifest_number" },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await expect(factory(db).createManifest(INPUT)).rejects.toMatchObject({
      code: "23505",
    })
  })
})

// ─── addShipmentToManifest ───────────────────────────────────────────────────
//
// This is the BIG one — RPC-or-fallback decision tree mirroring
// shipment.service's bulkCreateShipments. Five branches to pin:
//   (a) RPC succeeds → no fallback, no INSERT, no Sentry emit.
//   (b) RPC missing (PGRST202) → fallback INSERT, no Sentry emit (selective
//       adoption per audit doc § 3.2).
//   (c) RPC missing (42883 — raw pg) → fallback INSERT, no Sentry emit.
//   (d) RPC missing (message-pattern "function does not exist" / "Could not
//       find") → fallback INSERT, no Sentry emit.
//   (e) RPC real-error (any other code) → captureSupabaseRpcError emit +
//       throw, NO fallback.
//   (f) Fallback INSERT itself errors → throws the INSERT error.

describe("addShipmentToManifest", () => {
  const MID = "manifest-uuid-2"
  const AWB = "AWB-555"

  it("(a) RPC succeeds → returns; no fallback INSERT; no Sentry emit", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      rpcResult: { data: { id: "join-1" }, error: null },
    })
    const { createManifestService: factory } = await freshManifestService()
    await expect(
      factory(db).addShipmentToManifest(MID, AWB),
    ).resolves.toBeUndefined()
    expect(db.rpc).toHaveBeenCalledWith("add_shipment_to_manifest", {
      p_manifest_id: MID,
      p_awb_number: AWB,
      p_staff_id: null,
    })
    expect(tableCalls).toEqual([]) // no .from() at all — RPC handled it
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("(b) RPC missing (PGRST202) → fallback INSERT happy; no Sentry emit (selective adoption)", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      rpcResult: {
        data: null,
        error: { code: "PGRST202", message: "function not found" },
      },
      fromResults: {
        manifest_shipments: { data: null, error: null },
      },
    })
    const { createManifestService: factory } = await freshManifestService()
    await expect(
      factory(db).addShipmentToManifest(MID, AWB),
    ).resolves.toBeUndefined()
    expect(tableCalls).toEqual(["manifest_shipments"])
    // Selective Sentry posture — fallback during migration window is NORMAL
    // business state; emitting would saturate rule 4.
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("(c) RPC missing (42883 raw-pg) → fallback INSERT happy; no Sentry emit", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      rpcResult: {
        data: null,
        error: { code: "42883", message: "function does not exist" },
      },
      fromResults: {
        manifest_shipments: { data: null, error: null },
      },
    })
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).addShipmentToManifest(MID, AWB)
    expect(tableCalls).toEqual(["manifest_shipments"])
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("(d) RPC missing (message-pattern: \"function ... does not exist\") → fallback INSERT happy; no Sentry emit", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      rpcResult: {
        data: null,
        // No code field — only the message string carries the signal. The
        // pattern in the source is /function .* does not exist|Could not find/i.
        error: { message: "function add_shipment_to_manifest does not exist" },
      },
      fromResults: {
        manifest_shipments: { data: null, error: null },
      },
    })
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).addShipmentToManifest(MID, AWB)
    expect(tableCalls).toEqual(["manifest_shipments"])
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("(d') RPC missing (message-pattern: \"Could not find\") → fallback INSERT happy; no Sentry emit", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      rpcResult: {
        data: null,
        error: { message: "Could not find the function" },
      },
      fromResults: {
        manifest_shipments: { data: null, error: null },
      },
    })
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).addShipmentToManifest(MID, AWB)
    expect(tableCalls).toEqual(["manifest_shipments"])
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("(e) RPC real-error (e.g. RLS denial) → captureSupabaseRpcError emit + throw; NO fallback", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      rpcResult: {
        data: null,
        error: { code: "P0001", message: "rls denied" },
      },
    })
    const { createManifestService: factory } = await freshManifestService()
    await expect(
      factory(db).addShipmentToManifest(MID, AWB),
    ).rejects.toMatchObject({ code: "P0001" })
    expect(tableCalls).toEqual([]) // NO fallback path taken
    // Catalog #1: value-contract on the Sentry tag set.
    // captureSupabaseRpcError wraps the underlying rpc.error into a
    // SupabaseRpcError BEFORE calling captureException; the thrown error
    // (asserted above via rejects) is still the raw rpc.error with code
    // P0001, but the EMITTED error is the wrapper with code
    // "SUPABASE_RPC_FAILED". The load-bearing contract is the tag set —
    // rpcName + errorCode — which is what the Sentry alert rule filters on.
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [emittedErr, emittedTags] = captureExceptionMock.mock.calls[0]!
    expect((emittedErr as { code?: string }).code).toBe("SUPABASE_RPC_FAILED")
    expect(emittedTags[SUPABASE_RPC_TAG_KEYS.rpcName]).toBe(
      "add_shipment_to_manifest",
    )
    expect(emittedTags[SUPABASE_RPC_TAG_KEYS.errorCode]).toBe("P0001")
    expect(emittedTags[SUPABASE_RPC_TAG_KEYS.rpc]).toBe("true")
  })

  it("(f) RPC missing + fallback INSERT also errors → throws the INSERT error", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      rpcResult: {
        data: null,
        error: { code: "PGRST202", message: "function not found" },
      },
      fromResults: {
        manifest_shipments: {
          data: null,
          error: { code: "23505", message: "duplicate (manifest_id, awb)" },
        },
      },
    })
    const { createManifestService: factory } = await freshManifestService()
    await expect(
      factory(db).addShipmentToManifest(MID, AWB),
    ).rejects.toMatchObject({ code: "23505" })
    expect(tableCalls).toEqual(["manifest_shipments"])
    // No Sentry emit — the fallback path is intentionally silent in V1.
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("(b') RPC missing + fallback INSERT payload: snake_case + only manifest_id/awb_number", async () => {
    const { fromImpl, spies } = makeBuilderSpyByTable({
      manifest_shipments: { data: null, error: null },
    })
    const db = makeDb({
      rpcResult: {
        data: null,
        error: { code: "PGRST202", message: "fn not found" },
      },
    })
    vi.mocked(db.from).mockImplementation(fromImpl)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).addShipmentToManifest(MID, AWB)
    const insertPayload = spies.manifest_shipments!.firstCallArgs("insert")?.[0] as
      | Record<string, unknown>
      | undefined
    expect(insertPayload).toEqual({
      manifest_id: MID,
      awb_number: AWB,
    })
  })
})

// ─── closeManifest ───────────────────────────────────────────────────────────

describe("closeManifest", () => {
  const MID = "manifest-uuid-close"

  it("RPC happy → resolves; no throw; no Sentry emit", async () => {
    const db = makeDb({
      rpcResult: { data: null, error: null },
    })
    const { createManifestService: factory } = await freshManifestService()
    await expect(factory(db).closeManifest(MID)).resolves.toBeUndefined()
    expect(db.rpc).toHaveBeenCalledWith("close_manifest_atomic", {
      p_manifest_id: MID,
    })
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("RPC error → withRpc emits Sentry tag + throws", async () => {
    const db = makeDb({
      rpcResult: {
        data: null,
        error: { code: "P0001", message: "manifest already closed" },
      },
    })
    const { createManifestService: factory } = await freshManifestService()
    await expect(factory(db).closeManifest(MID)).rejects.toMatchObject({
      code: "P0001",
    })
    // Catalog #1: value-contract on Sentry tag set. withRpc routes the RPC
    // failure through captureSupabaseRpcError, which emits the standard
    // SUPABASE_RPC_TAG_KEYS set (rpc + rpcName + errorCode).
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [, tags] = captureExceptionMock.mock.calls[0]!
    expect(tags[SUPABASE_RPC_TAG_KEYS.rpcName]).toBe("close_manifest_atomic")
    expect(tags[SUPABASE_RPC_TAG_KEYS.errorCode]).toBe("P0001")
  })
})

// ─── departManifest / arriveManifest / reconcileManifest ─────────────────────

describe("departManifest", () => {
  const MID = "manifest-uuid-depart"

  it("update payload: status=DEPARTED + departed_at ISO; .eq(id, mid)", async () => {
    const { builder, spy } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).departManifest(MID)
    const updatePayload = spy.firstCallArgs("update")?.[0] as Record<
      string,
      unknown
    >
    expect(updatePayload.status).toBe(ManifestStatus.DEPARTED)
    expect(typeof updatePayload.departed_at).toBe("string")
    // ISO timestamp shape sanity (catalog #7: generalize beyond current
    // shape — match the structural pattern, not the literal value).
    expect(updatePayload.departed_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    )
    expect(spy.calls.eq).toEqual([["id", MID]])
  })

  it("rethrows on DB error", async () => {
    const { builder } = makeBuilderSpy({
      data: null,
      error: { code: "P0001", message: "rls denied" },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await expect(factory(db).departManifest(MID)).rejects.toMatchObject({
      code: "P0001",
    })
  })
})

describe("arriveManifest", () => {
  const MID = "manifest-uuid-arrive"

  it("update payload: status=ARRIVED + arrived_at ISO; .eq(id, mid)", async () => {
    const { builder, spy } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).arriveManifest(MID)
    const updatePayload = spy.firstCallArgs("update")?.[0] as Record<
      string,
      unknown
    >
    expect(updatePayload.status).toBe(ManifestStatus.ARRIVED)
    expect(typeof updatePayload.arrived_at).toBe("string")
    expect(updatePayload.arrived_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    )
    expect(spy.calls.eq).toEqual([["id", MID]])
  })

  it("rethrows on DB error", async () => {
    const { builder } = makeBuilderSpy({
      data: null,
      error: { code: "P0001", message: "rls denied" },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await expect(factory(db).arriveManifest(MID)).rejects.toMatchObject({
      code: "P0001",
    })
  })
})

describe("reconcileManifest", () => {
  const MID = "manifest-uuid-reconcile"

  it("update payload: status=RECONCILED (no timestamp column); .eq(id, mid)", async () => {
    const { builder, spy } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).reconcileManifest(MID)
    const updatePayload = spy.firstCallArgs("update")?.[0] as Record<
      string,
      unknown
    >
    expect(updatePayload).toEqual({ status: ManifestStatus.RECONCILED })
    expect(spy.calls.eq).toEqual([["id", MID]])
  })

  it("rethrows on DB error", async () => {
    const { builder } = makeBuilderSpy({
      data: null,
      error: { code: "P0001", message: "rls denied" },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await expect(factory(db).reconcileManifest(MID)).rejects.toMatchObject({
      code: "P0001",
    })
  })
})

// ─── ManifestStatus enum exhaustiveness sentinel ─────────────────────────────
//
// Catalog #8: satisfies + Exclude. Dual-sentinel — runtime Object.values
// covers the enum's runtime shape; the compile-time Exclude check catches
// "added a literal to the enum but forgot to update the matrix" at compile
// time. Same shape as ShipmentStatus / InvoiceStatus / PaymentMethod.

describe("ManifestStatus enum exhaustiveness", () => {
  // Hardcoded matrix — adding a new ManifestStatus literal that is not
  // covered by the wrapper service or the test floor fails compilation HERE.
  // Lifecycle (per domain.types ALLOWED_TRANSITIONS):
  //   DRAFT → BUILDING / OPEN / CLOSED  (and DRAFT is the createManifest insert default)
  //   BUILDING / OPEN → ... → CLOSED → DEPARTED → ARRIVED → RECONCILED
  // The JS service writes DRAFT (createManifest), DEPARTED (departManifest),
  // ARRIVED (arriveManifest), RECONCILED (reconcileManifest). CLOSED is set
  // by the close_manifest_atomic RPC (server-side). BUILDING and OPEN are
  // intermediate states transitioned via other surfaces (UI / wizards /
  // server-side triggers) and are intentionally NOT written by this service
  // — but they must still appear in the exhaustiveness matrix so adding a
  // new literal to the enum forces a conscious decision about coverage.
  const COVERED_BY_SERVICE = [
    ManifestStatus.DRAFT, // set on createManifest insert
    ManifestStatus.BUILDING, // intermediate; not written by this service
    ManifestStatus.OPEN, // intermediate; not written by this service
    ManifestStatus.CLOSED, // set by close_manifest_atomic RPC (server-side)
    ManifestStatus.DEPARTED, // set on departManifest update
    ManifestStatus.ARRIVED, // set on arriveManifest update
    ManifestStatus.RECONCILED, // set on reconcileManifest update
  ] as const satisfies readonly ManifestStatus[]

  type _Missing = Exclude<ManifestStatus, (typeof COVERED_BY_SERVICE)[number]>
  // The line below fails to compile if any ManifestStatus literal is added
  // to the enum without being added to COVERED_BY_SERVICE. The void cast
  // silences no-unused-vars; the type-check IS the assertion.
  const _allCovered: _Missing extends never ? true : never = true
  void _allCovered

  it("COVERED_BY_SERVICE enumerates exactly the ManifestStatus enum (runtime sentinel)", () => {
    // Runtime sentinel: same set as Object.values(ManifestStatus). Sort
    // both sides for stable comparison (enum iteration order is not
    // contractually stable across TS versions).
    const enumValues = Object.values(ManifestStatus).sort()
    const covered = [...COVERED_BY_SERVICE].sort()
    expect(covered).toEqual(enumValues)
  })
})

// ─── Sentry tag-emission contract (negative pin) ─────────────────────────────
//
// Pin the non-emitting methods so a future refactor that adds an unintended
// captureException call to a read-only path is caught at test time. Active
// emission is asserted in the addShipmentToManifest + closeManifest describes
// above.

describe("Sentry tag-emission contract — read-only methods do not emit", () => {
  it("getManifests does not emit captureException on happy path", async () => {
    const { builder } = makeBuilderSpy({ data: [], error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).getManifests()
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("getManifestById does not emit captureException on happy path", async () => {
    const { builder } = makeBuilderSpy({
      data: SAMPLE_MANIFEST_ROW,
      error: null,
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).getManifestById("44444444-4444-4444-4444-444444444444")
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("getManifestShipments does not emit captureException on happy path", async () => {
    const { builder } = makeBuilderSpy({ data: [], error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).getManifestShipments("manifest-1")
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("createManifest does not emit captureException on happy path", async () => {
    const { builder } = makeBuilderSpy({
      data: SAMPLE_MANIFEST_ROW,
      error: null,
    })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).createManifest({
      transportMode: "ROAD",
      originHub: "DEL",
      destHub: "IMP",
    })
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("departManifest does not emit captureException on happy path", async () => {
    const { builder } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService: factory } = await freshManifestService()
    await factory(db).departManifest("manifest-1")
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })
})

// ─── removeShipmentFromManifest (audit-wired) — preserved from PR #135 ─────
//
// Original coverage from PR #135 (the audit-adoption test floor for the
// destructive op). Test BODIES preserved verbatim — same assertions, same
// fixtures, same setup data. The ONLY change is the service-construction
// preamble: `createManifestService(db)` is now routed through
// `freshManifestService()` so this block shares the file's single isolation
// contract (CodeRabbit's PR #147 finding). Without this refactor the 6 cases
// here used a statically-imported `createManifestService` whose transitive
// `sentry-tagger` import resolved to a DIFFERENT instance than the one the
// freshManifestService() factory registers the mock on.

describe("manifest.service / removeShipmentFromManifest (audit-wired)", () => {
  const MANIFEST_ID = "11111111-1111-1111-1111-111111111111"
  const AWB = "AWB-001"
  const JOIN_ID = "22222222-2222-2222-2222-222222222222"
  const SAMPLE_JOIN_ROW = {
    id: JOIN_ID,
    manifest_id: MANIFEST_ID,
    awb_number: AWB,
    added_at: "2026-05-16T10:00:00Z",
    added_by: "user-1",
  }

  it("reads the join row, writes one audit row, then deletes — table-call ordering", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      fromResults: {
        manifest_shipments: { data: SAMPLE_JOIN_ROW, error: null },
        audit_logs: { data: null, error: null },
      },
    })
    const { createManifestService } = await freshManifestService()
    const service = createManifestService(db)
    await expect(
      service.removeShipmentFromManifest(MANIFEST_ID, AWB),
    ).resolves.toBeUndefined()
    // Audit-first ordering is the load-bearing tamper-evidence
    // property; pinning the sequence in a sentinel protects it from
    // accidental refactor.
    expect(tableCalls).toEqual([
      "manifest_shipments", // SELECT for before_state
      "audit_logs",         // audit INSERT (audit-first)
      "manifest_shipments", // DELETE
    ])
  })

  it("audit payload carries the canonical action + entity + before_state shape", async () => {
    const db = makeDb({})
    const { builder, spy } = makeBuilderSpy({
      data: SAMPLE_JOIN_ROW,
      error: null,
    })
    vi.mocked(db.from).mockReturnValue(builder)
    const { createManifestService } = await freshManifestService()
    const service = createManifestService(db)
    await service.removeShipmentFromManifest(MANIFEST_ID, AWB)
    const insertPayload = spy.firstCallArgs("insert")?.[0] as
      | Record<string, unknown>
      | undefined
    // CHECK-constraint contract: action MUST be the literal the
    // migration accepts. Drift between this literal and migration
    // 20260516000002's enum would surface as a 23514 violation at
    // runtime; pinning it here catches the drift at test time.
    expect(insertPayload?.action).toBe("manifest_shipment_remove")
    expect(insertPayload?.entity_type).toBe("manifest")
    expect(insertPayload?.entity_id).toBe(JOIN_ID)
    expect(insertPayload?.before_state).toEqual(SAMPLE_JOIN_ROW)
    const metadata = insertPayload?.metadata as Record<string, unknown> | undefined
    expect(metadata?.manifest_id).toBe(MANIFEST_ID)
    expect(metadata?.awb_number).toBe(AWB)
  })

  it("no-double-audit: the audit_logs table is hit exactly once per call", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      fromResults: {
        manifest_shipments: { data: SAMPLE_JOIN_ROW, error: null },
        audit_logs: { data: null, error: null },
      },
    })
    const { createManifestService } = await freshManifestService()
    const service = createManifestService(db)
    await service.removeShipmentFromManifest(MANIFEST_ID, AWB)
    expect(tableCalls.filter((t) => t === "audit_logs")).toHaveLength(1)
  })

  it("short-circuits silently with no audit when the join row is already gone", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      fromResults: {
        manifest_shipments: { data: null, error: null }, // no row found
        audit_logs: { data: null, error: null },
      },
    })
    const { createManifestService } = await freshManifestService()
    const service = createManifestService(db)
    await expect(
      service.removeShipmentFromManifest(MANIFEST_ID, AWB),
    ).resolves.toBeUndefined()
    // Only one .from() — the SELECT that found nothing. NO audit row,
    // NO delete attempt. Preserves the prior idempotent semantics
    // (matters for double-click / stale-request cases).
    expect(tableCalls).toEqual(["manifest_shipments"])
  })

  it("audit-write failure: AuditWriteFailedError surfaces and the DELETE never runs", async () => {
    const tableCalls: string[] = []
    const db = makeDb({
      tableCalls,
      fromResults: {
        manifest_shipments: { data: SAMPLE_JOIN_ROW, error: null },
        audit_logs: {
          data: null,
          error: { code: "23514", message: "violates audit_logs CHECK" },
        },
      },
    })
    const { createManifestService } = await freshManifestService()
    const service = createManifestService(db)
    await expect(
      service.removeShipmentFromManifest(MANIFEST_ID, AWB),
    ).rejects.toMatchObject({ code: "AUDIT_WRITE_FAILED" })
    // SELECT happened, audit INSERT was attempted, DELETE was NOT.
    // The fail-loud contract is the whole point.
    expect(tableCalls).toEqual(["manifest_shipments", "audit_logs"])
  })

  it("rethrows on DB error from the SELECT pre-fetch", async () => {
    const db = makeDb({
      fromResults: {
        manifest_shipments: {
          data: null,
          error: { code: "P0001", message: "RLS denied" },
        },
      },
    })
    const { createManifestService } = await freshManifestService()
    const service = createManifestService(db)
    await expect(
      service.removeShipmentFromManifest(MANIFEST_ID, AWB),
    ).rejects.toMatchObject({ code: "P0001" })
  })
})
