"use client"

import { createBrowserClient } from "@workspace/database/client"
import type {
  AuthChangeEvent,
  Session,
} from "@workspace/database/supabase.types"
import { createAuthService, type AuthService } from "./auth.service"
import {
  claimSignOutReason,
  clearSignOutReason,
  consumeSignOutReason,
} from "./sign-out-reason"

let _instance: AuthService | null = null

/**
 * Lazily-instantiated browser auth service singleton.
 * Use this from "use client" components instead of importing
 * @workspace/database directly (LAW 6/7/8).
 */
function getBrowserAuth(): AuthService {
  if (!_instance) {
    _instance = createAuthService(createBrowserClient())
  }
  return _instance
}

/** Sign the current user out via the browser-side Supabase client. */
async function signOutBrowser(): Promise<void> {
  return getBrowserAuth().signOut()
}

/**
 * Subscribe to browser-side auth-state changes. Returns an unsubscribe
 * function. Use from `useEffect` cleanup. This is the LAW-6/7-compliant way
 * for UI components to react to sign-out / token-refresh events without
 * importing Supabase directly.
 */
function subscribeAuthChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  return getBrowserAuth().onAuthChange(callback)
}

/**
 * Shared core: claim a reason marker, sign out, clear the marker on
 * rejection (since SIGNED_OUT never fires in that case and the consumer
 * wouldn't otherwise clean up).
 */
async function performClaimedSignOut(
  reason: "idle" | "user",
): Promise<boolean> {
  claimSignOutReason(reason)
  try {
    await signOutBrowser()
    return true
  } catch {
    clearSignOutReason()
    return false
  }
}

/**
 * Idle-driven sign-out (IdleGuard timeout flow). Returns true if the
 * underlying signOutBrowser() resolved.
 */
async function performIdleSignOut(): Promise<boolean> {
  return performClaimedSignOut("idle")
}

/**
 * User-initiated sign-out (e.g., UserMenu "Sign out" button). Claims the
 * "user" reason so SessionGuard yields and the caller owns the redirect.
 * Returns true if the underlying signOutBrowser() resolved.
 */
async function performUserSignOut(): Promise<boolean> {
  return performClaimedSignOut("user")
}

/**
 * Decide where SessionGuard should send the user when SIGNED_OUT fires.
 * Returns null if any reason was claimed (the caller — IdleGuard, UserMenu,
 * etc. — owns the redirect). Returns a /sign-in path with the current
 * location encoded as `next` only when no reason was claimed, i.e. the
 * sign-out originated server-side (stale refresh token, admin revocation).
 *
 * Pure of router/window globals — caller passes the current pathname
 * and search so this can be unit-tested without a DOM.
 */
function resolveSignOutRedirect(
  pathname: string,
  search: string,
): string | null {
  if (consumeSignOutReason() !== null) return null
  const next = encodeURIComponent(pathname + search)
  return `/sign-in?next=${next}&reason=session_expired`
}

export {
  claimSignOutReason,
  clearSignOutReason,
  consumeSignOutReason,
  getBrowserAuth,
  performIdleSignOut,
  performUserSignOut,
  resolveSignOutRedirect,
  signOutBrowser,
  subscribeAuthChange,
}
