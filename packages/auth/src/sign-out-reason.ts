"use client"

/**
 * Sign-out reason coordination — sessionStorage-backed handshake between
 * any code that intentionally signs the user out and SessionGuard.
 *
 * SessionGuard observes Supabase's SIGNED_OUT event and auto-redirects to
 * /sign-in with `reason=session_expired`. That's correct for server-side
 * sign-outs (stale refresh token, admin-revoked session) but wrong when
 * the sign-out was deliberately initiated by app code (idle timeout, user
 * clicking "Sign out"). Such initiators claim a reason here BEFORE calling
 * signOutBrowser(); SessionGuard consumes the claim and yields, leaving
 * the post-sign-out redirect to the initiator.
 *
 * The contract:
 *  - Initiator calls `claimSignOutReason(<reason>)` before signOutBrowser()
 *  - SessionGuard calls `consumeSignOutReason()` in its SIGNED_OUT handler
 *    and yields if it returns a non-null reason
 *  - Initiator calls `clearSignOutReason()` if signOutBrowser() rejects
 *    (so SIGNED_OUT never fires and consume never runs)
 *
 * sessionStorage (not localStorage) so the marker can't leak across tabs
 * or browser sessions.
 */

const SIGNOUT_REASON_KEY = "auth:signout-reason"

/**
 * Reasons a sign-out can be claimed under:
 *  - "idle" — IdleGuard's automatic timeout flow
 *  - "user" — explicit user action (e.g. UserMenu "Sign out")
 *
 * SessionGuard's auto-redirect only fires when no reason was claimed,
 * i.e. the sign-out originated server-side.
 */
type SignOutReason = "idle" | "user"

const VALID_REASONS: ReadonlySet<SignOutReason> = new Set(["idle", "user"])

function claimSignOutReason(reason: SignOutReason): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(SIGNOUT_REASON_KEY, reason)
  } catch {
    /* sessionStorage unavailable — caller may race; harmless */
  }
}

/**
 * Read and clear the in-flight sign-out reason. Returns the claimed reason
 * (and removes the marker) if one was claimed; null otherwise.
 */
function consumeSignOutReason(): SignOutReason | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(SIGNOUT_REASON_KEY)
    if (raw !== null && VALID_REASONS.has(raw as SignOutReason)) {
      window.sessionStorage.removeItem(SIGNOUT_REASON_KEY)
      return raw as SignOutReason
    }
    return null
  } catch {
    return null
  }
}

function clearSignOutReason(): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(SIGNOUT_REASON_KEY)
  } catch {
    /* unavailable — already harmless */
  }
}

export {
  claimSignOutReason,
  clearSignOutReason,
  consumeSignOutReason,
  SIGNOUT_REASON_KEY,
  type SignOutReason,
}
