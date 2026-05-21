"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { cn } from "@workspace/ui/lib/utils"
import { CommandPalette } from "@workspace/ui/components/composed/command-palette"
import { NotificationBell } from "@workspace/ui/components/composed/notification-bell"
import { DensityToggle } from "@workspace/ui/components/primitives/density-toggle"
import { useDensity } from "@workspace/ui/components/composed/density-provider"
import {
  RiSearchLine,
  RiMoonClearLine,
  RiSunLine,
  RiArrowRightSLine,
} from "@workspace/ui/icons"
import { useTheme } from "next-themes"
import { UserMenu } from "@workspace/ui/components/composed/user-menu"

const ROUTE_LABELS: Record<string, string> = {
  "/home": "Overview",
  "/shipments": "Shipments",
  "/manifests": "Manifests",
  "/scanning": "Scanning",
  "/inventory": "Inventory",
  "/exceptions": "Exceptions",
  "/finance": "Finance",
  "/customers": "Customers",
  "/analytics": "Analytics",
  "/management": "Management",
  "/notifications": "Notifications",
  "/settings": "Settings",
}

function getSegments(pathname: string): { label: string; href: string }[] {
  const base = "/" + pathname.split("/")[1]
  const label = ROUTE_LABELS[base] ?? "Dashboard"
  return [
    { label: "TAC Express", href: "/home" },
    { label, href: base },
  ]
}

function HeaderDensityToggle() {
  const { density, setDensity } = useDensity()
  return <DensityToggle value={density} onChange={setDensity} />
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const isDark = resolvedTheme === "dark"

  return (
    <button
      data-slot="theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors tac-fui-hover border border-transparent"
      aria-label="Toggle theme"
    >
      {mounted ? (
        isDark ? <RiSunLine className="h-4 w-4" /> : <RiMoonClearLine className="h-4 w-4" />
      ) : (
        <span className="h-4 w-4 block" />
      )}
    </button>
  )
}

function DashboardHeader() {
  const pathname = usePathname()
  const segments = getSegments(pathname)
  const [paletteOpen, setPaletteOpen] = React.useState(false)

  return (
    <>
      <header
        data-slot="dashboard-header"
        className="flex items-center h-14 px-4 border-b border-border bg-background shrink-0 gap-2"
      >
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 mr-auto">
          {segments.map((seg, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <RiArrowRightSLine className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" aria-hidden="true" />
              )}
              {i < segments.length - 1 ? (
                <a
                  href={seg.href}
                  className={cn(
                    "t-body-sm text-muted-foreground hover:text-primary transition-colors hover:underline decoration-primary/50 underline-offset-4"
                  )}
                >
                  {seg.label}
                </a>
              ) : (
                <span className="t-body-sm font-medium text-foreground">{seg.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Search trigger — compact icon + ⌘K hint, opens CommandPalette.
            Replaces the prior 260px text input that read as a real input
            but was actually a click-trigger; the new variant is ~80px on
            sm+ and an icon-only square on mobile (the CommandPalette is
            the only operator-facing search entry point, so it must
            remain reachable below the sm breakpoint). */}
        <button
          data-slot="dashboard-search-trigger"
          type="button"
          onClick={() => setPaletteOpen(true)}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center sm:w-auto sm:gap-2 sm:px-2",
            "border border-border bg-surface text-muted-foreground",
            "hover:border-primary hover:bg-primary/5 hover:text-foreground",
            "tac-fui-hover transition-colors",
            "focus:outline-none focus-visible:outline-1 focus-visible:outline-primary focus-visible:outline-offset-1"
          )}
          aria-label="Open search (⌘K)"
        >
          <RiSearchLine className="h-3.5 w-3.5" aria-hidden="true" />
          <kbd
            className="pointer-events-none hidden h-5 min-w-6 items-center justify-center gap-px whitespace-nowrap border border-border bg-background px-1.5 font-mono text-2xs leading-none text-muted-foreground sm:inline-flex"
            aria-hidden="true"
          >
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </button>

        <HeaderDensityToggle />
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  )
}

export { DashboardHeader, ThemeToggle }
