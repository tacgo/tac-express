"use client"

import * as React from "react"
import type { Density } from "@workspace/ui/lib/density"

/**
 * v6 — Density modes
 *
 * Provides a `data-density` attribute on the dashboard root element so
 * descendant components (tables, lists, KPI grids) can adapt their
 * spacing rhythm. CSS in `globals.css` reads `[data-density="compact"]`
 * etc. and rebinds spacing-row tokens. Components can also `useDensity()`
 * to branch behavior in JS when a CSS-only path isn't possible.
 *
 * Persists user choice to localStorage as `tac-density`.
 *
 * The `Density` vocabulary lives in `@workspace/ui/lib/density` so that
 * the `DensityToggle` primitive can import it without depending on this
 * composed module (preserves the primitives → composed dependency direction).
 *
 * See `docs/VIOLET-GRID-V6-EVOLUTION.md` § 1.7.
 */

interface DensityContextValue {
  density: Density
  setDensity: (value: Density) => void
}

const DensityContext = React.createContext<DensityContextValue | null>(null)

const STORAGE_KEY = "tac-density"
const DEFAULT_DENSITY: Density = "comfortable"

interface DensityProviderProps {
  children: React.ReactNode
  /** Initial density before localStorage hydrates. Defaults to "comfortable". */
  defaultDensity?: Density
}

function DensityProvider({ children, defaultDensity = DEFAULT_DENSITY }: DensityProviderProps) {
  const [density, setDensityState] = React.useState<Density>(defaultDensity)

  // Hydrate from localStorage on mount (client-only)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Density | null
      if (stored === "compact" || stored === "comfortable" || stored === "spacious") {
        setDensityState(stored)
      }
    } catch {
      /* localStorage unavailable — stay on default */
    }
  }, [])

  const setDensity = React.useCallback((value: Density) => {
    setDensityState(value)
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, value)
      } catch {
        /* quota — ignore */
      }
    }
  }, [])

  const ctx = React.useMemo<DensityContextValue>(() => ({ density, setDensity }), [density, setDensity])

  return (
    <DensityContext.Provider value={ctx}>
      {/* The data-density attribute on this root flows through the entire subtree */}
      <div data-slot="density-root" data-density={density} className="contents">
        {children}
      </div>
    </DensityContext.Provider>
  )
}

/** Hook for components that need density in JS. CSS-only paths should query [data-density] instead. */
function useDensity(): DensityContextValue {
  const ctx = React.useContext(DensityContext)
  if (!ctx) {
    // Graceful fallback when not inside a provider (e.g. public surfaces)
    return { density: DEFAULT_DENSITY, setDensity: () => {} }
  }
  return ctx
}

export { DensityProvider, useDensity }
