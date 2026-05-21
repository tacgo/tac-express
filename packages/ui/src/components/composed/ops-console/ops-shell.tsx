"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"
import { Sidebar } from "@workspace/ui/components/composed/sidebar"
import { OpsTopbar } from "./ops-topbar"

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

  const resolvedCrumbs = React.useMemo(() => {
    if (crumbs && crumbs.length > 0) return crumbs
    const rest = pathname.replace(/^\/ops-console\/?/, "")
    if (!rest) return [envCrumb, "Dashboard"]
    return [envCrumb, ...rest.split("/").filter(Boolean).map(titleCase)]
  }, [crumbs, pathname, envCrumb])

  return (
    <div
      data-slot="ops-shell"
      className={cn(
        // The ops-console class scopes the paper-* utilities below.
        "ops-console",
        "grid grid-cols-[var(--sidebar-w)_1fr] min-h-screen bg-background text-foreground",
        // Force Paper-Console fonts inside this subtree without touching v6 routes.
        "font-sans",
        className,
      )}
    >
      <Sidebar />
      <div className="flex flex-col min-w-0">
        <OpsTopbar crumbs={resolvedCrumbs} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}

export { OpsShell }
export type { OpsShellProps }
