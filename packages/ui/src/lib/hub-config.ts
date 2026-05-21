"use client"

import * as React from "react"

/**
 * Hub configuration shared between the Hub Inventory page and the Settings
 * page. Persists to `localStorage` so renames + the hub list survive across
 * sessions. The data model is intentionally client-side only — Imphal +
 * New Delhi seed the default list so operators see meaningful cards before
 * any shipment touches a hub, and they can add/remove additional hub codes
 * from the Settings → Hubs tab.
 */

export interface HubConfig {
  /** Ordered list of hub codes the operator wants visible. */
  hubs: string[]
  /** Display-label override per hub code (e.g. "BOM" → "Bombay"). */
  renames: Record<string, string>
  /**
   * Hub codes the operator has explicitly hidden. These won't render on the
   * Hub Inventory page even when shipment data references them. Use cases:
   * a hub from old/stale shipment rows the operator no longer cares about,
   * or a third-party hub they don't want to monitor.
   */
  hidden: string[]
}

const STORAGE_KEY = "tac-hub-config-v1"

/**
 * Seed hubs — Imphal (the operator's origin hub) and New Delhi (the primary
 * downstream destination). These remain in the list unless the operator
 * explicitly removes them.
 */
export const DEFAULT_HUBS: readonly string[] = ["IMPHAL", "NEW_DELHI"]

/** Title-case a raw hub code like `NEW_DELHI` → `New Delhi`. */
export function prettifyHubCode(code: string): string {
  return code
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

/** Normalize free-text input to a canonical hub-code shape: `NEW DELHI` → `NEW_DELHI`. */
export function normalizeHubCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function emptyConfig(): HubConfig {
  return { hubs: [...DEFAULT_HUBS], renames: {}, hidden: [] }
}

function readConfig(): HubConfig {
  if (typeof window === "undefined") return emptyConfig()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyConfig()
    const parsed = JSON.parse(raw) as Partial<HubConfig>
    return {
      hubs:
        Array.isArray(parsed.hubs) && parsed.hubs.every((h) => typeof h === "string")
          ? parsed.hubs
          : [...DEFAULT_HUBS],
      renames:
        typeof parsed.renames === "object" && parsed.renames !== null
          ? (parsed.renames as Record<string, string>)
          : {},
      hidden:
        Array.isArray(parsed.hidden) && parsed.hidden.every((h) => typeof h === "string")
          ? parsed.hidden
          : [],
    }
  } catch {
    return emptyConfig()
  }
}

function writeConfig(cfg: HubConfig) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
  } catch {
    /* quota — ignore */
  }
}

export interface UseHubConfigResult {
  /** True after the localStorage value has been read into state. */
  hydrated: boolean
  hubs: string[]
  renames: Record<string, string>
  hidden: string[]
  /** Add a hub code if it isn't already in the list. Returns true if added. */
  addHub: (code: string) => boolean
  /**
   * Remove a hub from the inventory view entirely. Removes from the
   * configured `hubs` list AND adds to `hidden` so external hubs (those
   * appearing from shipment data) don't reappear after deletion. The
   * rename override is preserved so unhiding later restores the label.
   */
  removeHub: (code: string) => void
  /** Rename a hub. Pass empty string or the default label to clear. */
  renameHub: (code: string, label: string) => void
  /** Un-hide a hub so it appears again on the inventory page. */
  unhideHub: (code: string) => void
  /** Wipe all rename overrides (keeps the hub list). */
  resetRenames: () => void
  /** Restore `hubs`, `renames`, and `hidden` to factory defaults. */
  resetAll: () => void
  /** Resolve a hub's display label (rename override or prettified code). */
  labelFor: (code: string) => string
}

/**
 * Shared state hook for hub configuration. Same instance per component
 * tree; different mounts (e.g. settings vs. inventory) re-read localStorage
 * on hydrate so cross-page edits propagate on the next navigation.
 */
export function useHubConfig(): UseHubConfigResult {
  const [cfg, setCfg] = React.useState<HubConfig>(() => emptyConfig())
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    setCfg(readConfig())
    setHydrated(true)
  }, [])

  const update = React.useCallback(
    (next: HubConfig | ((prev: HubConfig) => HubConfig)) => {
      setCfg((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next
        writeConfig(resolved)
        return resolved
      })
    },
    [],
  )

  const addHub = React.useCallback(
    (code: string): boolean => {
      const norm = normalizeHubCode(code)
      if (!norm) return false
      let added = false
      update((prev) => {
        if (prev.hubs.includes(norm)) return prev
        added = true
        // Adding a hub un-hides it as a side-effect — operators expect
        // "Add Hub MUMBAI" to make Mumbai visible, even if they'd
        // previously hidden it.
        return {
          ...prev,
          hubs: [...prev.hubs, norm],
          hidden: prev.hidden.filter((h) => h !== norm),
        }
      })
      return added
    },
    [update],
  )

  const removeHub = React.useCallback(
    (code: string) => {
      update((prev) => ({
        ...prev,
        hubs: prev.hubs.filter((h) => h !== code),
        hidden: prev.hidden.includes(code) ? prev.hidden : [...prev.hidden, code],
      }))
    },
    [update],
  )

  const unhideHub = React.useCallback(
    (code: string) => {
      update((prev) => ({
        ...prev,
        hidden: prev.hidden.filter((h) => h !== code),
      }))
    },
    [update],
  )

  const renameHub = React.useCallback(
    (code: string, label: string) => {
      const trimmed = label.trim()
      update((prev) => {
        const nextRenames = { ...prev.renames }
        if (!trimmed || trimmed === prettifyHubCode(code)) {
          delete nextRenames[code]
        } else {
          nextRenames[code] = trimmed
        }
        return { ...prev, renames: nextRenames }
      })
    },
    [update],
  )

  const resetRenames = React.useCallback(() => {
    update((prev) => ({ ...prev, renames: {} }))
  }, [update])

  const resetAll = React.useCallback(() => {
    update(emptyConfig())
  }, [update])

  const labelFor = React.useCallback(
    (code: string) => cfg.renames[code] ?? prettifyHubCode(code),
    [cfg.renames],
  )

  return {
    hydrated,
    hubs: cfg.hubs,
    renames: cfg.renames,
    hidden: cfg.hidden,
    addHub,
    removeHub,
    renameHub,
    unhideHub,
    resetRenames,
    resetAll,
    labelFor,
  }
}
