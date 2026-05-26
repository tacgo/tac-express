"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"

import { cn } from "@workspace/ui/lib/utils"
import {
  RiSearchLine,
  RiNotification3Line,
  RiMoonClearLine,
  RiArrowDownSLine,
  RiSettingsLine,
  RiMenuLine,
} from "@workspace/ui/icons"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/primitives/dropdown-menu"

interface OpsTopbarProps {
  crumbs: string[]
  /** Opens the mobile navigation drawer. Renders a hamburger (< lg only). */
  onMenuClick?: () => void
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

function OpsTopbar({ crumbs, onMenuClick }: OpsTopbarProps) {
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
      className="flex items-center px-6 h-14 border-b border-border bg-card"
    >
      {/* Mobile nav toggle — opens the sidebar drawer. Hidden on lg+ where the
          sidebar is always visible in the shell grid. */}
      {onMenuClick ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
          className="lg:hidden -ml-1 mr-2 size-8 border border-border bg-card text-muted-foreground hover:bg-muted focus-visible:tac-focus-premium"
        >
          <RiMenuLine aria-hidden className="size-4" />
        </Button>
      ) : null}

      {/* Breadcrumbs — hidden on small screens so the topbar's right cluster
          (search + theme + notifications + account) fits; the page header +
          mobile nav drawer carry route context there. */}
      <div className="hidden sm:block font-mono font-medium text-ui-12 tracking-crumb text-muted-foreground">
        {crumbs.map((c, i) => (
          <React.Fragment key={`${c}-${i}`}>
            {i > 0 && <span className="mx-2 text-muted-foreground">›</span>}
            {i === crumbs.length - 1 ? (
              <b className="text-foreground font-semibold">{c}</b>
            ) : (
              <span>{c}</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2">
        {/* Search */}
        <Button
          type="button"
          variant="ghost"
          aria-label="Open command palette"
          className="flex items-center gap-1.5 h-8 px-2 border border-border bg-card text-muted-foreground hover:bg-muted focus-visible:tac-focus-premium"
        >
          <RiSearchLine aria-hidden className="size-3.5" />
          <span className="font-mono font-medium text-ui-10 px-1.5 py-0.5 border border-border text-foreground">
            ⌘K
          </span>
        </Button>

        {/* Theme selector — C / M / S, wired to next-themes */}
        <div
          className="inline-flex h-8 border border-border overflow-hidden"
          role="group"
          aria-label="Theme"
        >
          {(["C", "M", "S"] as const).map((t) => {
            const isActive = mounted && theme === t
            return (
              <Button
                key={t}
                type="button"
                variant="ghost"
                // `suppressHydrationWarning` is belt-and-suspenders: even with
                // the `mounted` gate, the *first* commit after mount swaps the
                // active button. React 19 logs a dev warning on that single
                // pair-mismatch tick unless we tell it to ignore the diff.
                suppressHydrationWarning
                aria-pressed={isActive}
                aria-label={`Switch to ${THEME_TO_NEXT[t]} theme`}
                onClick={() => onPick(t)}
                className={cn(
                  "w-7 h-[length:var(--toggle-h)] border-r border-border last:border-r-0 bg-card",
                  "font-mono font-semibold text-ui-11 text-foreground",
                  "hover:bg-muted focus-visible:tac-focus-premium",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                {t}
              </Button>
            )
          })}
        </div>

        {/* Bell */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="size-8 border border-border bg-card text-foreground hover:bg-muted focus-visible:tac-focus-premium"
        >
          <RiNotification3Line aria-hidden className="size-4" />
        </Button>

        {/* Light/dark toggle — toggles between the two non-system modes. Use a
            neutral aria-label until mounted so SSR and first client paint
            agree; after mount it switches to the directional variant. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          suppressHydrationWarning
          aria-label={
            mounted
              ? isDark
                ? "Switch to light theme"
                : "Switch to dark theme"
              : "Toggle theme"
          }
          onClick={() => setNextTheme(isDark ? "light" : "dark")}
          className="size-8 border border-border bg-card text-foreground hover:bg-muted focus-visible:tac-focus-premium"
        >
          <RiMoonClearLine aria-hidden className="size-4" />
        </Button>

        {/* Divider grouping the session controls from the account chip. */}
        <span aria-hidden className="mx-1 h-5 w-px bg-border" />

        {/* Account chip — solid avatar + chevron, opens an account menu.
           Replaces the bare avatar square for a more finished, clearly-
           interactive control (the reviewer-flagged "outdated" header look). */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* eslint-disable-next-line no-restricted-syntax -- Radix DropdownMenuTrigger asChild requires a native element */}
            <button
              type="button"
              aria-label="Account menu"
              className="flex items-center gap-1.5 h-8 pl-1 pr-1.5 border border-border bg-card hover:bg-muted focus-visible:outline-none focus-visible:tac-focus-premium transition-colors duration-fast ease-linear"
            >
              <span
                aria-hidden
                className="size-6 bg-primary text-primary-foreground grid place-items-center font-mono font-semibold text-ui-11"
              >
                A
              </span>
              <RiArrowDownSLine aria-hidden className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
              Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-xs">
              <Link href="/ops-console/settings">
                <RiSettingsLine className="size-3.5" aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export { OpsTopbar }
export type { OpsTopbarProps }
