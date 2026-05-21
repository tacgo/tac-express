import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { registerSentry } from "../shared/sentry-tagger"
import { SUPABASE_RPC_TAG_KEYS } from "../shared/with-rpc"
import type { SupabaseClient } from "@workspace/database/supabase.types"

import { createBookingService } from "../booking.service"
import { createExceptionService } from "../exception.service"
import { createManifestService } from "../manifest.service"
import { createRateCardService } from "../rate-card.service"
import { createShipmentService } from "../shipment.service"

/**
 * Adoption verification for PR α: every RPC migration in
 * docs/audits/2026-05-15-rbac-denial-audit.md § 3.1 / § 3.2 has a
 * corresponding test here that proves:
 *
 *   1. Success path — wrapper passes through {data, error} without emitting
 *   2. Real-error path — wrapper / selective helper emits to Sentry with
 *      tags { supabase.rpc: "true", supabase.rpc_name: <name>, supabase.error_code: <code> }
 *   3. (SELECTIVE sites only) Migration-fallback path — RPC-missing error
 *      DOES NOT emit (would saturate rule 4 during issue #19/#9 windows)
 *
 * Mocks Sentry at the dependency-injection boundary (registerSentry) — same
 * pattern as packages/services/src/__tests__/with-rpc.test.ts (PR #113).
 * NO real network. NO @sentry/nextjs import in tests.
 */

const captureExceptionMock = vi.fn()

beforeEach(() => {
  captureExceptionMock.mockClear()
  registerSentry({ captureException: captureExceptionMock })
})

afterEach(() => {
  registerSentry(null)
})

/**
 * Build a SupabaseClient mock whose `.rpc(name, args)` resolves to the
 * given result. Returned object satisfies the PromiseLike signature
 * that withRpc/db.rpc share.
 */
function makeRpcDb(result: { data: unknown; error: unknown }): SupabaseClient {
  const rpc = vi.fn(() => Promise.resolve(result))
  const from = vi.fn(() => {
    const c: Record<string, unknown> = {}
    ;[
      "select", "insert", "update", "upsert", "delete", "eq", "neq", "in",
      "order", "limit", "single", "maybeSingle",
    ].forEach((m) => {
      c[m] = vi.fn(() => c)
    })
    ;(c as { then: unknown }).then = (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve)
    return c
  })
  return { rpc, from } as unknown as SupabaseClient
}

// ── DIRECT-WRAP migrations ─────────────────────────────────────────────────

describe("DIRECT-WRAP: exception.service.resolveException", () => {
  it("passes through on success without emitting", async () => {
    const db = makeRpcDb({ data: null, error: null })
    await createExceptionService(db).resolveException("ex-1", "fixed")
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("emits supabase.rpc_name=resolve_exception and throws on error", async () => {
    const errObj = { code: "23503", message: "FK violation" }
    const db = makeRpcDb({ data: null, error: errObj })
    await expect(createExceptionService(db).resolveException("ex-1", "fixed"))
      .rejects.toMatchObject({ code: "23503" })
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [, tags] = captureExceptionMock.mock.calls[0]!
    expect((tags as Record<string, string>)[SUPABASE_RPC_TAG_KEYS.rpcName]).toBe(
      "resolve_exception",
    )
    expect((tags as Record<string, string>)[SUPABASE_RPC_TAG_KEYS.errorCode]).toBe(
      "23503",
    )
  })
})

describe("DIRECT-WRAP: manifest.service.closeManifest", () => {
  it("passes through on success", async () => {
    const db = makeRpcDb({ data: null, error: null })
    await createManifestService(db).closeManifest("manifest-1")
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("emits supabase.rpc_name=close_manifest_atomic and throws on error", async () => {
    const errObj = { code: "P0001", message: "manifest is empty" }
    const db = makeRpcDb({ data: null, error: errObj })
    await expect(createManifestService(db).closeManifest("manifest-1"))
      .rejects.toMatchObject({ code: "P0001" })
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [, tags] = captureExceptionMock.mock.calls[0]!
    expect((tags as Record<string, string>)[SUPABASE_RPC_TAG_KEYS.rpcName]).toBe(
      "close_manifest_atomic",
    )
  })
})

describe("DIRECT-WRAP: rate-card.service.lookupRate", () => {
  it("passes through on success and returns mapped row", async () => {
    const db = makeRpcDb({
      data: [
        {
          id: "rc-1",
          rate_per_kg: 100,
          docket_charge: 50,
          fuel_surcharge_pct: 5,
          handling_fee: 25,
        },
      ],
      error: null,
    })
    const result = await createRateCardService(db).lookupRate(
      "IMP", "DEL", "EXPRESS", 5,
    )
    expect(result).toMatchObject({ id: "rc-1", ratePerKg: 100 })
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("emits supabase.rpc_name=get_rate_card and throws on error", async () => {
    const errObj = { code: "PGRST116", message: "rate not found" }
    const db = makeRpcDb({ data: null, error: errObj })
    await expect(
      createRateCardService(db).lookupRate("IMP", "DEL", "EXPRESS", 5),
    ).rejects.toMatchObject({ code: "PGRST116" })
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [, tags] = captureExceptionMock.mock.calls[0]!
    expect((tags as Record<string, string>)[SUPABASE_RPC_TAG_KEYS.rpcName]).toBe(
      "get_rate_card",
    )
  })

  it("returns null when no row found (no error, no emit)", async () => {
    const db = makeRpcDb({ data: [], error: null })
    const result = await createRateCardService(db).lookupRate(
      "IMP", "DEL", "EXPRESS", 5,
    )
    expect(result).toBeNull()
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })
})

describe("DIRECT-WRAP: shipment.service.generateAwbNumber", () => {
  it("passes through on success", async () => {
    const db = makeRpcDb({ data: "TAC26043010001", error: null })
    const awb = await createShipmentService(db).generateAwbNumber()
    expect(awb).toBe("TAC26043010001")
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("emits supabase.rpc_name=generate_awb_number and throws on error", async () => {
    const errObj = { code: "42883", message: "function does not exist" }
    const db = makeRpcDb({ data: null, error: errObj })
    await expect(createShipmentService(db).generateAwbNumber()).rejects.toMatchObject({
      code: "42883",
    })
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [, tags] = captureExceptionMock.mock.calls[0]!
    expect((tags as Record<string, string>)[SUPABASE_RPC_TAG_KEYS.rpcName]).toBe(
      "generate_awb_number",
    )
  })
})

// ── SELECTIVE migrations ────────────────────────────────────────────────────

describe("SELECTIVE: booking.service.convertBookingToShipment", () => {
  it("RPC succeeds — passes through, no emit", async () => {
    const db = makeRpcDb({
      data: { shipment_id: "s-1", awb_number: "TAC26001" },
      error: null,
    })
    const result = await createBookingService(db).convertBookingToShipment("b-1")
    expect(result).toEqual({ shipmentId: "s-1", awbNumber: "TAC26001" })
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("real RPC error — emits supabase.rpc_name=convert_booking_to_shipment + throws", async () => {
    const errObj = { code: "23505", message: "duplicate AWB" }
    const db = makeRpcDb({ data: null, error: errObj })
    await expect(
      createBookingService(db).convertBookingToShipment("b-1"),
    ).rejects.toMatchObject({ code: "23505" })
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [, tags] = captureExceptionMock.mock.calls[0]!
    expect((tags as Record<string, string>)[SUPABASE_RPC_TAG_KEYS.rpcName]).toBe(
      "convert_booking_to_shipment",
    )
    expect((tags as Record<string, string>)[SUPABASE_RPC_TAG_KEYS.errorCode]).toBe(
      "23505",
    )
  })

  it("RPC-missing fallback — does NOT emit (saturation guard)", async () => {
    // PGRST202 = function not found in schema cache — issue #19's
    // migration-window fallback case. Must NOT fire rule 4.
    const errObj = { code: "PGRST202", message: "Could not find function" }
    const db = makeRpcDb({ data: null, error: errObj })
    // The fallback path will fail (no getBookingById row), but the key
    // assertion is the no-emit invariant.
    await createBookingService(db)
      .convertBookingToShipment("b-1")
      .catch(() => undefined)
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })
})

describe("SELECTIVE: manifest.service.addShipmentToManifest", () => {
  it("RPC succeeds — passes through, no emit", async () => {
    const db = makeRpcDb({ data: null, error: null })
    await createManifestService(db).addShipmentToManifest("m-1", "TAC26001")
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("real RPC error — emits + throws (NOT a PGRST202/42883)", async () => {
    const errObj = { code: "23503", message: "AWB does not exist" }
    const db = makeRpcDb({ data: null, error: errObj })
    await expect(
      createManifestService(db).addShipmentToManifest("m-1", "BAD"),
    ).rejects.toMatchObject({ code: "23503" })
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [, tags] = captureExceptionMock.mock.calls[0]!
    expect((tags as Record<string, string>)[SUPABASE_RPC_TAG_KEYS.rpcName]).toBe(
      "add_shipment_to_manifest",
    )
  })

  it("PGRST202 — does NOT emit (RPC-missing fallback)", async () => {
    const db = makeRpcDb({ data: null, error: { code: "PGRST202", message: "" } })
    // Fallback runs an INSERT; mock db's .from() returns empty result.
    await createManifestService(db)
      .addShipmentToManifest("m-1", "TAC26001")
      .catch(() => undefined)
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("42883 — does NOT emit (raw Postgres function-missing)", async () => {
    const db = makeRpcDb({
      data: null,
      error: { code: "42883", message: "function does not exist" },
    })
    await createManifestService(db)
      .addShipmentToManifest("m-1", "TAC26001")
      .catch(() => undefined)
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })
})

describe("SELECTIVE: shipment.service.bulkCreateShipments", () => {
  it("RPC succeeds — returns aggregate, no emit", async () => {
    const db = makeRpcDb({
      data: { inserted: 3, failed: 0, errors: [] },
      error: null,
    })
    const result = await createShipmentService(db).bulkCreateShipments([
      // minimal payload — typing is enforced by the service signature
      // but at runtime the mock doesn't care about the contents.
    ])
    expect(result).toEqual({ inserted: 3, failed: 0, errors: [] })
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("real RPC error — emits supabase.rpc_name=bulk_create_shipments + throws", async () => {
    const errObj = { code: "23514", message: "weight check violation" }
    const db = makeRpcDb({ data: null, error: errObj })
    await expect(
      createShipmentService(db).bulkCreateShipments([]),
    ).rejects.toMatchObject({ code: "23514" })
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [, tags] = captureExceptionMock.mock.calls[0]!
    expect((tags as Record<string, string>)[SUPABASE_RPC_TAG_KEYS.rpcName]).toBe(
      "bulk_create_shipments",
    )
  })

  it("RPC-missing — does NOT emit (chunked fallback)", async () => {
    const db = makeRpcDb({ data: null, error: { code: "PGRST202", message: "" } })
    // Chunked fallback runs against mock .from() which returns empty data.
    await createShipmentService(db)
      .bulkCreateShipments([])
      .catch(() => undefined)
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })
})
