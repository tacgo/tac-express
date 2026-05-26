"use client"



import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"
import { useRBAC } from "@workspace/ui/hooks/use-rbac"
import { useSession } from "@workspace/ui/hooks/use-session"
import { useSidebarBadges } from "@workspace/services/hooks/use-dashboard"
import { useUnreadNotificationCount } from "@workspace/services/hooks/use-notifications"
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiMenuLine,
  RiUserLine,
} from "@workspace/ui/icons"
import { Button } from "@workspace/ui/components/button"

import {
  NAV_GROUPS,
  FOOTER_ITEMS,
  type NavItem,
  type NavGroup,
  type BadgeKey,
} from "./nav-config"

/**
 * Sidebar — single primary navigation surface, shared between the v6
 * dashboard shell and the Paper Ops Console shell.
 *
 * Theming: reads `--sidebar-*` CSS custom properties (defined globally in
 * `globals.css`). When mounted inside the `.ops-console` scope those
 * variables get overridden to the `--paper-*` palette, so the same
 * component renders in either shell without prop-level branching.
 *
 * Replaces:
 *   - `packages/ui/src/components/composed/dashboard-sidebar.tsx`
 *   - `packages/ui/src/components/composed/ops-console/ops-sidebar.tsx`
 *
 * Both deleted in the same refactor — the alignment work in the previous
 * audits is now encoded as the spec this component renders.
 */

function formatBadge(n: number | undefined): string | null {
  if (typeof n !== "number" || n <= 0) return null
  return n > 99 ? "99+" : String(n)
}

function isItemActive(pathname: string, item: NavItem): boolean {
  // Dashboard root is a prefix of every ops-console route — match it
  // exactly, otherwise every /ops-console/foo path would highlight it.
  if (item.href === "/ops-console") {
    return pathname === "/ops-console"
  }
  if (pathname === item.href) return true
  if (pathname.startsWith(item.href + "/")) return true
  return false
}

function SidebarBadge({
  count,
  label,
}: {
  count: string
  label: string
}) {
  return (
    <span
      data-slot="sidebar-badge"
      aria-label={`${count} pending ${label}`}
      className={cn(
        "ml-auto inline-flex min-w-[length:var(--badge-min-w)] h-4 items-center justify-center px-1.5",
        "font-mono text-3xs font-semibold tracking-wider tabular-nums",
        "bg-sidebar-primary text-sidebar-primary-foreground",
      )}
    >
      {count}
    </span>
  )
}

function SidebarItem({
  item,
  active,
  collapsed,
  badgeOverride,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  badgeOverride?: string | null
}) {
  const Icon = item.icon
  const badge = badgeOverride ?? null
  return (
    <Link
      href={item.href}
      data-slot="sidebar-item"
      data-active={active || undefined}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group/sidebar-item relative flex items-center gap-2.5 px-4 py-2",
        "font-mono text-xs font-medium tracking-badge uppercase",
        "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        "focus-visible:outline-none focus-visible:tac-focus-premium",
        "transition-colors duration-fast ease-linear",
        // Active nav: text-primary on bg-sidebar-accent — semantic Violet Grid
        // tokens (post paper-* migration), tuned for AA contrast (R0 audit C2).
        active && "bg-sidebar-accent text-primary",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[length:var(--indicator-w)] bg-sidebar-primary"
        />
      )}
      <Icon aria-hidden className="size-4 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && badge && <SidebarBadge count={badge} label={item.label} />}
      {/* Dot indicator when collapsed + badge present */}
      {collapsed && badge && (
        <span
          aria-hidden
          className="absolute right-1.5 top-1.5 size-1.5 bg-sidebar-primary"
        />
      )}
    </Link>
  )
}

function SidebarGroup({
  group,
  collapsed,
  badges,
  canAccess,
}: {
  group: NavGroup
  collapsed: boolean
  badges: Record<BadgeKey, string | null>
  canAccess: (module: string) => boolean
}) {
  // All hooks must run in the same order on every render — keep them at
  // the top of the function, before any early-return branches.
  const [open, setOpen] = React.useState(true)
  const pathname = usePathname()

  const items = group.items.filter((item) => {
    if (!item.module || item.module === "*") return true
    return canAccess(item.module)
  })

  if (items.length === 0) return null

  return (
    <div data-slot="sidebar-group">
      {!collapsed && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={cn(
            "flex h-auto w-full items-center justify-between px-[length:var(--spacing-gutter-md)] py-1 mt-2",
            "font-mono text-3xs font-medium tracking-eyebrow uppercase",
            "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-transparent",
            "focus-visible:tac-focus-premium",
            "transition-colors duration-fast ease-linear",
          )}
        >
          <span className="flex items-center gap-1.5">
            <span className="text-sidebar-primary/50">{"//"}</span>
            <span>{group.title}</span>
          </span>
          <RiArrowDownSLine
            aria-hidden
            className={cn(
              "size-3 text-sidebar-foreground/65 transition-transform",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
        </Button>
      )}
      {open &&
        items.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={isItemActive(pathname ?? "", item)}
            collapsed={collapsed}
            badgeOverride={item.badgeKey ? badges[item.badgeKey] : null}
          />
        ))}
    </div>
  )
}

export interface SidebarProps {
  /**
   * Enables the collapse toggle. Defaults to `false` — both current shells
   * render a fixed-width sidebar. Pass `true` to opt back into the
   * collapsing variant that the legacy v6 sidebar used.
   */
  collapsible?: boolean
}

export function Sidebar({ collapsible = false }: SidebarProps = {}) {
  const pathname = usePathname() ?? ""
  const rbac = useRBAC()
  const { user } = useSession()
  const { data: sidebarBadges } = useSidebarBadges()
  const { data: unreadCount } = useUnreadNotificationCount(user?.id)
  const [collapsed, setCollapsed] = React.useState(false)

  const badges = React.useMemo<Record<BadgeKey, string | null>>(
    () => ({
      openExceptions: formatBadge(sidebarBadges?.openExceptions),
      openManifests: formatBadge(sidebarBadges?.openManifests),
      pendingInvoices: formatBadge(sidebarBadges?.pendingInvoices),
      unreadNotifications: formatBadge(unreadCount),
    }),
    [sidebarBadges, unreadCount],
  )

  const canAccess = React.useCallback(
    (module: string) => {
      // While RBAC is hydrating, default to permissive so the sidebar
      // doesn't flash empty groups during initial load.
      if (rbac.isLoading) return true
      if (!rbac.role) return false
      return rbac.canAccessModule(module)
    },
    [rbac],
  )

  // Footer items use the same active rule + RBAC pipeline.
  const footerItems = FOOTER_ITEMS.filter((item) => {
    if (!item.module || item.module === "*") return true
    return canAccess(item.module)
  })

  return (
    <aside
      data-slot="sidebar"
      aria-label="Primary navigation"
      className={cn(
        "flex flex-col h-screen sticky top-0",
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        "transition-[width] duration-200 ease-linear",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Wordmark */}
      <div className="relative flex items-start gap-1.5 p-4 border-b border-sidebar-border">
        {!collapsed ? (
          <>
            <div className="min-w-0 flex-1">
              <Link
                href="/ops-console"
                className="block focus-visible:outline-none focus-visible:tac-focus-premium"
                aria-label="TAC Express dashboard home"
              >
                <div className="font-mono font-extrabold text-base leading-none tracking-tight flex items-baseline">
                  <span className="text-sidebar-foreground">TAC</span>
                  <span className="ml-1.5 text-primary">
                    EXPRESS →
                  </span>
                </div>
                <p className="font-mono text-3xs tracking-subtitle uppercase text-sidebar-foreground/70 truncate mt-1.5">
                  imphal // prod
                </p>
              </Link>
            </div>
            {collapsible && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
                className={cn(
                  "size-[22px] shrink-0",
                  "border border-sidebar-border bg-sidebar text-sidebar-foreground/70",
                  "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  "focus-visible:tac-focus-premium",
                )}
              >
                <RiArrowRightSLine aria-hidden className="size-3" />
              </Button>
            )}
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className={cn(
              "mx-auto size-8",
              "bg-sidebar-primary text-sidebar-primary-foreground border border-sidebar-border",
              "hover:opacity-90 hover:bg-sidebar-primary focus-visible:tac-focus-premium",
            )}
          >
            <span className="font-mono font-extrabold text-xs">TAC</span>
          </Button>
        )}
      </div>

      {/* Primary nav groups */}
      <nav
        data-slot="sidebar-nav"
        aria-label="Primary navigation"
        className="flex-1 py-3 overflow-y-auto"
      >
        {NAV_GROUPS.map((group) => (
          <SidebarGroup
            key={group.title}
            group={group}
            collapsed={collapsed}
            badges={badges}
            canAccess={canAccess}
          />
        ))}
      </nav>

      {/* Footer items */}
      <div
        data-slot="sidebar-footer"
        className="border-t border-sidebar-border py-2.5"
      >
        {footerItems.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={isItemActive(pathname, item)}
            collapsed={collapsed}
            badgeOverride={item.badgeKey ? badges[item.badgeKey] : null}
          />
        ))}
      </div>

      {/* User profile */}
      {!collapsed && (
        <div className="flex items-center gap-2.5 px-4 py-3 border-t border-sidebar-border">
          <div
            className={cn(
              "size-8 shrink-0 grid place-items-center",
              "bg-sidebar-primary text-sidebar-primary-foreground border border-sidebar-border",
            )}
            aria-hidden
          >
            {rbac.name ? (
              <span className="font-mono font-semibold text-xs">
                {rbac.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <RiUserLine className="size-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-xs font-medium tracking-nav uppercase text-sidebar-foreground truncate">
              {rbac.name || "Operator"}
            </div>
            <div className="font-mono text-3xs tracking-eyebrow uppercase text-sidebar-primary truncate mt-0.5">
              {rbac.role?.replace(/_/g, " ") ?? "guest"}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="User menu"
            className={cn(
              "text-sidebar-foreground/70 hover:text-sidebar-foreground",
              "focus-visible:tac-focus-premium",
            )}
          >
            <RiMenuLine aria-hidden className="size-4" />
          </Button>
        </div>
      )}
    </aside>
  )
}
