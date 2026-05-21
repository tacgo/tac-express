"use client"

import * as React from "react"

interface UseIdleTimeoutOptions {
  /** Idle threshold in milliseconds. Default 30 minutes. */
  idleAfterMs?: number
  /** Warning lead time before forced logout. Default 30 seconds. */
  warningLeadMs?: number
  /** Called when the warning window opens. */
  onWarn?: (msUntilLogout: number) => void
  /** Called when the user has been idle long enough to be logged out. */
  onIdle: () => void
  /** Disable the timer entirely (e.g. while a modal is open). */
  disabled?: boolean
  /** Optional storage key — when set, last-activity timestamp is broadcast
   *  across browser tabs via `storage` events so any active tab keeps the
   *  user logged in everywhere. */
  storageKey?: string
}

/**
 * Idle timeout enforcement. Listens for user-initiated activity events
 * (pointer, key, scroll, visibility) and fires `onIdle` after a configurable
 * threshold — with an optional warning callback in the lead window.
 *
 * The hook is intentionally storage-aware: when `storageKey` is provided,
 * activity in any browser tab keeps the timer fresh in every tab. This
 * prevents the "I was working in tab B but tab A logged me out" UX bug.
 */
export function useIdleTimeout({
  idleAfterMs = 30 * 60 * 1000,
  warningLeadMs = 30 * 1000,
  onWarn,
  onIdle,
  disabled,
  storageKey,
}: UseIdleTimeoutOptions): void {
  const lastActivity = React.useRef<number>(0)
  const warnFired = React.useRef<boolean>(false)
  const onIdleRef = React.useRef(onIdle)
  const onWarnRef = React.useRef(onWarn)

  // Keep latest callbacks addressable without re-creating the timer.
  React.useEffect(() => {
    onIdleRef.current = onIdle
    onWarnRef.current = onWarn
  }, [onIdle, onWarn])

  React.useEffect(() => {
    if (disabled) return

    lastActivity.current = Date.now()

    const bump = () => {
      const now = Date.now()
      lastActivity.current = now
      warnFired.current = false
      if (storageKey && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(storageKey, String(now))
        } catch {
          /* quota — best effort */
        }
      }
    }

    const onStorage = (e: StorageEvent) => {
      if (!storageKey || e.key !== storageKey || !e.newValue) return
      const v = Number(e.newValue)
      if (Number.isFinite(v)) {
        lastActivity.current = v
        warnFired.current = false
      }
    }

    const events: (keyof DocumentEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "visibilitychange",
    ]
    events.forEach((evt) => document.addEventListener(evt, bump, { passive: true }))
    if (storageKey) window.addEventListener("storage", onStorage)

    const tick = window.setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastActivity.current
      const remaining = idleAfterMs - elapsed
      if (remaining <= 0) {
        warnFired.current = false
        onIdleRef.current?.()
        return
      }
      if (!warnFired.current && remaining <= warningLeadMs) {
        warnFired.current = true
        onWarnRef.current?.(remaining)
      }
    }, 1000)

    return () => {
      events.forEach((evt) => document.removeEventListener(evt, bump))
      if (storageKey) window.removeEventListener("storage", onStorage)
      window.clearInterval(tick)
    }
  }, [idleAfterMs, warningLeadMs, disabled, storageKey])
}
