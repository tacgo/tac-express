"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  resolveSignOutRedirect,
  subscribeAuthChange,
} from "@workspace/auth/client"

/**
 * Mounts the auth-state subscription that turns Supabase's SIGNED_OUT into
 * an explicit redirect to /sign-in. All policy lives in
 * `resolveSignOutRedirect` (the IdleGuard handshake, the URL shape) — this
 * component is pure wiring: subscribe, ask the service for a route,
 * navigate if one is returned.
 *
 * Renders nothing.
 */
export function SessionGuard() {
  const router = useRouter()

  React.useEffect(() => {
    return subscribeAuthChange((event) => {
      if (event !== "SIGNED_OUT") return
      const redirect = resolveSignOutRedirect(
        window.location.pathname,
        window.location.search,
      )
      if (redirect !== null) router.replace(redirect)
    })
  }, [router])

  return null
}
