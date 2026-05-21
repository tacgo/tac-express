"use client"

import * as React from "react"
import Link from "next/link"

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
import { useHubConfig } from "@workspace/ui/lib/hub-config"
import { cn } from "@workspace/ui/lib/utils"
import { OpsFrame } from "../ops-frame"
import { OpsPageHead } from "../ops-page-head"
import { OpsButton } from "../ops-button"
import { OpsBadge } from "../ops-badge"
import { OpsCard } from "../ops-card"
import { OpsTabs } from "../ops-tabs"
import { OpsFieldInput, OpsFieldLabel } from "../ops-field"
import { OpsKbd } from "../ops-kbd"
import { AdminDesignVersionToggle } from "../../admin/design-version-toggle"

interface OpsSettingsViewProps {
  email: string
  displayName: string
  hubCode: string
  completionPct: number
  pendingItems: string[]
  version: string
  environment: string
  /**
   * Hub codes that have been observed in shipment data — used by the Hubs
   * tab so the operator can hide/manage "external" hubs (e.g. legacy hub
   * codes from old shipment rows) that aren't in their configured list.
   */
  discoveredHubs?: string[]
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

function OpsSettingsView({
  email,
  displayName,
  hubCode,
  completionPct,
  pendingItems,
  version,
  environment,
  discoveredHubs = [],
}: OpsSettingsViewProps) {
  const [tab, setTab] = React.useState<string>("Profile")

  return (
    <OpsFrame>
      <OpsPageHead
        eyebrow="Account"
        title="Settings"
        sub="Manage your profile, security, theme, and integrations"
      />
      <OpsTabs items={[...TABS]} value={tab} onChange={setTab} />

      {/* Profile tab — the live editable form + completion + shortcuts. */}
      {tab === "Profile" && (
        <div className="grid grid-cols-[1.5fr_1fr] gap-[length:var(--spacing-gutter-md)]">
          <OpsCard ticks>
            <div className="paper-label mb-3.5">Profile</div>
            <div className="flex flex-col gap-3.5">
              <div>
                <OpsFieldLabel htmlFor="paper-settings-email">Email</OpsFieldLabel>
                <OpsFieldInput
                  id="paper-settings-email"
                  defaultValue={email.toUpperCase()}
                />
              </div>
              <div>
                <OpsFieldLabel htmlFor="paper-settings-name">
                  Display Name
                </OpsFieldLabel>
                <OpsFieldInput
                  id="paper-settings-name"
                  placeholder="Type your name"
                  defaultValue={displayName}
                />
              </div>
              <div>
                <OpsFieldLabel htmlFor="paper-settings-hub">Hub Code</OpsFieldLabel>
                <OpsFieldInput
                  id="paper-settings-hub"
                  placeholder="E.G. IMPHAL"
                  defaultValue={hubCode}
                />
              </div>
              <div className="flex justify-end mt-1.5">
                <OpsButton variant="primary">Save Changes</OpsButton>
              </div>
            </div>
          </OpsCard>

          <div className="flex flex-col gap-3.5">
            <OpsCard ticks>
              <div className="paper-label">Profile Completion</div>
              <div className="font-sans font-extrabold text-ui-28 mt-2">
                {completionPct}%
              </div>
              <div className="paper-label mt-1.5">
                {pendingItems.length} pending
              </div>
              <div className="mt-2.5 font-mono text-muted-foreground text-ui-12 flex flex-col gap-1">
                {pendingItems.map((p) => (
                  <div key={p}>■ {p}</div>
                ))}
              </div>
            </OpsCard>

            <OpsCard ticks>
              <div className="paper-label flex items-center gap-2">
                <RiKeyboardLine aria-hidden className="size-3.5" />
                Keyboard Shortcuts
              </div>
              {SHORTCUTS.map(([label, keys]) => (
                <div
                  key={label}
                  className="flex items-center justify-between mt-2"
                >
                  <span className="font-mono uppercase text-muted-foreground text-ui-11 tracking-nav">
                    {label}
                  </span>
                  <span className="font-mono text-ui-11">
                    {keys.map((k) => (
                      <OpsKbd key={k}>{k}</OpsKbd>
                    ))}
                  </span>
                </div>
              ))}
            </OpsCard>

            <OpsCard>
              <div className="paper-label">System Information</div>
              <div className="flex items-center justify-between mt-2">
                <span className="paper-label">Version</span>
                <span className="font-mono text-ui-13">
                  {version}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="paper-label">Environment</span>
                <span className="font-mono text-ui-13">
                  {environment}
                </span>
              </div>
            </OpsCard>

            {/* Admin-only design-version toggle (Phase 1 rollback Layer 3).
                Renders nothing for non-admin roles. See
                docs/ROLLBACK-PLAYBOOK.md § NextAdmin Refactor. */}
            <AdminDesignVersionToggle />
          </div>
        </div>
      )}

      {/* Hubs tab — manage the inventory hub list (add / rename / delete).
          Backed by the same localStorage config the Hub Inventory page
          reads, so edits here propagate on next navigation. */}
      {tab === "Hubs" && <OpsHubsSection discoveredHubs={discoveredHubs} />}

      {/* Integrations tab — API Keys + Webhooks deep-links to v6 sub-pages. */}
      {tab === "Integrations" && (
        <OpsCard ticks>
          <div className="paper-label mb-3">Integrations</div>
          {/* Sub-pages live in the v6 surface until paper variants ship —
              linking here makes them discoverable from the Ops Console. */}
          <ul className="flex flex-col divide-y divide-paper-line border-y border-border">
            <li>
              <Link
                href="/ops-console/settings/api-keys"
                className="flex items-center gap-3 py-2.5 px-1 hover:bg-muted transition-colors duration-fast ease-linear focus-visible:outline-none focus-visible:tac-focus-premium"
              >
                <RiKey2Line aria-hidden className="size-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-ui-13">
                    API Keys
                  </div>
                  <div className="paper-label mt-0.5">
                    Service tokens & access control
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
                className="flex items-center gap-3 py-2.5 px-1 hover:bg-muted transition-colors duration-fast ease-linear focus-visible:outline-none focus-visible:tac-focus-premium"
              >
                <RiSendPlaneLine aria-hidden className="size-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-ui-13">
                    Webhooks
                  </div>
                  <div className="paper-label mt-0.5">
                    Event subscriptions & delivery logs
                  </div>
                </div>
                <RiArrowRightLine
                  aria-hidden
                  className="size-3.5 text-muted-foreground"
                />
              </Link>
            </li>
          </ul>
        </OpsCard>
      )}

      {/* Audit tab — link to v6 audit log */}
      {tab === "Audit" && (
        <OpsCard ticks>
          <div className="paper-label mb-3">Audit Log</div>
          <p className="font-sans text-ui-13 mb-4">
            Compliance + activity history for this account and the organization.
          </p>
          <Link
            href="/ops-console/audit"
            className="inline-flex items-center gap-1.5 paper-label text-primary hover:underline focus-visible:outline-none focus-visible:tac-focus-premium"
          >
            Open Audit Log
            <RiArrowRightLine aria-hidden className="size-3.5" />
          </Link>
        </OpsCard>
      )}

      {/* Security + Theme tabs are not yet implemented — surface that
          honestly instead of pretending a tab works. */}
      {(tab === "Security" || tab === "Theme") && (
        <OpsCard ticks>
          <div className="paper-label mb-3">{tab}</div>
          <p className="font-sans text-ui-13 text-muted-foreground">
            {tab === "Security"
              ? "Password rotation, 2FA setup, and session management ship in the next sprint. For account-recovery contact your administrator."
              : "Theme is controlled by the C / M / S toggle in the top bar. A persistent per-user theme preference lands in the next sprint."}
          </p>
        </OpsCard>
      )}
    </OpsFrame>
  )
}

/**
 * OpsHubsSection — settings panel for managing the operator's hub list.
 *
 * Three classes of hubs render here:
 *   - **Configured** — codes the operator added via the input above (or the
 *     IMPHAL/NEW_DELHI defaults). These show up on the Hub Inventory page
 *     even when they hold zero pieces.
 *   - **External** — hubs discovered in shipment data but not in the
 *     configured list. They render on the inventory page because data
 *     references them; the operator can rename or delete them here.
 *   - **Hidden** — hubs the operator has deleted. Listed in a separate
 *     section below with an "Unhide" button so deletes are reversible.
 *
 * "Delete" on any hub: removes from `hubs` (if present) AND adds to
 * `hidden` so external hubs don't reappear from shipment data.
 *
 * Persists through `useHubConfig()` to `tac-hub-config-v1`.
 */
function OpsHubsSection({
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

  // Hubs visible on the inventory page = configured ∪ discovered, minus
  // hidden. We render them in this exact set on the settings tab so the
  // operator can manage every card they see (and only those).
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
      // Auto-clear the "click again to confirm" state after 3s so it
      // doesn't sit around indefinitely. `globalThis.setTimeout` works
      // in both Node SSR + browser; `window.setTimeout` would throw
      // ReferenceError during server-side rendering of this client component
      // if it ever ends up in a non-window context.
      globalThis.setTimeout(() => {
        setPendingDelete((prev) => (prev === code ? null : prev))
      }, 3000)
    }
  }

  const renamedCount = Object.keys(config.renames).length

  return (
    <div className="grid grid-cols-[1.5fr_1fr] gap-[length:var(--spacing-gutter-md)]">
      <OpsCard ticks>
        <div className="paper-label mb-3.5">Hubs in your network</div>

        {/* Add new hub */}
        <div className="flex items-end gap-2 pb-3.5 border-b border-border">
          <div className="flex-1">
            <OpsFieldLabel htmlFor="paper-hub-add">Add a hub</OpsFieldLabel>
            <OpsFieldInput
              id="paper-hub-add"
              placeholder="E.G. MUMBAI"
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
              aria-describedby={addError ? "paper-hub-add-error" : undefined}
              aria-invalid={addError ? true : undefined}
            />
          </div>
          <OpsButton variant="primary" onClick={handleAdd}>
            <RiAddLine aria-hidden className="size-3" />
            Add Hub
          </OpsButton>
        </div>
        {addError ? (
          <div
            id="paper-hub-add-error"
            role="alert"
            className="paper-label text-destructive mt-2"
          >
            {addError}
          </div>
        ) : null}

        {/* Current hub list — configured + external (visible), minus hidden */}
        <ul className="mt-1 divide-y divide-paper-line">
          {!config.hydrated && (
            <li className="py-3 paper-label text-muted-foreground">Loading…</li>
          )}
          {config.hydrated && visibleHubs.length === 0 && (
            <li className="py-3 paper-label text-muted-foreground">
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
                      <input
                        type="text"
                        value={draftLabel}
                        onChange={(e) => setDraftLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(code)
                          if (e.key === "Escape") cancelEdit()
                        }}
                        autoFocus
                        aria-label={`Rename hub ${code}`}
                        className={cn(
                          "min-w-0 flex-1 bg-background border border-border px-2 py-1",
                          "font-sans font-semibold text-ui-13 text-foreground",
                          "tracking-badge",
                          "focus:outline-none focus:border-primary",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => commitEdit(code)}
                        aria-label="Save"
                        className="text-accent-success hover:bg-accent-success/15 p-1 transition-colors"
                      >
                        <RiCheckLine className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        aria-label="Cancel"
                        className="text-muted-foreground hover:bg-muted p-1 transition-colors"
                      >
                        <RiCloseLine className="size-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="min-w-0">
                      <div className="font-sans font-semibold text-ui-13 text-foreground truncate">
                        {display}
                      </div>
                      <div className="paper-label mt-0.5 truncate">
                        {code}
                        {isExternal ? " · external" : ""}
                        {renamed ? " · renamed" : ""}
                      </div>
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(code)}
                      aria-label={`Rename ${display}`}
                      className="text-muted-foreground hover:text-primary hover:bg-muted p-1.5 transition-colors"
                    >
                      <RiEditLine className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(code)}
                      aria-label={
                        isPendingDelete
                          ? `Confirm delete ${display}`
                          : `Delete ${display}`
                      }
                      className={cn(
                        "p-1.5 transition-colors",
                        isPendingDelete
                          ? "text-destructive bg-destructive/15"
                          : "text-muted-foreground hover:text-destructive hover:bg-muted",
                      )}
                    >
                      <RiDeleteBinLine className="size-3.5" />
                    </button>
                    {isPendingDelete && (
                      <span className="paper-label text-destructive ml-1 whitespace-nowrap">
                        Click again
                      </span>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {/* Footer actions — reset to factory defaults */}
        <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-border">
          <div className="paper-label">
            {config.hydrated ? `${visibleHubs.length} visible` : "—"}
            {config.hydrated && renamedCount > 0 ? ` · ${renamedCount} renamed` : ""}
            {config.hydrated && config.hidden.length > 0
              ? ` · ${config.hidden.length} hidden`
              : ""}
          </div>
          <OpsButton onClick={config.resetAll}>
            <RiArrowGoBackLine aria-hidden className="size-3" />
            Restore defaults
          </OpsButton>
        </div>

        {/* Hidden hubs — operator can unhide any hub they previously deleted. */}
        {config.hydrated && config.hidden.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-border">
            <div className="paper-label mb-2">Hidden hubs</div>
            <ul className="divide-y divide-paper-line">
              {config.hidden.map((code) => (
                <li
                  key={code}
                  className="py-2 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-sans font-medium text-ui-13 text-foreground truncate line-through">
                      {config.labelFor(code)}
                    </div>
                    <div className="paper-label mt-0.5 truncate">{code}</div>
                  </div>
                  <OpsButton
                    size="sm"
                    onClick={() => config.unhideHub(code)}
                  >
                    <RiArrowGoBackLine aria-hidden className="size-3" />
                    Unhide
                  </OpsButton>
                </li>
              ))}
            </ul>
          </div>
        )}
      </OpsCard>

      <div className="flex flex-col gap-3.5">
        <OpsCard ticks>
          <div className="paper-label">About hub config</div>
          <p className="font-sans text-ui-13 mt-2 leading-relaxed text-foreground">
            Hubs you add here appear as cards on the{" "}
            <span className="font-semibold text-foreground">Hub Inventory</span>{" "}
            page, even when they currently hold zero pieces. Renames are
            display-only — the underlying hub code (used in shipment routing,
            manifests, and exports) is never changed.
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <OpsBadge tone="violet">IMPHAL</OpsBadge>
            <OpsBadge tone="violet">NEW_DELHI</OpsBadge>
            <span className="paper-label">Factory defaults</span>
          </div>
        </OpsCard>

        <OpsCard>
          <div className="paper-label">Tips</div>
          <ul className="font-sans text-ui-13 mt-2 leading-relaxed text-foreground list-disc pl-4 space-y-1">
            <li>Codes are auto-normalized: spaces → underscores, uppercased.</li>
            <li>Click a hub label to edit; Enter to save, Esc to cancel.</li>
            <li>Delete is a two-click confirm to prevent accidents.</li>
            <li>External hubs (appearing from shipment data) are tagged with “external”.</li>
          </ul>
        </OpsCard>
      </div>
    </div>
  )
}

export { OpsSettingsView }
export type { OpsSettingsViewProps }
