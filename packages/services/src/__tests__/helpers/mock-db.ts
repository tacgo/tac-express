// Shared Supabase mock builder for service unit tests.
// Returns a typed partial that satisfies SupabaseClient for service calls.

import { vi } from "vitest"
import type { SupabaseClient } from "@workspace/database/supabase.types"

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> }

// Creates a chainable query builder stub that resolves to `result`
function makeQueryBuilder(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const self: Record<string, unknown> = {}
  const methods = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike",
    "in", "is", "not", "or", "and", "filter",
    "order", "limit", "range", "single", "maybeSingle", "head",
  ]
  methods.forEach((m) => {
    self[m] = vi.fn(() => self)
  })
  // terminal resolvers
  ;(self as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(result).then(resolve)
  Object.defineProperty(self, Symbol.toStringTag, { value: "MockQueryBuilder" })
  return self as unknown
}

export function mockDb(overrides: DeepPartial<SupabaseClient> = {}): SupabaseClient {
  const from = vi.fn((_table: string) =>
    makeQueryBuilder({ data: [], error: null, count: 0 }),
  )
  const rpc = vi.fn(() =>
    Promise.resolve({ data: [], error: null }),
  )
  const storage = {
    from: vi.fn((_bucket: string) => ({
      upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://example.com/signed" }, error: null }),
      remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  }
  const auth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    ...((overrides as Record<string, unknown>).auth ?? {}),
  }

  return {
    from,
    rpc,
    storage,
    auth,
    ...(overrides as Record<string, unknown>),
  } as unknown as SupabaseClient
}

// Convenience: make `from` return a specific result for all calls
export function mockDbWith(data: unknown[], error: unknown = null, count?: number) {
  const db = mockDb()
  const qb = makeQueryBuilder({ data, error, count: count ?? data.length })
  vi.mocked(db.from).mockReturnValue(qb as unknown as ReturnType<SupabaseClient["from"]>)
  return db
}
