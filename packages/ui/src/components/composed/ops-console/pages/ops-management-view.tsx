"use client"

// NOTE FOR FUTURE READERS:
// The PRODUCTION ops-console management route at /ops-console/management is
// rendered by apps/dashboard/app/ops-console/management/management-client.tsx,
// which uses a different component composition (StaffTable + InviteStaffDialog
// + full @workspace/services hooks). That route is fully wired and live.
//
// This OpsManagementView component is a parallel paper-style design variant
// kept in @workspace/ui for design-system reference and potential future use.
// Issue #54 asked for the callbacks below to be wired so this component is
// not a footgun if someone adopts it. The wiring matches the parent
// callback shape used by management-client.tsx (onRoleChange(email, role)
// + onInvite()) so adoption would be straightforward.

import * as React from "react"

import { RiUserAddLine } from "@workspace/ui/icons"
import { OpsFrame } from "../ops-frame"
import { OpsPageHead } from "../ops-page-head"
import { OpsButton } from "../ops-button"
import { OpsBadge } from "../ops-badge"
import { OpsCard } from "../ops-card"
import { OpsTabs } from "../ops-tabs"
import { OpsFieldSelect } from "../ops-field"
import {
  OpsTable,
  OpsTableHead,
  OpsTableBody,
  OpsTableRow,
  OpsTableHeader,
  OpsTableCell,
} from "../ops-table"

interface StaffRow {
  name: string
  email: string
  role: "SUPER_ADMIN" | "OPERATOR"
  hub?: string
  active: boolean
}

interface OpsManagementViewProps {
  totalStaff: number
  active: number
  inactive: number
  hubsCovered: number
  staff: StaffRow[]
  /**
   * Fires when the operator picks a different role for a staff row.
   * Receives the row's email (stable identifier in this view) and the
   * newly-selected role string. The string is narrowed to the StaffRow
   * `role` union by the consumer.
   */
  onRoleChange?: (email: string, role: StaffRow["role"]) => void
  /**
   * Fires when the operator clicks "Invite Staff" in the page header.
   * The consumer typically opens a modal/sheet collecting email + role + hub.
   * If omitted, the button is rendered disabled with a tooltip explaining
   * the action is not yet wired (per #54 acceptance criteria).
   */
  onInvite?: () => void
}

const TABS = ["Staff", "Hubs", "Tariffs", "Permissions"] as const

function OpsManagementView({
  totalStaff,
  active,
  inactive,
  hubsCovered,
  staff,
  onRoleChange,
  onInvite,
}: OpsManagementViewProps) {
  const [tab, setTab] = React.useState<string>("Staff")
  const stats: Array<[label: string, value: number]> = [
    ["Total Staff", totalStaff],
    ["Active", active],
    ["Inactive", inactive],
    ["Hubs Covered", hubsCovered],
  ]

  return (
    <OpsFrame>
      <OpsPageHead
        eyebrow="Administration"
        title="Operations & Access"
        sub="Staff, hubs, tariffs, and role-based permissions in one place."
        actions={
          <OpsButton
            variant="primary"
            type="button"
            onClick={onInvite}
            disabled={!onInvite}
            title={onInvite ? undefined : "Invite flow not wired by parent"}
            aria-label="Invite Staff"
          >
            <RiUserAddLine aria-hidden className="size-3" />
            Invite Staff
          </OpsButton>
        }
      />
      <OpsTabs items={[...TABS]} value={tab} onChange={setTab} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {stats.map(([label, value]) => (
          <OpsCard key={label}>
            <div className="paper-label">{label}</div>
            <div className="paper-stat-value mt-2">{value}</div>
          </OpsCard>
        ))}
      </div>

      <OpsTable>
        <OpsTableHead>
          <tr>
            <OpsTableHeader>Name</OpsTableHeader>
            <OpsTableHeader>Email</OpsTableHeader>
            <OpsTableHeader>Role</OpsTableHeader>
            <OpsTableHeader>Hub</OpsTableHeader>
            <OpsTableHeader>Status</OpsTableHeader>
          </tr>
        </OpsTableHead>
        <OpsTableBody>
          {staff.map((s) => (
            <OpsTableRow key={s.email}>
              <OpsTableCell mono className="font-bold uppercase">
                {s.name}
              </OpsTableCell>
              <OpsTableCell mono>{s.email}</OpsTableCell>
              <OpsTableCell>
                <OpsFieldSelect
                  value={s.role}
                  onChange={(e) =>
                    onRoleChange?.(s.email, e.target.value as StaffRow["role"])
                  }
                  aria-label={`Role for ${s.name}`}
                  className="w-40 py-1.5 px-2.5"
                >
                  <option>SUPER_ADMIN</option>
                  <option>OPERATOR</option>
                </OpsFieldSelect>
              </OpsTableCell>
              <OpsTableCell mono muted>
                {s.hub ?? "—"}
              </OpsTableCell>
              <OpsTableCell>
                <OpsBadge tone={s.active ? "violet" : "neutral"}>
                  {s.active ? "Active" : "Inactive"}
                </OpsBadge>
              </OpsTableCell>
            </OpsTableRow>
          ))}
        </OpsTableBody>
      </OpsTable>
    </OpsFrame>
  )
}

export { OpsManagementView }
export type { OpsManagementViewProps, StaffRow }
