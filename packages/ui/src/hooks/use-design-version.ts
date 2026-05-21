"use client"

import * as React from "react"

import {
  DESIGN_FLAG_STORAGE_KEY,
  type DesignVersion,
  getDefaultDesignVersion,
  getDesignVersion,
  setDesignVersion as setDesignVersionStorage,
} from "@workspace/ui/lib/design-flag"

/**
 * Subscribe to the active design version.
 *
 * Initial state is intentionally seeded with the deploy-default
 * (`NEXT_PUBLIC_DESIGN` or "v6") — the same value the server would
 * resolve. The initial client render therefore matches SSR exactly,
 * avoiding the hydration mismatch React would emit if `useState`'s lazy
 * initializer read `localStorage` directly (different from server).
 *
 * After mount, we read the per-user override from `localStorage` and
 * `setVersion()` to it if it differs. That state update triggers a
 * post-hydration re-render that swaps the design without a redeploy.
 *
 * Also re-renders when the value changes in another tab (native `storage`
 * event) or in the current tab (synthetic `storage` dispatch from
 * `setDesignVersion`).
 *
 * Wraps the rollback flag from `lib/design-flag` so composed components can
 * branch on it without touching `localStorage` directly — see
 * `docs/ROLLBACK-PLAYBOOK.md § NextAdmin Refactor`.
 */
export function useDesignVersion(): {
  version: DesignVersion
  setVersion: (next: DesignVersion) => void
} {
  // Seed with the SSR-resolvable default so server/client agree on the
  // first render. The post-mount effect below applies the per-user
  // override (localStorage) without breaking hydration.
  const [version, setVersion] = React.useState<DesignVersion>(() =>
    getDefaultDesignVersion()
  )

  React.useEffect(() => {
    if (typeof window === "undefined") return
    // Read the per-user override (includes `localStorage`) after mount.
    // If it differs from the deploy-default, this `setVersion()` schedules
    // a client re-render that switches the design — no hydration mismatch
    // because we waited until after the initial render to read storage.
    setVersion(getDesignVersion())

    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== DESIGN_FLAG_STORAGE_KEY) return
      setVersion(getDesignVersion())
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const updateVersion = React.useCallback((next: DesignVersion) => {
    setDesignVersionStorage(next)
    setVersion(next)
  }, [])

  return { version, setVersion: updateVersion }
}
