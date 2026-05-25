/**
 * Map a sign-in failure to a user-facing message.
 *
 * A network-level failure — the browser could not reach the auth server —
 * surfaces as a fetch `TypeError`: "Failed to fetch" (Chromium), "Load failed"
 * (Safari), "NetworkError when attempting to fetch resource" (Firefox), or
 * Supabase's `AuthRetryableFetchError` wrapper around the same. That is a
 * connectivity problem (server unreachable / stale `NEXT_PUBLIC_SUPABASE_URL`),
 * NOT bad credentials — so it must read differently and not masquerade as a
 * raw "Failed to fetch" string.
 *
 * Supabase auth errors (e.g. "Invalid login credentials") carry a meaningful,
 * user-actionable message and are passed through unchanged.
 */
const NETWORK_ERROR =
  /failed to fetch|load failed|networkerror|network request failed|fetch failed/i

export function describeSignInError(err: unknown): string {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : ""

  if (NETWORK_ERROR.test(message)) {
    return "Can't reach the authentication server. Check your connection and that the app's Supabase URL is set and reachable, then try again."
  }

  return message || "Sign-in failed. Check your credentials and try again."
}
