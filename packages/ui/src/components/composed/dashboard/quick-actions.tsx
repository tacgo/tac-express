"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@workspace/ui/lib/utils"
import {
  RiBox3Fill,
  RiFileList3Fill,
  RiScanFill,
  RiExchangeFundsFill,
  RiAlertFill,
  RiBarChart2Fill,
  RiArrowRightLine,
} from "@workspace/ui/icons"

interface QuickActionDef {
  label: string
  description: string
  href: string
  icon: React.ElementType
  module: string
  gatedRoles?: string[]
}

const ACTIONS: QuickActionDef[] = [
  {
    label: "New Shipment",
    description: "Create an AWB entry",
    href: "/shipments/create",
    icon: RiBox3Fill,
    module: "shipments",
  },
  {
    label: "New Manifest",
    description: "Build & close a manifest",
    href: "/manifests/create",
    icon: RiFileList3Fill,
    module: "manifests",
  },
  {
    label: "Scan Package",
    description: "Barcode scan terminal",
    href: "/scanning",
    icon: RiScanFill,
    module: "scanning",
  },
  {
    label: "Create Invoice",
    description: "Generate invoice from AWB",
    href: "/finance/create",
    icon: RiExchangeFundsFill,
    module: "finance",
  },
  {
    label: "Review Exceptions",
    description: "Resolve open issues",
    href: "/exceptions",
    icon: RiAlertFill,
    module: "exceptions",
  },
  {
    label: "Analytics",
    description: "Trends & performance",
    href: "/analytics",
    icon: RiBarChart2Fill,
    module: "analytics",
  },
]

interface QuickActionsProps {
  canAccessModule?: (module: string) => boolean
  className?: string
}

function QuickActions({ canAccessModule, className }: QuickActionsProps) {
  const visible = canAccessModule ? ACTIONS.filter((a) => canAccessModule(a.module)) : ACTIONS

  return (
    <section
      data-slot="quick-actions"
      className={cn("bg-card p-5 tac-fui-panel", className)}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="t-mono-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Quick Actions
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {visible.map(({ label, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            data-slot="quick-action-card"
            className={cn(
              "group/action relative flex flex-col gap-3 tac-fui-border bg-background p-3.5",
              "tac-fui-hover"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center bg-primary/10 tac-signal-glow">
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <RiArrowRightLine
                className="h-4 w-4 text-primary opacity-0 group-hover/action:opacity-100 transition-opacity translate-x-[-4px] group-hover/action:translate-x-0 duration-200"
                aria-hidden="true"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="t-overline text-foreground">
                {label}
              </span>
              <span className="t-mono-sm text-muted-foreground leading-tight tracking-widest" style={{ fontSize: '0.625rem' }}>
                {description}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export { QuickActions }
