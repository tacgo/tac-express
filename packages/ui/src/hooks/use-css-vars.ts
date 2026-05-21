"use client"

import * as React from "react"

/**
 * Resolve CSS custom properties to concrete color/length strings at runtime.
 *
 * Designed for WebGL / Canvas / MapLibre consumers that cannot read CSS
 * variables directly (their paint expressions need resolved values, not
 * `var(--token)` strings). Reading via `getComputedStyle` keeps these
 * consumers LAW-1 compliant — they still flow through the token system,
 * just with one level of indirection.
 *
 * Re-resolves on theme changes by observing the `class` and `data-theme`
 * attributes on `<html>` (matches the `.dark *` + `.ops-console` cascade
 * + the `next-themes` `data-theme` signal).
 *
 * Usage:
 *   const colors = useCssVars(["--paper-violet", "--paper-err"] as const)
 *   // colors["--paper-violet"] → "oklch(0.5393 0.2713 286.7462)"
 */
export function useCssVars<T extends readonly string[]>(
  names: T,
): Record<T[number], string> {
  // Names is captured by reference identity — callers should pass a stable
  // array (declare it at module scope with `as const`, or memoize). The
  // initial resolution runs in a layout effect so first paint already has
  // the resolved values.
  const [values, setValues] = React.useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {}
    return resolve(names)
  })

  React.useEffect(() => {
    if (typeof window === "undefined") return

    // Resolve once on mount (covers SSR hydration where the initial state
    // ran on the server with an empty object).
    setValues(resolve(names))

    const html = document.documentElement
    const observer = new MutationObserver(() => {
      setValues(resolve(names))
    })
    observer.observe(html, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    })
    return () => observer.disconnect()
    // names is treated as stable per the JSDoc contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return values as Record<T[number], string>
}

function resolve(names: readonly string[]): Record<string, string> {
  const styles = getComputedStyle(document.documentElement)
  const out: Record<string, string> = {}
  for (const name of names) {
    out[name] = styles.getPropertyValue(name).trim()
  }
  return out
}
