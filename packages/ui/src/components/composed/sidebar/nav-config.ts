import {
  RiDashboardLine,
  RiBox3Line,
  RiFileList3Line,
  RiScanLine,
  RiStore2Line,
  RiAlertLine,
  RiMoneyDollarCircleLine,
  RiTeamLine,
  RiBarChart2Line,
  RiSettingsLine,
  RiNotification3Line,
  RiShieldCheckLine,
  RiCalculatorLine,
  RiCheckboxCircleLine,
  RiHistoryLine,
  RiClipboardLine,
  RiInboxLine,
} from "@workspace/ui/icons"
import type * as React from "react"

/**
 * Sidebar navigation configuration — single source of truth for the
 * unified `<Sidebar>` component.
 *
 * Why this lives here and not in `@workspace/services`: the config carries
 * icon component references (`RiDashboardLine`, …) which would create a
 * `services → ui` import cycle. The shape is plain data and the only
 * UI-package coupling is the icon imports above, so keeping it here is
 * the cleaner boundary.
 *
 * Active-state matching: a route is "active" when its `pathname` either
 * equals `href` or starts with `href + "/"`. There used to be an
 * `altPaths` field that bridged the v6 / Paper Ops shell split — that
 * bridge is no longer needed because the v6 `(dashboard)` route group
 * was deleted in the single-shell migration. Every authenticated route
 * now lives at `/ops-console/*` and the field has been removed.
 */
export type BadgeKey =
  | "openExceptions"
  | "openManifests"
  | "pendingInvoices"
  | "unreadNotifications"

export interface NavItem {
  label: string
  /** Canonical href — always under `/ops-console/*` for authenticated routes. */
  href: string
  icon: React.ElementType
  /**
   * RBAC module gate. `undefined` or `"*"` = always visible regardless of
   * role; any other string is passed to `useRBAC().canAccessModule()`.
   */
  module?: string
  /** Optional live-count badge sourced from `useSidebarBadges()`. */
  badgeKey?: BadgeKey
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

/** Primary navigation — Platform / Operations / Business / Audit & Reports. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Platform",
    items: [
      {
        label: "Dashboard",
        href: "/ops-console",
        icon: RiDashboardLine,
        module: "*",
      },
      {
        label: "Analytics",
        href: "/ops-console/analytics",
        icon: RiBarChart2Line,
        module: "analytics",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Shipments",
        href: "/ops-console/shipments",
        icon: RiBox3Line,
        module: "shipments",
      },
      {
        label: "Manifests",
        href: "/ops-console/manifests",
        icon: RiFileList3Line,
        module: "manifests",
        badgeKey: "openManifests",
      },
      {
        label: "Scanning",
        href: "/ops-console/scanning",
        icon: RiScanLine,
        module: "scanning",
      },
      {
        label: "Inventory",
        href: "/ops-console/inventory",
        icon: RiStore2Line,
        module: "inventory",
      },
      {
        label: "Exceptions",
        href: "/ops-console/exceptions",
        icon: RiAlertLine,
        module: "exceptions",
        badgeKey: "openExceptions",
      },
    ],
  },
  {
    title: "Business",
    items: [
      {
        label: "Finance",
        href: "/ops-console/finance",
        icon: RiMoneyDollarCircleLine,
        module: "finance",
        badgeKey: "pendingInvoices",
      },
      {
        label: "Rate Cards",
        href: "/ops-console/rates",
        icon: RiCalculatorLine,
        module: "finance",
      },
      {
        label: "Customers",
        href: "/ops-console/customers",
        icon: RiTeamLine,
        module: "customers",
      },
      {
        label: "Management",
        href: "/ops-console/management",
        icon: RiShieldCheckLine,
        module: "management",
      },
      {
        // Contact-form lead inbox (WS-4B). `module: "support"` gates the nav
        // to MANAGER+ only — SUPER_ADMIN/ADMIN/MANAGER carry the "*" wildcard;
        // no sub-MANAGER role lists "support", so it stays hidden for them.
        // This mirrors the contact_leads RLS (MANAGER+ select/update).
        label: "Contact Inbox",
        href: "/ops-console/support",
        icon: RiInboxLine,
        module: "support",
      },
    ],
  },
  {
    title: "Audit & Reports",
    items: [
      {
        label: "Arrival Audit",
        href: "/ops-console/arrival-audit",
        icon: RiCheckboxCircleLine,
        module: "*",
      },
      {
        label: "Audit Log",
        href: "/ops-console/audit",
        icon: RiHistoryLine,
        module: "*",
      },
      {
        label: "Shift Report",
        href: "/ops-console/shift-report",
        icon: RiClipboardLine,
        module: "*",
      },
    ],
  },
]

/** Footer items rendered below the primary groups. */
export const FOOTER_ITEMS: NavItem[] = [
  {
    label: "Notifications",
    href: "/ops-console/notifications",
    icon: RiNotification3Line,
    badgeKey: "unreadNotifications",
  },
  {
    label: "Settings",
    href: "/ops-console/settings",
    icon: RiSettingsLine,
  },
]
