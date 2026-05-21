"use client"

import * as React from "react"

import {
  RiRefreshLine,
  RiEditLine,
  RiCheckLine,
  RiCloseLine,
  RiArrowGoBackLine,
  RiSettingsLine,
} from "@workspace/ui/icons"
import { cn } from "@workspace/ui/lib/utils"
import { useHubConfig } from "@workspace/ui/lib/hub-config"
import Link from "next/link"
import { OpsFrame } from "../ops-frame"
import { OpsPageHead } from "../ops-page-head"
import { OpsButton } from "../ops-button"
import { OpsBadge } from "../ops-badge"
import { OpsCard } from "../ops-card"

interface HubInventory {
  hubCode: string
  pieces: number
  rows: Array<{ label: string; value: number }>
}

interface OpsInventoryViewProps {
  hubs: HubInventory[]
  isLoading?: boolean
  onRefresh?: () => void
}

const EMPTY_ROWS = (): HubInventory["rows"] => [
  { label: "Created / Pending", value: 0 },
  { label: "In Transit", value: 0 },
  { label: "Arrived at Hub", value: 0 },
  { label: "Out for Delivery", value: 0 },
  { label: "Exceptions", value: 0 },
]

function OpsInventoryView({
  hubs,
  isLoading,
  onRefresh,
}: OpsInventoryViewProps) {
  const config = useHubConfig()

  const [editingHub, setEditingHub] = React.useState<string | null>(null)
  const [draftLabel, setDraftLabel] = React.useState<string>("")

  // Merge data hubs with the operator's configured hub list so cards stay
  // visible even when a hub holds zero pieces. Hubs the operator has
  // explicitly hidden (via Settings → Hubs) are filtered out regardless
  // of source.
  const hiddenSet = React.useMemo(() => new Set(config.hidden), [config.hidden])
  const mergedHubs = React.useMemo<HubInventory[]>(() => {
    const byCode = new Map<string, HubInventory>()
    for (const h of hubs) {
      const code = h.hubCode.replace(/\s+/g, "_").toUpperCase()
      if (hiddenSet.has(code)) continue
      byCode.set(code, h)
    }
    for (const code of config.hubs) {
      if (hiddenSet.has(code)) continue
      if (!byCode.has(code)) {
        byCode.set(code, { hubCode: code, pieces: 0, rows: EMPTY_ROWS() })
      }
    }
    // Sort: configured hubs first (preserving the operator's order in
    // settings), then everyone else by descending piece count.
    return Array.from(byCode.values()).sort((a, b) => {
      const aPin = config.hubs.indexOf(a.hubCode)
      const bPin = config.hubs.indexOf(b.hubCode)
      if (aPin !== -1 || bPin !== -1) {
        if (aPin === -1) return 1
        if (bPin === -1) return -1
        return aPin - bPin
      }
      return b.pieces - a.pieces
    })
  }, [hubs, config.hubs, hiddenSet])

  function startEdit(code: string, currentLabel: string) {
    setEditingHub(code)
    setDraftLabel(currentLabel)
  }
  function commitEdit(code: string) {
    config.renameHub(code, draftLabel)
    setEditingHub(null)
  }
  function cancelEdit() {
    setEditingHub(null)
  }

  const renamedCount = Object.keys(config.renames).length
  const totalPieces = mergedHubs.reduce((sum, h) => sum + h.pieces, 0)

  return (
    <OpsFrame>
      <OpsPageHead
        eyebrow="Operations"
        title="Hub Inventory"
        sub="Live shipment count by hub (excludes Delivered / Cancelled / RTO)"
        actions={
          <div className="flex items-center gap-2">
            {config.hydrated && renamedCount > 0 ? (
              <OpsButton onClick={config.resetRenames}>
                <RiArrowGoBackLine aria-hidden className="size-3" />
                Reset labels
              </OpsButton>
            ) : null}
            <OpsButton asChild>
              <Link href="/ops-console/settings">
                <RiSettingsLine aria-hidden className="size-3" />
                Manage hubs
              </Link>
            </OpsButton>
            <OpsButton onClick={onRefresh} disabled={isLoading}>
              <RiRefreshLine
                aria-hidden
                className={cn("size-3", isLoading && "animate-spin")}
              />
              {isLoading ? "Refreshing…" : "Refresh"}
            </OpsButton>
          </div>
        }
      />

      {/* Summary strip — total network inventory + hub count */}
      <div className="mb-4 border border-paper-line bg-paper-card divide-x divide-paper-line grid grid-cols-3">
        <div className="px-4 py-3">
          <div className="paper-label">Hubs in view</div>
          <div className="font-paper-display font-bold text-[length:var(--text-paper-22)] mt-1 tabular-nums">
            {mergedHubs.length}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="paper-label">Total in network</div>
          <div className="font-paper-display font-bold text-[length:var(--text-paper-22)] mt-1 tabular-nums">
            {totalPieces}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="paper-label">Renamed</div>
          <div className="font-paper-display font-bold text-[length:var(--text-paper-22)] mt-1 tabular-nums">
            {config.hydrated ? renamedCount : 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mergedHubs.map((hub) => {
          const isEditing = editingHub === hub.hubCode
          const isConfigured = config.hubs.includes(hub.hubCode)
          const display = config.labelFor(hub.hubCode)
          return (
            <OpsCard key={hub.hubCode} ticks>
              <div className="flex items-center justify-between mb-3.5 gap-2">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={draftLabel}
                        onChange={(e) => setDraftLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(hub.hubCode)
                          if (e.key === "Escape") cancelEdit()
                        }}
                        autoFocus
                        aria-label={`Rename hub ${hub.hubCode}`}
                        className={cn(
                          "min-w-0 flex-1 bg-paper-bg border border-paper-line px-2 py-1",
                          "font-paper-display font-semibold text-[length:var(--text-paper-13)] text-paper-fg-1",
                          "tracking-[length:var(--tracking-badge)]",
                          "focus:outline-none focus:border-paper-violet",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => commitEdit(hub.hubCode)}
                        aria-label="Save"
                        className="text-paper-ok hover:bg-paper-ok-bg p-1 transition-colors"
                      >
                        <RiCheckLine className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        aria-label="Cancel"
                        className="text-paper-fg-3 hover:bg-paper-3 p-1 transition-colors"
                      >
                        <RiCloseLine className="size-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <div className="font-paper-display font-semibold text-[length:var(--text-paper-13)] text-paper-fg-1 tracking-[length:var(--tracking-badge)] truncate">
                          {display}
                        </div>
                        <div className="paper-label mt-0.5 truncate">
                          {hub.hubCode}
                          {isConfigured ? "" : " · external"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEdit(hub.hubCode, display)}
                        aria-label={`Rename ${display}`}
                        className="text-paper-fg-3 hover:text-paper-violet hover:bg-paper-3 p-1 transition-colors"
                      >
                        <RiEditLine className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>
                <OpsBadge tone={hub.pieces > 0 ? "violet" : "neutral"}>
                  {hub.pieces} pcs
                </OpsBadge>
              </div>
              {hub.rows.map((r) => {
                const isException = r.label === "Exceptions" && r.value > 0
                return (
                  <div
                    key={r.label}
                    className="flex items-center justify-between py-2.5 border-t border-paper-line"
                  >
                    <span
                      className={cn(
                        "font-paper-mono uppercase text-[length:var(--text-paper-11)] tracking-[length:var(--tracking-badge)]",
                        isException ? "text-paper-err" : "text-paper-fg-3",
                      )}
                    >
                      {r.label}
                    </span>
                    <span
                      className={cn(
                        "font-paper-display font-bold text-[length:var(--text-paper-14)] tabular-nums",
                        isException && "text-paper-err",
                      )}
                    >
                      {r.value}
                    </span>
                  </div>
                )
              })}
            </OpsCard>
          )
        })}
      </div>
    </OpsFrame>
  )
}

export { OpsInventoryView }
// Note: `prettifyHubCode` lives in `@workspace/ui/lib/hub-config` and should be
// imported from there directly. The previous re-export from this page module
// leaked an abstraction boundary (utilities should not flow through pages).
// Closes #56.
export type { OpsInventoryViewProps, HubInventory }
