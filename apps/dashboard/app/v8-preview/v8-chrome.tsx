"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  RiDashboardLine,
  RiBox3Line,
  RiTruckLine,
  RiFlightTakeoffLine,
  RiFileList3Line,
  RiSettingsLine,
  RiNotification3Line,
  RiAddLine,
} from "@workspace/ui/icons"

/**
 * V8Chrome — the shared shell (slim icon sidebar + pill-tab topbar) for the
 * v8 spike dashboard, so the overview and the invoice workflow live inside one
 * navigable surface. Client component for `usePathname` active states; receives
 * the route's content as `children`. Scoped styling comes from the layout's
 * `.dashboard-v8` wrapper + v8.css.
 */

const SIDE = [
  { label: "Dashboard", href: "/v8-preview", Icon: RiDashboardLine },
  {
    label: "Shipments",
    href: "/v8-preview",
    Icon: RiBox3Line,
    decorative: true,
  },
  { label: "Fleet", href: "/v8-preview", Icon: RiTruckLine, decorative: true },
  {
    label: "Air cargo",
    href: "/v8-preview",
    Icon: RiFlightTakeoffLine,
    decorative: true,
  },
  { label: "Invoices", href: "/v8-preview/invoice", Icon: RiFileList3Line },
]

const TABS = [
  { label: "Overview", href: "/v8-preview" },
  { label: "Invoices", href: "/v8-preview/invoice" },
  { label: "Shipments", href: "/v8-preview", decorative: true },
  { label: "Analytics", href: "/v8-preview", decorative: true },
  { label: "Fleet", href: "/v8-preview", decorative: true },
]

export function V8Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = (href: string, decorative?: boolean) =>
    !decorative && pathname === href

  return (
    <div className="v8-shell">
      <aside className="v8-sidebar">
        {SIDE.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-label={item.label}
            className="v8-side-btn"
            data-active={
              isActive(item.href, item.decorative) ? "true" : undefined
            }
          >
            <item.Icon className="size-5" />
          </Link>
        ))}
        <Link
          href="/v8-preview"
          aria-label="Settings"
          className="v8-side-btn"
          style={{ marginTop: "auto" }}
        >
          <RiSettingsLine className="size-5" />
        </Link>
      </aside>

      <div>
        <header className="v8-topbar">
          <nav className="v8-tabs">
            {TABS.map((t) => (
              <Link
                key={t.label}
                href={t.href}
                className="v8-tab"
                data-active={
                  isActive(t.href, t.decorative) ? "true" : undefined
                }
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/v8-preview/invoice" className="v8-pill">
              <RiAddLine className="size-4" /> New invoice
            </Link>
            <div className="v8-icon-btn" aria-label="Notifications">
              <RiNotification3Line className="size-5" />
            </div>
            <div className="v8-avatar" style={{ width: 44, height: 44 }}>
              TA
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}
