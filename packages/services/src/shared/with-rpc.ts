// Structured Sentry emission on Supabase RPC failure.
//
// Wraps a Supabase `.rpc(name, args)` call at the service-method
// boundary. If the call returns `{ error }`, the helper emits a tagged
// exception to the registered Sentry backend and rethrows nothing —
// the caller sees the same `{ data, error }` shape the bare Supabase
// call would have returned, so adoption is mechanical (no API change).
//
// Tag shape (this is the contract the canonical alert rule keys off —
// changes here MUST be reflected in scripts/sentry/canonical-rules.mjs
// and the cross-package sentinel test):
//
//   supabase.rpc         = "true"        (constant — alert filter)
//   supabase.rpc_name    = <name>        (the rpc method, e.g. "record_invoice_payment")
//   supabase.error_code  = <code>        (Postgres / PostgREST code, or "unknown")
//
// PII posture: rpc_name and error_code are deterministic. We capture
// `err.message`, `err.code`, `err.hint` explicitly via the error's
// fields — we do NOT pass the full `err` object to Sentry, which could
// contain a Supabase response payload with row data.

import { emitTaggedException, type TagMap } from "./sentry-tagger"

/**
 * Stable tag-key contract — exported so the cross-package sentinel test
 * can verify scripts/sentry/canonical-rules.mjs filters reference only
 * keys actually emitted here.
 */
export const SUPABASE_RPC_TAG_KEYS = {
  rpc: "supabase.rpc",
  rpcName: "supabase.rpc_name",
  errorCode: "supabase.error_code",
} as const

/**
 * Sentinel for an RPC error with no `code` field. Distinct from missing
 * (undefined) so the alert rule can still filter on a stable string.
 */
export const RPC_UNKNOWN_ERROR_CODE = "unknown"

/**
 * Discriminator for "the RPC call failed". Distinct from a generic
 * `Error` so consumers can branch via `.code === "SUPABASE_RPC_FAILED"`
 * across package boundaries.
 */
export class SupabaseRpcError extends Error {
  readonly code = "SUPABASE_RPC_FAILED" as const
  readonly rpcName: string
  readonly pgCode: string
  readonly pgHint: string | undefined

  constructor(input: { rpcName: string; pgCode: string; pgHint?: string; pgMessage: string }) {
    super(`RPC ${input.rpcName} failed (${input.pgCode}): ${input.pgMessage}`)
    this.name = "SupabaseRpcError"
    this.rpcName = input.rpcName
    this.pgCode = input.pgCode
    this.pgHint = input.pgHint
  }
}

interface PostgrestErrorLike {
  code?: string | null
  message?: string | null
  hint?: string | null
  details?: string | null
}

interface RpcResult<T> {
  data: T | null
  error: PostgrestErrorLike | null
}

/**
 * Capture a Supabase RPC error to Sentry. Pure emission — does NOT
 * throw, does NOT modify the input. Returns nothing.
 *
 * Exported separately from `withRpc` so call sites that already have
 * custom result handling (e.g. payment.service's PaymentResponseLostError
 * branch) can emit without taking the wrapper.
 */
export function captureSupabaseRpcError(
  rpcName: string,
  err: PostgrestErrorLike,
): void {
  const pgCode = (err.code ?? "").trim() || RPC_UNKNOWN_ERROR_CODE
  // We capture message/hint as fields on the synthesized Error, not as
  // Sentry tags — tag values are deterministic; message/hint are not.
  const rpcError = new SupabaseRpcError({
    rpcName,
    pgCode,
    pgHint: err.hint ?? undefined,
    pgMessage: err.message ?? "(no message)",
  })
  const tags: TagMap = {
    [SUPABASE_RPC_TAG_KEYS.rpc]: "true",
    [SUPABASE_RPC_TAG_KEYS.rpcName]: rpcName,
    [SUPABASE_RPC_TAG_KEYS.errorCode]: pgCode,
  }
  emitTaggedException(rpcError, tags)
}

/**
 * Wrap a Supabase RPC call. Same return shape as the raw call — the
 * caller still gets `{ data, error }` and decides what to do. The
 * wrapper's only side effect is emitting to Sentry when `error` is
 * non-null.
 *
 * Usage:
 *
 *   const { data, error } = await withRpc("record_invoice_payment",
 *     () => db.rpc("record_invoice_payment", args)
 *   )
 *
 * NOT used:
 *   const { data, error } = await db.rpc("record_invoice_payment", args)
 *
 * Adoption is per-call-site by design. Migrating all 7 service files
 * is tracked as a follow-up (see PR description).
 */
export async function withRpc<T>(
  rpcName: string,
  // `PromiseLike` rather than `Promise` because Supabase's `.rpc()` returns
  // a `PostgrestFilterBuilder` — a thenable that satisfies await but is not
  // a strict Promise. Widening here avoids forcing every adopting service to
  // wrap the call in `(async () => ...)()`.
  exec: () => PromiseLike<RpcResult<T>>,
): Promise<RpcResult<T>> {
  const result = await exec()
  if (result.error) {
    captureSupabaseRpcError(rpcName, result.error)
  }
  return result
}
