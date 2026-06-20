"use client"

import * as React from "react"

import {
  useStaffList,
  useUpdateRole,
  useSetActiveStatus,
} from "@workspace/services/hooks/use-admin"
import {
  useHubs,
  useCreateHub,
  useUpdateHub,
  useToggleHubActive,
} from "@workspace/services/hooks/use-hubs"
import { useNotificationStore } from "@workspace/services/stores/notification.store"
import type { UserRole, HubInput } from "@workspace/types"

import { StaffTable } from "@workspace/ui/components/composed/admin/staff-table"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { HubsManager } from "@workspace/ui/components/composed/management/hubs-manager"
import { RolesMatrix } from "@workspace/ui/components/composed/management/roles-matrix"
import { StaffStats } from "@workspace/ui/components/composed/management/staff-stats"
import {
  InviteStaffDialog,
  type InviteStaffValues,
} from "@workspace/ui/components/composed/management/invite-staff-dialog"
import { Button } from "@workspace/ui/components/button"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/primitives/tabs"
import {
  RiTeamLine,
  RiBuilding4Line,
  RiCalculatorLine,
  RiShieldCheckLine,
  RiUserAddLine,
} from "@workspace/ui/icons"

export function ManagementClient() {
  const { data: staff, isLoading: staffLoading } = useStaffList()
  const updateRole = useUpdateRole()
  const setActiveStatus = useSetActiveStatus()
  const addNotification = useNotificationStore((s) => s.addNotification)

  const { data: rawHubs, isLoading: hubsLoading } = useHubs(false)
  const hubs = React.useMemo(() => rawHubs ?? [], [rawHubs])
  const createHub = useCreateHub()
  const updateHub = useUpdateHub()
  const toggleHubActive = useToggleHubActive()

  const [inviteOpen, setInviteOpen] = React.useState(false)

  function handleInvite(input: InviteStaffValues) {
    // Email-based admin invitation requires Supabase's admin auth API which
    // needs a server-side service-role key; that wiring is being scoped in
    // a follow-up PR. The dialog already collects the right shape, so the
    // client integration becomes a one-line swap when the server action
    // lands. For now we surface an honest "captured, delivery pending"
    // notification rather than fake a success.
    //
    // Email is masked before it reaches the in-memory notification store
    // — the store is exposed in the notification panel + persisted in
    // session history, and surfacing full email PII there for transient
    // confirmations is unnecessary risk.
    const maskedEmail = input.email.replace(
      /^(.).*?(@.*)$/,
      (_, first: string, domain: string) => `${first}***${domain}`,
    )
    addNotification({
      type: "info",
      title: "Invitation captured",
      message: `${maskedEmail} · ${input.role}${
        input.hubCode ? ` · ${input.hubCode}` : ""
      }. Email delivery via the Supabase admin API is configured in a follow-up PR.`,
    })
    setInviteOpen(false)
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    try {
      await updateRole.mutateAsync({ userId, role })
      addNotification({ type: "success", title: "Role updated", message: role })
    } catch (err) {
      addNotification({
        type: "error",
        title: "Failed to update role",
        message: String(err),
      })
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    try {
      await setActiveStatus.mutateAsync({ userId, isActive })
      addNotification({
        type: "success",
        title: isActive ? "User activated" : "User deactivated",
        message: userId,
      })
    } catch (err) {
      addNotification({ type: "error", title: "Failed", message: String(err) })
    }
  }

  async function handleCreateHub(input: HubInput) {
    try {
      await createHub.mutateAsync(input)
      addNotification({
        type: "success",
        title: "Hub created",
        message: `${input.code} · ${input.name}`,
      })
    } catch (err) {
      addNotification({
        type: "error",
        title: "Failed to create hub",
        message: String(err),
      })
    }
  }

  async function handleUpdateHub(id: string, patch: Partial<HubInput>) {
    try {
      await updateHub.mutateAsync({ id, patch })
      addNotification({
        type: "success",
        title: "Hub updated",
        message: patch.name ?? id,
      })
    } catch (err) {
      addNotification({
        type: "error",
        title: "Failed to update hub",
        message: String(err),
      })
    }
  }

  async function handleToggleHubActive(id: string, isActive: boolean) {
    try {
      await toggleHubActive.mutateAsync({ id, isActive })
      addNotification({
        type: "success",
        title: isActive ? "Hub activated" : "Hub deactivated",
        message: id,
      })
    } catch (err) {
      addNotification({
        type: "error",
        title: isActive
          ? "Failed to activate hub"
          : "Failed to deactivate hub",
        message: String(err),
      })
    }
  }

  const hubOptions = React.useMemo(
    () =>
      hubs
        .filter((h) => h.isActive)
        .map((h) => ({ value: h.code, label: `${h.code} · ${h.name}` })),
    [hubs],
  )

  return (
    <PageShell width="wide">
      <PageHeader
        overline="Administration"
        title="Operations & Access"
        description="Staff, hubs, tariffs, and role-based permissions in one place."
        actions={
          <Button
            type="button"
            size="sm"
            onClick={() => setInviteOpen(true)}
          >
            <RiUserAddLine aria-hidden="true" />
            <span className="ml-1.5 font-mono uppercase tracking-wider">
              Invite staff
            </span>
          </Button>
        }
      />

      <Tabs defaultValue="staff">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="staff">
            <RiTeamLine />
            Staff
          </TabsTrigger>
          <TabsTrigger value="hubs">
            <RiBuilding4Line />
            Hubs
          </TabsTrigger>
          <TabsTrigger value="tariffs">
            <RiCalculatorLine />
            Tariffs
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <RiShieldCheckLine />
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4 pt-4">
          {/* Gate the KPI strip on staffLoading — passing `staff ?? []`
              would render zero counts before the query resolves, which
              reads as a misleading "0 staff, 0 active" admin state. */}
          {staffLoading ? null : <StaffStats staff={staff ?? []} />}
          <StaffTable
            staff={staff ?? []}
            isLoading={staffLoading}
            onRoleChange={handleRoleChange}
            onToggleActive={handleToggleActive}
          />
        </TabsContent>

        <TabsContent value="hubs" className="pt-4">
          <HubsManager
            hubs={hubs}
            loading={hubsLoading}
            onCreate={handleCreateHub}
            onUpdate={handleUpdateHub}
            onToggleActive={handleToggleHubActive}
          />
        </TabsContent>

        <TabsContent value="tariffs" className="pt-4">
          <EmptyState
            icon={<RiCalculatorLine />}
            title="Tariffs & Rate Cards"
            description="Slab-based rate-card editor with peak/fuel/remote-area surcharges lights up in Phase 5.5."
          />
        </TabsContent>

        <TabsContent value="permissions" className="pt-4">
          <RolesMatrix />
        </TabsContent>
      </Tabs>

      <InviteStaffDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        hubOptions={hubOptions}
        onInvite={handleInvite}
      />
    </PageShell>
  )
}

