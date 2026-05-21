// Recording-spy variant of the chainable Supabase query-builder mock.
//
// Use when a test needs to pin the VALUE sent to a chained method
// (filter predicate, update payload, guard arg, default fallback) — not
// just that the call happened. Per `docs/patterns/coderabbit-catalog.md`
// entry #1 (value-contract over call-existence), bare `toHaveBeenCalledWith`
// is the bot-catch pattern; this helper captures every chained call so
// the test can read the actual arg values from the spy.
//
// Lineage (catalog entry #9 — abstract on second use, not first):
//   - PR #118 (payment.service.test.ts): pattern first inlined.
//   - PR #123 (invoice.service.test.ts): pattern repeated ~16 sites
//     inline; CodeRabbit's extraction nitpick was DECLINED with the
//     "second consumer hasn't appeared yet" rationale.
//   - This PR (shipment.service.test.ts): THIRD consumer triggers
//     extraction. Same shape as the makeDb extraction in PR #123 commit 1.
//
// POSTGREST-BUILDER-TYPE-GAP: @supabase/postgrest-js's
// `PostgrestQueryBuilder` uses generic constraints + conditional types
// that a flat record-of-functions mock cannot model in TypeScript without
// losing the fluent property. The `as unknown as never` cast is
// centralized at this helper's two public-function return sites so call
// sites get clean, assignable values. Documented per catalog entry #11
// (cast-comment-as-bug-ticket): the underlying gap is a real type-
// architecture limitation, not a fixable upstream bug. Re-evaluate if
// `@supabase/postgrest-js` publishes a builder type that structurally
// admits a recursive Record<string, fn>.

import { vi } from "vitest"

const CHAIN_METHODS = [
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
  // `range(from, to)` — Supabase's pagination terminal. Added when
  // audit.service.ts became the first consumer needing it; the helper
  // had no other reason to model it before. Same shape as the other
  // chain methods (returns the builder, resolves to the configured
  // result when awaited).
  "range",
  // `ilike(column, pattern)` — Postgres case-insensitive LIKE. Added when
  // manifest.service.ts became the first consumer needing it via
  // getManifests(filters.search). Same shape as `range`'s addition — an
  // additive extension to the canonical helper, not a forked builder.
  "ilike",
  "single",
  "maybeSingle",
] as const

export type ChainMethod = (typeof CHAIN_METHODS)[number]

export interface BuilderResult {
  data?: unknown
  error?: unknown
  count?: unknown
}

export interface BuilderSpy {
  /** Recorded calls per method, in call order. Each entry is the full
   *  args array at that call site. */
  calls: Record<ChainMethod, unknown[][]>
  /** First call's full args array for the given method, or `undefined`
   *  if the method was never called. */
  firstCallArgs(method: ChainMethod): unknown[] | undefined
  /** Each call's first arg for the given method, in call order. Sugar
   *  for the single-arg case (`.limit(50)`, `.update(payload)`). For
   *  multi-arg calls (`.eq("col", "val")`, `.in("col", [...])`) read
   *  `calls[method]` directly. */
  argsFor(method: ChainMethod): unknown[]
}

/**
 * Single chainable builder + spy. Assignable as the return value of a
 * `vi.mocked(db.from).mockReturnValue(builder)` chain.
 *
 * @example
 * const { builder, spy } = makeBuilderSpy({ data: [], error: null })
 * vi.mocked(db.from).mockReturnValue(builder)
 * await service.getInvoices()
 * expect(spy.argsFor("limit")).toEqual([50])
 */
export function makeBuilderSpy(result: BuilderResult = {}): {
  builder: never
  spy: BuilderSpy
} {
  const calls = Object.fromEntries(
    CHAIN_METHODS.map((m) => [m, [] as unknown[][]]),
  ) as Record<ChainMethod, unknown[][]>

  const builder: Record<string, unknown> = {}
  for (const m of CHAIN_METHODS) {
    builder[m] = vi.fn((...args: unknown[]) => {
      calls[m].push(args)
      return builder
    })
  }
  ;(builder as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(result).then(resolve)

  const spy: BuilderSpy = {
    calls,
    firstCallArgs: (method) => calls[method][0],
    argsFor: (method) => calls[method].map((args) => args[0]),
  }

  // POSTGREST-BUILDER-TYPE-GAP: see file header.
  return { builder: builder as unknown as never, spy }
}

/**
 * Per-table builder dispatcher. Returns:
 *   - `fromImpl`: a `mockImplementation`-shaped function that selects the
 *     right builder per `db.from(table)` call.
 *   - `spies`: per-table spy map for value assertions.
 *   - `tableCalls`: an array tracking the order of `db.from(table)` calls,
 *     useful for asserting multi-step paths via array equality (an
 *     alternative to `toHaveBeenNthCalledWith` per catalog entry #2).
 *
 * Tables NOT listed in `resultsByTable` get a default-empty builder
 * (`{ data: null, error: null }`) — useful for tests where one table is
 * intentionally unreachable and reaching it would be a regression.
 *
 * @example
 * const { fromImpl, spies, tableCalls } = makeBuilderSpyByTable({
 *   shipments: { data: SHIPMENT_ROW, error: null },
 *   invoices: { data: INSERTED_ROW, error: null },
 * })
 * vi.mocked(db.from).mockImplementation(fromImpl)
 * await service.createInvoice(...)
 * expect(tableCalls).toEqual(["shipments", "invoices"])
 * expect(spies.invoices?.firstCallArgs("insert")?.[0]).toMatchObject({ ... })
 */
export function makeBuilderSpyByTable(
  resultsByTable: Record<string, BuilderResult>,
): {
  fromImpl: (table: string) => never
  spies: Record<string, BuilderSpy>
  tableCalls: string[]
} {
  const spies: Record<string, BuilderSpy> = {}
  const builders: Record<string, never> = {}
  for (const [table, result] of Object.entries(resultsByTable)) {
    const { builder, spy } = makeBuilderSpy(result)
    builders[table] = builder
    spies[table] = spy
  }
  const tableCalls: string[] = []
  // POSTGREST-BUILDER-TYPE-GAP: see file header.
  const fromImpl = ((table: string): never => {
    tableCalls.push(table)
    if (builders[table] !== undefined) return builders[table]
    // Default empty builder for unconfigured tables. Tests that intend
    // a table to be unreachable can assert `tableCalls` doesn't contain
    // it; this branch keeps the chain alive without crashing.
    return makeBuilderSpy({ data: null, error: null }).builder
  }) as (table: string) => never

  return { fromImpl, spies, tableCalls }
}
