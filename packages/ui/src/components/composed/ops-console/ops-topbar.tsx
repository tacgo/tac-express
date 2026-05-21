"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { cn } from "@workspace/ui/lib/utils"
import {
  RiSearchLine,
  RiNotification3Line,
  RiMoonClearLine,
} from "@workspace/ui/icons"

interface OpsTopbarProps {
  crumbs: string[]
}

type ThemeKey = "C" | "M" | "S"
const THEME_TO_NEXT: Record<ThemeKey, "light" | "dark" | "system"> = {
  C: "light",
  M: "dark",
  S: "system",
}
const NEXT_TO_THEME: Record<string, ThemeKey> = {
  light: "C",
  dark: "M",
  system: "S",
}

function OpsTopbar({ crumbs }: OpsTopbarProps) {
  const { theme: nextTheme, setTheme: setNextTheme, resolvedTheme } = useTheme()

  // `next-themes` returns `undefined` on the server (it can't read
  // `localStorage`), so SSR markup would show whatever default we pick while
  // the client renders the user's actual saved theme — a hydration mismatch.
  // Gate every theme-dependent attribute (active state, aria-pressed, aria-label,
  // className) behind `mounted` so both server and first client paint render
  // an identical "neutral" toggle, then `useEffect` flips it to the real state.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  // C = Cream (light), M = Midnight (dark), S = System. Before mount we
  // intentionally return `null` so no button is marked active in the SSR HTML;
  // after mount the real theme drives it.
  const theme: ThemeKey | null = mounted
    ? NEXT_TO_THEME[nextTheme ?? "system"] ?? null
    : null

  const isDark = mounted && resolvedTheme === "dark"

  function onPick(t: ThemeKey) {
    setNextTheme(THEME_TO_NEXT[t])
  }

  return (
    // <header role="banner"> wraps the top bar so the breadcrumbs, theme
    // toggle, and account avatar are inside a recognised landmark.
    // Previously the topbar was a plain <div> and axe flagged its descendants
    // (hub indicator + theme group + account chip) as outside any region.
    // Closes R0 audit C3.
    <header
      data-slot="ops-topbar"
      role="banner"
      aria-label="Session controls"
      className="flex items-center px-6 h-14 border-b border-transparent"
    >
      {/* Breadcrumbs */}
      <div className="font-paper-mono font-medium text-ui-12 tracking-crumb text-paper-fg-3">
        {crumbs.map((c, i) => (
          <React.Fragment key={`${c}-${i}`}>
            {i > 0 && <span className="mx-2 text-paper-fg-4">›</span>}
            {i === crumbs.length - 1 ? (
              <b className="text-paper-fg-1 font-semibold">{c}</b>
            ) : (
              <span>{c}</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-1">
        {/* Search */}
        <button
          type="button"
          aria-label="Open command palette"
          className="flex items-center gap-1.5 h-8 px-2 border border-paper-line bg-paper-card text-paper-fg-3 hover:bg-paper-3 focus-visible:outline-none focus-visible:tac-focus-premium transition-colors duration-fast ease-linear"
        >
          <RiSearchLine aria-hidden className="size-3.5" />
          <span className="font-paper-mono font-medium text-ui-10 px-1.5 py-0.5 border border-paper-line text-paper-fg-2">
            ⌘K
          </span>
        </button>

        {/* Theme selector — C / M / S, wired to next-themes */}
        <div
          className="inline-flex h-8 border border-paper-line overflow-hidden"
          role="group"
          aria-label="Theme"
        >
          {(["C", "M", "S"] as const).map((t) => {
            const isActive = mounted && theme === t
            return (
              <button
                key={t}
                type="button"
                // `suppressHydrationWarning` is belt-and-suspenders: even with
                // the `mounted` gate, the *first* commit after mount swaps the
                // active button. React 19 logs a dev warning on that single
                // pair-mismatch tick unless we tell it to ignore the diff.
                suppressHydrationWarning
                aria-pressed={isActive}
                aria-label={`Switch to ${THEME_TO_NEXT[t]} theme`}
                onClick={() => onPick(t)}
                className={cn(
                  "w-7 h-[length:var(--toggle-h)] border-r border-paper-line last:border-r-0 bg-paper-card",
                  "font-paper-mono font-semibold text-ui-11 text-paper-fg-2",
                  "hover:bg-paper-3 transition-colors duration-fast ease-linear",
                  "focus-visible:outline-none focus-visible:tac-focus-premium",
                  isActive && "bg-paper-violet text-white hover:bg-paper-violet-2",
                )}
              >
                {t}
              </button>
            )
          })}
        </div>

        {/* Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="size-8 border border-paper-line bg-paper-card grid place-items-center text-paper-fg-2 hover:bg-paper-3 focus-visible:outline-none focus-visible:tac-focus-premium transition-colors duration-fast ease-linear"
        >
          <RiNotification3Line aria-hidden className="size-4" />
        </button>

        {/* Light/dark toggle — toggles between the two non-system modes. Use a
            neutral aria-label until mounted so SSR and first client paint
            agree; after mount it switches to the directional variant. */}
        <button
          type="button"
          suppressHydrationWarning
          aria-label={
            mounted
              ? isDark
                ? "Switch to light theme"
                : "Switch to dark theme"
              : "Toggle theme"
          }
          onClick={() => setNextTheme(isDark ? "light" : "dark")}
          className="size-8 border border-paper-line bg-paper-card grid place-items-center text-paper-fg-2 hover:bg-paper-3 focus-visible:outline-none focus-visible:tac-focus-premium transition-colors duration-fast ease-linear"
        >
          <RiMoonClearLine aria-hidden className="size-4" />
        </button>

        {/* Avatar — interactive (account menu placeholder). A plain <div>
           with aria-label is ignored by most assistive tech; a <button>
           with aria-haspopup="menu" is the WCAG 4.1.2-compliant equivalent. */}
        <button
          type="button"
          aria-label="Account menu"
          aria-haspopup="menu"
          className="size-8 bg-paper-violet [color:white] border border-paper-violet-2 grid place-items-center font-paper-mono font-semibold text-ui-12 hover:bg-paper-violet-2 focus-visible:outline-none focus-visible:tac-focus-premium transition-colors duration-fast ease-linear"
        >
          A
        </button>
      </div>
    </header>
  )
}

export { OpsTopbar }
export type { OpsTopbarProps }
