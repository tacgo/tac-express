"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"
import { useHubConfig } from "@workspace/ui/lib/hub-config"
import {
  RiKeyboardLine,
  RiKey2Line,
  RiSendPlaneLine,
  RiArrowRightLine,
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiCheckLine,
  RiCloseLine,
  RiArrowGoBackLine,
} from "@workspace/ui/icons"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { SurfaceCard } from "@workspace/ui/components/composed/surface-card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import { Badge } from "@workspace/ui/components/primitives/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/primitives/tabs"

/**
 * V7OpsSettings — Violet Grid v7 layout for the Settings route.
 *
 * Replaces the Paper Ops Console `OpsSettingsView`. Tabs use Radix Tabs
 * via the v7 primitives. The hub-config section (`HubsSection` below) is
 * a faithful migration of the v6 `OpsHubsSection` behavior — it still
 * reads/writes `tac-hub-config-v1` localStorage via the same
 * `useHubConfig` hook.
 *
 * The profile inputs remain non-submitting (matching v6 behavior) — wiring
 * an actual save handler is a separate ticket.
 */

interface V7OpsSettingsProps {
  email: string
  displayName: string
  hubCode: string
  completionPct: number
  pendingItems: string[]
  version: string
  environment: string
  discoveredHubs?: string[]
  className?: string
}

const TABS = [
  "Profile",
  "Hubs",
  "Security",
  "Theme",
  "Integrations",
  "Audit",
] as const

const SHORTCUTS: Array<[label: string, keys: string[]]> = [
  ["Open search", ["⌘", "K"]],
  ["Toggle theme", ["⌘", "⇧", "L"]],
  ["Notifications", ["⌘", "⇧", "N"]],
  ["Sign out", ["⌘", "⇧", "Q"]],
]

function V7OpsSettings({
  email,
  displayName,
  hubCode,
  completionPct,
  pendingItems,
  version,
  environment,
  discoveredHubs = [],
  className,
}: V7OpsSettingsProps) {
  return (
    <PageShell width="wide" className={cn(className)}>
      <PageHeader
        overline="Account"
        title="Settings"
        description="Manage your profile, security, theme, and integrations."
      />

      <Tabs defaultValue="Profile" className="gap-4">
        <TabsList className="flex-wrap h-auto">
          {TABS.map((label) => (
            <TabsTrigger key={label} value={label}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Profile tab ── */}
        <TabsContent value="Profile">
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-card-gap">
            <SurfaceCard title="Profile" eyebrow="Account">
              <div className="flex flex-col gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="settings-email">Email</Label>
                  <Input
                    id="settings-email"
                    defaultValue={email.toUpperCase()}
                    readOnly
                    className="h-9 font-mono uppercase"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="settings-name">Display name</Label>
                  <Input
                    id="settings-name"
                    placeholder="Type your name"
                    defaultValue={displayName}
                    className="h-9"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="settings-hub">Hub code</Label>
                  <Input
                    id="settings-hub"
                    placeholder="e.g. IMPHAL"
                    defaultValue={hubCode}
                    className="h-9 font-mono uppercase"
                  />
                </div>
                <div className="flex justify-end mt-1.5">
                  <Button type="button" size="sm">
                    Save changes
                  </Button>
                </div>
              </div>
            </SurfaceCard>

            <div className="flex flex-col gap-card-gap">
              <SurfaceCard
                density="compact"
                title={`${completionPct}% complete`}
                eyebrow="Profile completion"
                subtitle={`${pendingItems.length} pending`}
              >
                <div className="h-1 w-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${completionPct}%`,
                      transitionDuration: "var(--duration-base)",
                    }}
                  />
                </div>
                <ul className="mt-3 flex flex-col gap-1">
                  {pendingItems.map((p) => (
                    <li
                      key={p}
                      className="t-mono-sm text-muted-foreground inline-flex items-center gap-2"
                    >
                      <span aria-hidden className="size-1.5 bg-muted-foreground" />
                      {p}
                    </li>
                  ))}
                  {pendingItems.length === 0 && (
                    <li className="t-mono-sm text-accent-success inline-flex items-center gap-2">
                      <RiCheckLine className="size-3.5" aria-hidden />
                      All fields filled
                    </li>
                  )}
                </ul>
              </SurfaceCard>

              <SurfaceCard
                density="compact"
                title="Keyboard shortcuts"
                eyebrow={
                  <span className="inline-flex items-center gap-1.5">
                    <RiKeyboardLine aria-hidden className="size-3.5" />
                    Quick keys
                  </span>
                }
              >
                <ul className="flex flex-col gap-2">
                  {SHORTCUTS.map(([label, keys]) => (
                    <li
                      key={label}
                      className="flex items-center justify-between"
                    >
                      <span className="font-mono uppercase text-2xs tracking-nav text-muted-foreground">
                        {label}
                      </span>
                      <span className="flex items-center gap-1">
                        {keys.map((k) => (
                          <kbd
                            key={k}
                            className="inline-flex h-5 min-w-5 items-center justify-center border border-border bg-background px-1 font-mono text-2xs leading-none text-foreground"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </SurfaceCard>

              <SurfaceCard density="compact" title="System information">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="tac-mono-label">Version</span>
                    <span className="t-mono-sm">{version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="tac-mono-label">Environment</span>
                    <span className="t-mono-sm">{environment}</span>
                  </div>
                </div>
              </SurfaceCard>
            </div>
          </div>
        </TabsContent>

        {/* ── Hubs tab ── */}
        <TabsContent value="Hubs">
          <HubsSection discoveredHubs={discoveredHubs} />
        </TabsContent>

        {/* ── Integrations tab ── */}
        <TabsContent value="Integrations">
          <SurfaceCard title="Integrations" eyebrow="Connect">
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              <li>
                <Link
                  href="/ops-console/settings/api-keys"
                  className="flex items-center gap-3 py-3 px-1 hover:bg-muted transition-colors duration-fast ease-linear focus-visible:outline-none focus-visible:tac-focus-premium"
                >
                  <RiKey2Line aria-hidden className="size-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="t-body-sm font-semibold">API keys</div>
                    <div className="tac-mono-label mt-0.5">
                      Service tokens &amp; access control
                    </div>
                  </div>
                  <RiArrowRightLine
                    aria-hidden
                    className="size-3.5 text-muted-foreground"
                  />
                </Link>
              </li>
              <li>
                <Link
                  href="/ops-console/settings/webhooks"
                  className="flex items-center gap-3 py-3 px-1 hover:bg-muted transition-colors duration-fast ease-linear focus-visible:outline-none focus-visible:tac-focus-premium"
                >
                  <RiSendPlaneLine aria-hidden className="size-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="t-body-sm font-semibold">Webhooks</div>
                    <div className="tac-mono-label mt-0.5">
                      Event subscriptions &amp; delivery logs
                    </div>
                  </div>
                  <RiArrowRightLine
                    aria-hidden
                    className="size-3.5 text-muted-foreground"
                  />
                </Link>
              </li>
            </ul>
          </SurfaceCard>
        </TabsContent>

        {/* ── Audit tab ── */}
        <TabsContent value="Audit">
          <SurfaceCard title="Audit log" eyebrow="Compliance">
            <p className="t-body-sm mb-4">
              Compliance + activity history for this account and the organization.
            </p>
            <Link
              href="/ops-console/audit"
              className="inline-flex items-center gap-1.5 tac-mono-label hover:underline focus-visible:outline-none focus-visible:tac-focus-premium"
            >
              Open audit log
              <RiArrowRightLine aria-hidden className="size-3.5" />
            </Link>
          </SurfaceCard>
        </TabsContent>

        {/* ── Security tab (placeholder) ── */}
        <TabsContent value="Security">
          <SurfaceCard title="Security" eyebrow="Coming soon">
            <p className="t-body-sm text-muted-foreground">
              Password rotation, 2FA setup, and session management ship in the
              next sprint. For account recovery, contact your administrator.
            </p>
          </SurfaceCard>
        </TabsContent>

        {/* ── Theme tab (placeholder) ── */}
        <TabsContent value="Theme">
          <SurfaceCard title="Theme" eyebrow="Coming soon">
            <p className="t-body-sm text-muted-foreground">
              Theme is controlled by the C / M / S toggle in the top bar. A
              persistent per-user theme preference lands in the next sprint.
            </p>
          </SurfaceCard>
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}

/**
 * HubsSection — local hub-config manager (configured + external hubs).
 *
 * Direct migration of the v6 `OpsHubsSection`. State + persistence are
 * untouched (`useHubConfig` → `tac-hub-config-v1` localStorage); only
 * the chrome moves from Ops* primitives to v7 primitives.
 */
function HubsSection({
  discoveredHubs = [],
}: {
  discoveredHubs?: string[]
}) {
  const config = useHubConfig()
  const [newHub, setNewHub] = React.useState("")
  const [addError, setAddError] = React.useState<string | null>(null)
  const [editingHub, setEditingHub] = React.useState<string | null>(null)
  const [draftLabel, setDraftLabel] = React.useState("")
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null)

  const hiddenSet = React.useMemo(() => new Set(config.hidden), [config.hidden])
  const configuredSet = React.useMemo(() => new Set(config.hubs), [config.hubs])
  const visibleHubs = React.useMemo<string[]>(() => {
    const ordered: string[] = []
    const seen = new Set<string>()
    for (const code of config.hubs) {
      if (hiddenSet.has(code)) continue
      ordered.push(code)
      seen.add(code)
    }
    for (const code of discoveredHubs) {
      if (hiddenSet.has(code) || seen.has(code)) continue
      ordered.push(code)
      seen.add(code)
    }
    return ordered
  }, [config.hubs, discoveredHubs, hiddenSet])

  function handleAdd() {
    setAddError(null)
    if (!newHub.trim()) {
      setAddError("Enter a hub code first.")
      return
    }
    const added = config.addHub(newHub)
    if (!added) {
      setAddError("Hub already exists in your list.")
      return
    }
    setNewHub("")
  }

  function startEdit(code: string) {
    setEditingHub(code)
    setDraftLabel(config.labelFor(code))
  }
  function commitEdit(code: string) {
    config.renameHub(code, draftLabel)
    setEditingHub(null)
  }
  function cancelEdit() {
    setEditingHub(null)
  }

  function confirmDelete(code: string) {
    if (pendingDelete === code) {
      config.removeHub(code)
      setPendingDelete(null)
    } else {
      setPendingDelete(code)
      globalThis.setTimeout(() => {
        setPendingDelete((prev) => (prev === code ? null : prev))
      }, 3000)
    }
  }

  const renamedCount = Object.keys(config.renames).length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-card-gap">
      <SurfaceCard title="Hubs in your network" eyebrow="Network">
        {/* Add new hub */}
        <div className="flex items-end gap-2 pb-3 border-b border-border">
          <div className="flex-1 grid gap-1.5">
            <Label htmlFor="hub-add">Add a hub</Label>
            <Input
              id="hub-add"
              placeholder="e.g. MUMBAI"
              value={newHub}
              onChange={(e) => {
                setNewHub(e.target.value)
                if (addError) setAddError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              aria-describedby={addError ? "hub-add-error" : undefined}
              aria-invalid={addError ? true : undefined}
              className="h-9 font-mono uppercase"
            />
          </div>
          <Button onClick={handleAdd} size="sm">
            <RiAddLine aria-hidden className="size-3.5" />
            Add hub
          </Button>
        </div>
        {addError ? (
          <p
            id="hub-add-error"
            role="alert"
            className="tac-mono-label text-destructive mt-2"
          >
            {addError}
          </p>
        ) : null}

        {/* Current hub list */}
        <ul className="mt-1 divide-y divide-border">
          {!config.hydrated && (
            <li className="py-3 tac-mono-label text-muted-foreground">
              Loading…
            </li>
          )}
          {config.hydrated && visibleHubs.length === 0 && (
            <li className="py-3 tac-mono-label text-muted-foreground">
              No hubs visible. Add one above, or unhide one below.
            </li>
          )}
          {visibleHubs.map((code) => {
            const isEditing = editingHub === code
            const isPendingDelete = pendingDelete === code
            const renamed = code in config.renames
            const isExternal = !configuredSet.has(code)
            const display = config.labelFor(code)
            return (
              <li
                key={code}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Input
                        type="text"
                        value={draftLabel}
                        onChange={(e) => setDraftLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(code)
                          if (e.key === "Escape") cancelEdit()
                        }}
                        autoFocus
                        aria-label={`Rename hub ${code}`}
                        className="h-8 min-w-0 flex-1 font-mono tracking-badge"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => commitEdit(code)}
                        aria-label="Save"
                        className="text-accent-success hover:bg-accent-success/15 h-7 w-7"
                      >
                        <RiCheckLine className="size-3.5" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={cancelEdit}
                        aria-label="Cancel"
                        className="text-muted-foreground h-7 w-7"
                      >
                        <RiCloseLine className="size-3.5" aria-hidden />
                      </Button>
                    </>
                  ) : (
                    <div className="min-w-0">
                      <div className="t-body-sm font-semibold text-foreground truncate">
                        {display}
                      </div>
                      <div className="tac-mono-label mt-0.5 truncate">
                        {code}
                        {isExternal ? " · external" : ""}
                        {renamed ? " · renamed" : ""}
                      </div>
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(code)}
                      aria-label={`Rename ${display}`}
                      className="text-muted-foreground hover:text-primary h-7 w-7"
                    >
                      <RiEditLine className="size-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDelete(code)}
                      aria-label={
                        isPendingDelete
                          ? `Confirm delete ${display}`
                          : `Delete ${display}`
                      }
                      className={cn(
                        "h-7 w-7",
                        isPendingDelete
                          ? "text-destructive bg-destructive/15"
                          : "text-muted-foreground hover:text-destructive",
                      )}
                    >
                      <RiDeleteBinLine className="size-3.5" aria-hidden />
                    </Button>
                    {isPendingDelete && (
                      <span className="tac-mono-label text-destructive ml-1 whitespace-nowrap">
                        Click again
                      </span>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {/* Footer + reset */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <div className="tac-mono-label">
            {config.hydrated ? `${visibleHubs.length} visible` : "—"}
            {config.hydrated && renamedCount > 0
              ? ` · ${renamedCount} renamed`
              : ""}
            {config.hydrated && config.hidden.length > 0
              ? ` · ${config.hidden.length} hidden`
              : ""}
          </div>
          <Button variant="outline" size="sm" onClick={config.resetAll}>
            <RiArrowGoBackLine aria-hidden className="size-3.5" />
            Restore defaults
          </Button>
        </div>

        {/* Hidden hubs */}
        {config.hydrated && config.hidden.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="tac-mono-label mb-2">Hidden hubs</p>
            <ul className="divide-y divide-border">
              {config.hidden.map((code) => (
                <li
                  key={code}
                  className="py-2 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="t-body-sm font-medium text-foreground truncate line-through">
                      {config.labelFor(code)}
                    </div>
                    <div className="tac-mono-label mt-0.5 truncate">{code}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => config.unhideHub(code)}
                  >
                    <RiArrowGoBackLine aria-hidden className="size-3.5" />
                    Unhide
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SurfaceCard>

      <div className="flex flex-col gap-card-gap">
        <SurfaceCard density="compact" title="About hub config" eyebrow="Help">
          <p className="t-body-sm text-foreground">
            Hubs you add here appear as cards on the{" "}
            <span className="font-semibold">Hub Inventory</span> page, even when
            they currently hold zero pieces. Renames are display-only — the
            underlying hub code (used in shipment routing, manifests, and
            exports) is never changed.
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="font-mono uppercase tracking-tag text-primary border-primary/40"
            >
              IMPHAL
            </Badge>
            <Badge
              variant="outline"
              className="font-mono uppercase tracking-tag text-primary border-primary/40"
            >
              NEW_DELHI
            </Badge>
            <span className="tac-mono-label">Factory defaults</span>
          </div>
        </SurfaceCard>

        <SurfaceCard density="compact" title="Tips">
          <ul className="t-body-sm text-foreground list-disc pl-4 space-y-1">
            <li>Codes are auto-normalized: spaces → underscores, uppercased.</li>
            <li>Click a hub label to edit; Enter to save, Esc to cancel.</li>
            <li>Delete is a two-click confirm to prevent accidents.</li>
            <li>
              External hubs (appearing from shipment data) are tagged with
              &ldquo;external&rdquo;.
            </li>
          </ul>
        </SurfaceCard>
      </div>
    </div>
  )
}

export { V7OpsSettings }
export type { V7OpsSettingsProps }
