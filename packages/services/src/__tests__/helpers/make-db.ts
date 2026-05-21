// Canonical Supabase client mock builder for service unit tests.
//
// Originally inlined in packages/services/src/__tests__/payment.service.test.ts
// (PR #118). Extracted here when the same pattern was needed for
// invoice.service.test.ts (PR landing this extraction). The owner directive
// is explicit: reuse this shape VERBATIM across service tests. Do not fork
// a parallel mock builder.
//
// Distinct from the older `mockDb` in helpers/mock-db.ts:
//   - `mockDb` (older, used by hub/api-key/etc.) takes DeepPartial overrides
//     and returns a builder with the full alphabet of query methods + storage
//     + auth. Heavier surface; better when a test needs the full client API.
//   - `makeDb` (this file, the canonical service-test pattern) takes a
//     focused `{ rpcResult, fromResults }` config and returns ONLY the .rpc()
//     and .from() methods the service-under-test uses. Lighter; matches the
//     mocking-depth choice from PR #118 (mock at the Supabase client factory
//     boundary, let withRpc + sentry-tagger run as real code).
//
// Both helpers coexist. New service tests should use this `makeDb` unless
// there's a specific reason (e.g. storage/auth needed) to reach for the
// heavier `mockDb`.

import { vi } from "vitest"
import type { SupabaseClient } from "@workspace/database/supabase.types"

/**
 * Build a thin SupabaseClient mock with configurable .rpc() + .from()
 * results. The .from() chain returns a thenable that resolves to the
 * configured result; insert + select + single + update + eq all chain
 * fluently and resolve to the same result for simplicity (tests
 * provide a result that satisfies whichever terminal method the
 * service-under-test calls).
 *
 * @example
 * const db = makeDb({
 *   rpcResult: { data: { id: "x" }, error: null },
 *   fromResults: { invoices: { data: SAMPLE_ROW, error: null } },
 * })
 * const service = createInvoiceService(db)
 * await service.getInvoiceById("x")
 * expect(db.from).toHaveBeenCalledWith("invoices")
 */
export function makeDb(config: {
  rpcResult?: { data: unknown; error: unknown }
  fromResults?: Record<string, { data: unknown; error: unknown }>
  // Tracks .from() table names called — useful for asserting service
  // hit the right tables in the right order via inspection without
  // relying on the vi.mock call-history convention.
  tableCalls?: string[]
}): SupabaseClient {
  const rpc = vi.fn(() =>
    Promise.resolve(config.rpcResult ?? { data: null, error: null }),
  )
  const tableCalls = config.tableCalls ?? []
  const from = vi.fn((table: string) => {
    tableCalls.push(table)
    const result = config.fromResults?.[table] ?? { data: null, error: null }
    const builder: Record<string, unknown> = {}
    for (const m of [
      "select",
      "insert",
      "update",
      "upsert",
      "delete",
      "eq",
      "in",
      "or",
      "gte",
      "lte",
      "order",
      "limit",
      // `range(from, to)` — Supabase's pagination terminal. See the
      // matching note in make-builder-spy.ts for the rationale.
      "range",
      // `ilike(column, pattern)` — Postgres case-insensitive LIKE. Added
      // alongside the make-builder-spy entry when manifest.service.ts's
      // getManifests filter.search became the first consumer.
      "ilike",
      "single",
      "maybeSingle",
    ]) {
      builder[m] = vi.fn(() => builder)
    }
    ;(builder as { then: unknown }).then = (resolve: (v: unknown) => void) =>
      Promise.resolve(result).then(resolve)
    return builder
  })
  return { rpc, from } as unknown as SupabaseClient
}
