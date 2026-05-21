/**
 * Shared discriminator for "the RPC / table you tried to use isn't
 * deployed yet" — the only error shape that justifies falling through
 * to a client-side fallback path. Every other error (RLS denial,
 * constraint violation, business-rule rejection) MUST re-throw so the
 * caller gets the real failure rather than a silent bypass.
 *
 * History: PR #8 review caught a payment-recording bug where the
 * service fell through to the JS-layer fallback INSERT for ANY
 * `rpc.error` — including RLS denials and constraint violations,
 * meaning future server-side rules (when the migration ships) would
 * be silently bypassed by the fallback. Issue #19 traced the same
 * shape into `booking.service.ts` and `shipment.service.ts`. This
 * helper centralises the discriminator so every fallback uses the
 * same definition of "RPC missing."
 *
 * The error-code list comes from observed Supabase / PostgREST
 * responses:
 *   - `PGRST202` — RPC function not found in schema cache
 *   - `PGRST205` — schema mismatch / table not found
 *   - `PGRST204` — column resolution failure (sometimes table-shape)
 *   - `42P01`    — Postgres "relation does not exist"
 *   - `42883`    — Postgres "function does not exist"
 *
 * The fallback message regex catches the human-readable variants
 * Supabase returns when the cache lookup fails.
 */
export function isMissingRpcOrRelation(
  err: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!err) return false
  if (
    err.code === "PGRST202" ||
    err.code === "PGRST204" ||
    err.code === "PGRST205" ||
    err.code === "42P01" ||
    err.code === "42883"
  ) {
    return true
  }
  const msg = err.message ?? ""
  return /does not exist|schema cache|could not find the (?:table|relation|function)|relation .* does not exist|function .* does not exist/i.test(
    msg,
  )
}
