"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"
import { Sidebar } from "@workspace/ui/components/composed/sidebar"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/primitives/sheet"
import { OpsTopbar } from "./ops-topbar"
import { opsContentVariants } from "./ops-content"

interface OpsShellProps {
  /** Override crumbs explicitly. Omit to auto-derive from pathname. */
  crumbs?: string[]
  /** Environment tag shown as the root crumb. */
  envCrumb?: string
  children: React.ReactNode
  className?: string
}

// Maps a path segment under /ops-console to its display label. Falls back to
// title-casing the segment if it isn't a known route.
const SEGMENT_LABELS: Record<string, string> = {
  "": "Dashboard",
  analytics: "Analytics",
  shipments: "Shipments",
  manifests: "Manifests",
  scanning: "Scanning",
  inventory: "Inventory",
  exceptions: "Exceptions",
  finance: "Finance",
  rates: "Rate Cards",
  customers: "Customers",
  management: "Operations & Access",
  notifications: "Notifications",
  settings: "Settings",
}

function titleCase(seg: string): string {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg]
  return seg
    .split(/[-_]/)
    .map((p) => (p ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(" ")
}

/**
 * OpsShell — the Paper Console root layout: sticky 240px sidebar +
 * 56px topbar + content area. Scoped via the `.ops-console` class so paper
 * tokens never leak into Violet Grid v6 pages on the same dashboard app.
 *
 * Source pattern: .design-bundle/ui_kits/web_app/app.css `.app`.
 */
function OpsShell({
  crumbs,
  envCrumb = "Imphal // Prod",
  children,
  className,
}: OpsShellProps) {
  const pathname = usePathname() ?? "/ops-console"
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  const resolvedCrumbs = React.useMemo(() => {
    if (crumbs && crumbs.length > 0) return crumbs
    const rest = pathname.replace(/^\/ops-console\/?/, "")
    if (!rest) return [envCrumb, "Dashboard"]
    return [envCrumb, ...rest.split("/").filter(Boolean).map(titleCase)]
  }, [crumbs, pathname, envCrumb])

  // Close the mobile drawer whenever the route changes.
  React.useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  return (
    <div
      data-slot="ops-shell"
      className={cn(
        // The ops-console class scopes the paper-* utilities below.
        "ops-console",
        // Responsive shell: single column on mobile/tablet (content full-width,
        // sidebar lives in the drawer), two-column sidebar + content from lg up.
        "grid grid-cols-1 lg:grid-cols-[var(--sidebar-w)_1fr] min-h-screen bg-background text-foreground",
        // Force Paper-Console fonts inside this subtree without touching v6 routes.
        "font-sans",
        className,
      )}
    >
      {/* Desktop sidebar — in-grid; hidden below lg, where the drawer takes over. */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex flex-col min-w-0">
        <OpsTopbar
          crumbs={resolvedCrumbs}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        {/*
          Shell-tier width contract: every route's content is centered and
          capped at the hardware-frame ceiling so nothing sprawls on an
          ultrawide monitor. PageShell (page tier) narrows further per route.
          See ops-content.ts.
        */}
        <main className="flex-1 min-w-0">
          <div className={opsContentVariants()}>{children}</div>
        </main>
      </div>

      {/* Mobile navigation drawer (< lg) — the same Sidebar, off-canvas. */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-60 p-0 lg:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>
    </div>
  )
}

export { OpsShell }
export type { OpsShellProps }
