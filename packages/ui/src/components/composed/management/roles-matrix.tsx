"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { ScrollArea } from "@workspace/ui/components/primitives/scroll-area"
import { ROLE_PERMISSIONS, UserRole } from "@workspace/types"
import {
  RiCheckLine,
  RiCloseLine,
  RiShieldCheckLine,
} from "@workspace/ui/icons"

const PERMISSIONS: { key: keyof PermsRow; label: string }[] = [
  { key: "canViewFinance", label: "View Finance" },
  { key: "canEditManifests", label: "Edit Manifests" },
  { key: "canManageUsers", label: "Manage Users" },
  { key: "canViewAuditLogs", label: "View Audit Logs" },
  { key: "canResolveExceptions", label: "Resolve Exceptions" },
]

interface PermsRow {
  modules: string[]
  canViewFinance: boolean
  canEditManifests: boolean
  canManageUsers: boolean
  canViewAuditLogs: boolean
  canResolveExceptions: boolean
  hubRestriction?: string
  readOnly?: boolean
}

interface RolesMatrixProps {
  /** When true, the matrix renders read-only (default for v1). */
  readOnly?: boolean
  className?: string
}

/**
 * Scaffolded read-only view of the role × permission matrix. Visualizes the
 * hard-coded `ROLE_PERMISSIONS` map from `@workspace/types`.
 *
 * Phase 7 will promote this to a server-backed table with editable cells; for
 * now, the matrix surfaces the canonical configuration so admins can audit it.
 */
export function RolesMatrix({
  readOnly = true,
  className,
}: RolesMatrixProps) {
  const roles = Object.values(UserRole)

  return (
    <section
      data-slot="roles-matrix"
      className={cn("space-y-3", className)}
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">
            Roles & Permissions
          </h2>
          <p className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
            {roles.length} roles · canonical access matrix
          </p>
        </div>
        <Badge
          variant={readOnly ? "secondary" : "default"}
          className="gap-1.5 font-mono"
        >
          <RiShieldCheckLine className="size-3" />
          {readOnly ? "Read only · v1" : "Editable"}
        </Badge>
      </header>

      <ScrollArea className="border border-border bg-background">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
              <th className="sticky left-0 z-10 bg-muted/30 px-3 py-2">Role</th>
              <th className="px-3 py-2">Modules</th>
              {PERMISSIONS.map((p) => (
                <th key={p.key} className="px-3 py-2">
                  {p.label}
                </th>
              ))}
              <th className="px-3 py-2">Hub Restriction</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => {
              const perms = ROLE_PERMISSIONS[role] as unknown as PermsRow
              if (!perms) return null
              const modulesLabel = perms.modules.includes("*")
                ? "All modules"
                : perms.modules.join(", ")
              return (
                <tr
                  key={role}
                  className="border-b border-border/50 last:border-b-0 align-top hover:bg-muted/20"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-mono text-paper-11 font-semibold tracking-widest"
                  >
                    {role}
                  </th>
                  <td className="px-3 py-2 font-mono text-paper-10 uppercase tracking-wide">
                    {modulesLabel}
                  </td>
                  {PERMISSIONS.map((p) => (
                    <td key={p.key} className="px-3 py-2">
                      <PermPill on={Boolean(perms[p.key])} />
                    </td>
                  ))}
                  <td className="px-3 py-2 font-mono text-paper-10 uppercase tracking-wide">
                    {perms.hubRestriction ? (
                      <Badge variant="outline" className="font-mono">
                        {perms.hubRestriction}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </ScrollArea>

      {readOnly && (
        <p className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
          Editing is reserved for Phase 7 — when the role-permissions table
          is promoted from code to the database, with audit logging on every
          change.
        </p>
      )}
    </section>
  )
}

function PermPill({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex size-5 items-center justify-center bg-status-success/20 text-status-success">
      <RiCheckLine className="size-3" />
    </span>
  ) : (
    <span className="inline-flex size-5 items-center justify-center bg-muted text-muted-foreground">
      <RiCloseLine className="size-3" />
    </span>
  )
}
