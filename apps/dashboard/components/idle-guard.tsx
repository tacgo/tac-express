"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { performIdleSignOut } from "@workspace/auth/client"
import { getIdleMinutesForRole } from "@workspace/auth/rbac"
import { useRBAC } from "@workspace/ui/hooks/use-rbac"
import { IdleTimeoutBoundary } from "@workspace/ui/components/composed/idle-timeout-boundary"

interface IdleGuardProps {
  /**
   * Optional override. If omitted, the timeout is derived from the user's
   * role via `getIdleMinutesForRole`. While the role is loading we fall back
   * to the safe default (30 minutes).
   */
  idleMinutes?: number
}

/**
 * Client-only wrapper that mounts the IdleTimeoutBoundary in the dashboard
 * layout. The timeout adapts to the user's role (warehouse staff get a tighter
 * 15min window, admins get 60min). On forced logout it calls Supabase `signOut`,
 * scrubs draft keys from localStorage (`invoice_draft`, `shipment_*`, `print_*`,
 * `label_*`, `tac-*`), then navigates to /sign-in?next=…
 */
export function IdleGuard({ idleMinutes }: IdleGuardProps) {
  const router = useRouter()
  const { role } = useRBAC()
  const effectiveMinutes = idleMinutes ?? getIdleMinutesForRole(role)

  const handleLogout = React.useCallback(async () => {
    // performIdleSignOut handles the SessionGuard handshake (claim "idle",
    // clear marker on rejection) so this component stays pure UI.
    //
    // We intentionally ignore the boolean return value: idle timeout is a
    // security feature — even if the server-side signOut rejects (network
    // error, etc.), we still want to scrub local drafts and force the user
    // through /sign-in. Continuing on rejection mirrors the pre-existing
    // behavior of this component before the SessionGuard refactor.
    await performIdleSignOut()
    if (typeof window !== "undefined") {
      const prefixes = [
        "invoice_draft",
        "shipment_",
        "print_",
        "label_",
        "tac-",
      ]
      try {
        for (const key of Object.keys(window.localStorage)) {
          if (prefixes.some((p) => key.startsWith(p))) {
            window.localStorage.removeItem(key)
          }
        }
      } catch {
        /* quota — ignore */
      }
    }
    const next = encodeURIComponent(
      window.location.pathname + window.location.search
    )
    router.replace(`/sign-in?next=${next}&reason=idle`)
  }, [router])

  return (
    <IdleTimeoutBoundary
      idleMinutes={effectiveMinutes}
      onLogout={() => {
        void handleLogout()
      }}
    />
  )
}
