"use client"

import * as React from "react"

interface UseFormAutosaveOptions<T> {
  /** Storage key. Use a per-form unique key (e.g. `invoice_draft`). */
  key: string
  /** Current form state to persist. */
  value: T
  /** Persist interval in ms. Default 5000. */
  intervalMs?: number
  /** Skip persistence when this returns true (e.g. empty/initial state). */
  shouldPersist?: (value: T) => boolean
  /** Storage backend. Default `localStorage`. */
  storage?: Storage
}

interface AutosaveResult<T> {
  /** ISO timestamp of the most recent save, or null if never saved. */
  savedAt: string | null
  /** Manually flush the current value immediately. */
  saveNow: () => void
  /** Manually clear the persisted draft. */
  clearDraft: () => void
  /** Read whatever is currently in storage (without restoring it). */
  readDraft: () => T | null
}

/**
 * Throttled localStorage autosave for multi-step wizards. Persists `value`
 * every `intervalMs` while the form is dirty; exposes `readDraft()` so the
 * consumer can offer a "restore" prompt on mount. The hook never restores
 * automatically — that's a UX decision left to the consumer.
 */
export function useFormAutosave<T>({
  key,
  value,
  intervalMs = 5000,
  shouldPersist,
  storage,
}: UseFormAutosaveOptions<T>): AutosaveResult<T> {
  const [savedAt, setSavedAt] = React.useState<string | null>(null)
  const valueRef = React.useRef(value)
  const stoRef = React.useRef<Storage | null>(null)

  // Keep latest value addressable from the interval callback without
  // re-creating the interval on every render.
  React.useEffect(() => {
    valueRef.current = value
  }, [value])

  // Resolve the storage backend once (browser-only).
  React.useEffect(() => {
    if (storage) {
      stoRef.current = storage
      return
    }
    if (typeof window !== "undefined") {
      stoRef.current = window.localStorage
    }
  }, [storage])

  const persist = React.useCallback(() => {
    const sto = stoRef.current
    if (!sto) return
    const v = valueRef.current
    if (shouldPersist && !shouldPersist(v)) return
    try {
      sto.setItem(
        key,
        JSON.stringify({ value: v, savedAt: new Date().toISOString() })
      )
      setSavedAt(new Date().toISOString())
    } catch {
      // Quota exceeded or serialization error — silently ignore. The wizard
      // remains functional; only the autosave guarantee is degraded.
    }
  }, [key, shouldPersist])

  React.useEffect(() => {
    const t = setInterval(persist, intervalMs)
    return () => clearInterval(t)
  }, [intervalMs, persist])

  // Persist once when the page is being unloaded (best-effort).
  React.useEffect(() => {
    const handler = () => persist()
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [persist])

  const readDraft = React.useCallback((): T | null => {
    const sto = stoRef.current
    if (!sto) return null
    try {
      const raw = sto.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { value: T }
      return parsed.value
    } catch {
      return null
    }
  }, [key])

  const clearDraft = React.useCallback(() => {
    const sto = stoRef.current
    if (!sto) return
    sto.removeItem(key)
    setSavedAt(null)
  }, [key])

  return { savedAt, saveNow: persist, clearDraft, readDraft }
}
