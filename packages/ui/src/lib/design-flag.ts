/**
 * Design version vocabulary — selects between the current Violet Grid v6
 * layout (`v6`) and the NextAdmin-inspired refactor (`v7`).
 *
 * Lives in `lib/` rather than a hook because the value is needed in both
 * server (RSC, route handlers) and browser contexts, and primitives must
 * not depend on React-only hooks for a config read.
 *
 * Resolution order (highest precedence first):
 *  1. `window.localStorage['tac-design']` — per-user override
 *  2. `process.env.NEXT_PUBLIC_DESIGN` — per-deploy default
 *  3. `'v6'` — current production
 *
 * Used by the rollback playbook (`docs/ROLLBACK-PLAYBOOK.md § NextAdmin
 * Refactor`) — flipping the localStorage key reverts a single user's
 * session to v6 without a redeploy.
 */

export type DesignVersion = "v6" | "v7"

const STORAGE_KEY = "tac-design"
const DEFAULT_VERSION: DesignVersion = "v6"

function normalize(value: string | null | undefined): DesignVersion | null {
  if (value === "v6" || value === "v7") return value
  return null
}

/**
 * Resolve the deploy-default design version — the value both server and
 * client agree on before any per-user override is applied. Reads only
 * `process.env.NEXT_PUBLIC_DESIGN` (with a hardcoded fallback) and never
 * touches `localStorage`. Use this as the initial state in any hook that
 * is rendered during SSR — reading `localStorage` directly inside a
 * `useState` initializer would trigger a hydration mismatch when the
 * per-user override differs from the deploy-default.
 */
export function getDefaultDesignVersion(): DesignVersion {
  const fromEnv = normalize(process.env.NEXT_PUBLIC_DESIGN)
  return fromEnv ?? DEFAULT_VERSION
}

/**
 * Resolve the active design version. Safe to call from server and browser.
 * On the server, only `process.env.NEXT_PUBLIC_DESIGN` is consulted.
 *
 * `localStorage` access is guarded — Safari private mode, browser
 * extensions, or strict cookie policies can throw on read; we fall back
 * to the env default in that case.
 */
export function getDesignVersion(): DesignVersion {
  if (typeof window !== "undefined") {
    try {
      const local = normalize(window.localStorage.getItem(STORAGE_KEY))
      if (local) return local
    } catch {
      // localStorage access denied — fall through to env / default
    }
  }
  return getDefaultDesignVersion()
}

/**
 * Browser-only setter. On the server it's a no-op that returns the
 * currently-resolved version (env-derived) so callers can update React
 * state in one step without desyncing.
 */
export function setDesignVersion(version: DesignVersion): DesignVersion {
  if (typeof window === "undefined") return getDesignVersion()
  try {
    window.localStorage.setItem(STORAGE_KEY, version)
  } catch {
    // localStorage write blocked — return the requested version so
    // callers' in-memory state still reflects intent. The next page
    // load will fall back to env / default since persistence failed.
    return version
  }
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: version }))
  return version
}

export const DESIGN_FLAG_STORAGE_KEY = STORAGE_KEY
