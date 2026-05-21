"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Versioned localStorage key for the shipment-creation draft.
 *
 * Bumping the suffix (-v1 → -v2) silently invalidates all existing drafts on
 * next read — the right thing to do when the wizard's zod schema changes
 * shape so old drafts can no longer be safely rehydrated.
 */
export const SHIPMENT_DRAFT_STORAGE_KEY = "tac-shipment-draft-v1"
export const SHIPMENT_DRAFT_SCHEMA_VERSION = 1

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 24h — operators expect fresh data per shift
const DEFAULT_DEBOUNCE_MS = 500

interface StoredDraft<T> {
  version: number
  savedAt: number
  values: T
}

export interface UseShipmentDraftOptions {
  /** Override the default storage key — used to isolate drafts in tests or per-form. */
  storageKey?: string
  /** Eviction window in ms. Default: 24h. */
  ttlMs?: number
  /** Debounce window for save calls, in ms. Default: 500. */
  debounceMs?: number
}

export interface UseShipmentDraftReturn<T> {
  /** The hydrated draft from localStorage, or null when none / stale / invalid. */
  draft: T | null
  /** Debounced write — call on every form change; only the last value within the window persists. */
  save: (values: T) => void
  /** Synchronous remove — call on successful submit or explicit "discard draft". */
  clear: () => void
}

/**
 * Read-once draft loader. Returns the persisted values when fresh, null otherwise.
 * Stale entries are evicted on read so subsequent visits don't pay the parse cost.
 *
 * Failure tolerance: any localStorage / JSON / version / type mismatch returns
 * null — drafts are best-effort. The wizard must work without persistence.
 */
function readDraft<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredDraft<T>
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      parsed.version !== SHIPMENT_DRAFT_SCHEMA_VERSION ||
      typeof parsed.savedAt !== "number"
    ) {
      return null
    }

    if (Date.now() - parsed.savedAt > ttlMs) {
      try {
        window.localStorage.removeItem(key)
      } catch {
        // ignore — eviction is opportunistic
      }
      return null
    }

    return parsed.values
  } catch {
    return null
  }
}

/**
 * Persists in-progress shipment form state to localStorage with TTL-based
 * eviction so an operator interrupted mid-create can resume on reload.
 *
 * Contract:
 *   - draft  — synchronously hydrated from storage on first render (null if absent / stale / invalid)
 *   - save   — debounced 500ms; rapid keystrokes coalesce to one write
 *   - clear  — synchronous; cancels any pending save and removes the entry
 *
 * Storage shape:
 *   { version, savedAt, values } — versioned so a schema bump silently invalidates older drafts.
 *
 * SSR safety: every storage access is guarded by typeof window — the hook is
 * a no-op outside the browser. packages/ui hooks are client-only by convention,
 * but the guards keep the module safely importable from server components.
 */
export function useShipmentDraft<T>(
  opts: UseShipmentDraftOptions = {},
): UseShipmentDraftReturn<T> {
  const storageKey = opts.storageKey ?? SHIPMENT_DRAFT_STORAGE_KEY
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS
  const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS

  // Lazy initializer — runs once on mount. Pattern matches use-design-version.
  const [draft] = useState<T | null>(() => {
    if (typeof window === "undefined") return null
    return readDraft<T>(storageKey, ttlMs)
  })

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    (values: T) => {
      if (typeof window === "undefined") return
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        try {
          const payload: StoredDraft<T> = {
            version: SHIPMENT_DRAFT_SCHEMA_VERSION,
            savedAt: Date.now(),
            values,
          }
          window.localStorage.setItem(storageKey, JSON.stringify(payload))
        } catch {
          // QuotaExceededError, SecurityError, etc — draft persistence is best-effort
        }
        timerRef.current = null
      }, debounceMs)
    },
    [storageKey, debounceMs],
  )

  const clear = useCallback(() => {
    if (typeof window === "undefined") return
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
  }, [storageKey])

  // Cancel any pending debounced save when the component unmounts.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  return { draft, save, clear }
}
