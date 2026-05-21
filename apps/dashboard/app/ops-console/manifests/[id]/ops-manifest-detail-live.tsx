"use client"

import * as React from "react"

import {
  useManifest,
  useManifestShipments,
  useCloseManifest,
  useDepartManifest,
  useArriveManifest,
  useReconcileManifest,
  useAddShipmentToManifest,
} from "@workspace/services/hooks/use-manifests"
import { useNotificationStore } from "@workspace/services/stores/notification.store"
import { ManifestStatus } from "@workspace/types"
import { RiErrorWarningLine, RiAddLine } from "@workspace/ui/icons"
import {
  OpsDetailFrame,
  OpsBadge,
  OpsButton,
  OpsCard,
  OpsSkeleton,
  OpsFieldInput,
} from "@workspace/ui/components/composed/ops-console"

/**
 * Paper-aesthetic manifest detail. Preserves v6's full state machine
 * (close → depart → arrive → reconcile), inline AWB scan input, and
 * notification store wiring. Only the visual layer changes.
 */

const STATUS_TONE: Record<string, "neutral" | "ok" | "warn" | "err" | "violet"> = {
  DRAFT: "neutral",
  BUILDING: "warn",
  OPEN: "warn",
  CLOSED: "violet",
  DEPARTED: "violet",
  ARRIVED: "ok",
  RECONCILED: "neutral",
  CANCELLED: "err",
}

const NEXT_ACTION: Partial<
  Record<
    ManifestStatus,
    { label: string; key: "close" | "depart" | "arrive" | "reconcile" }
  >
> = {
  [ManifestStatus.OPEN]: { label: "Close Manifest", key: "close" },
  [ManifestStatus.CLOSED]: { label: "Mark Departed", key: "depart" },
  [ManifestStatus.DEPARTED]: { label: "Mark Arrived", key: "arrive" },
  [ManifestStatus.ARRIVED]: { label: "Reconcile", key: "reconcile" },
}

interface OpsManifestDetailLiveProps {
  id: string
}

export function OpsManifestDetailLive({ id }: OpsManifestDetailLiveProps) {
  const addNotification = useNotificationStore((s) => s.addNotification)
  const manifestQuery = useManifest(id)
  const shipmentsQuery = useManifestShipments(id)
  const closeManifest = useCloseManifest()
  const departManifest = useDepartManifest()
  const arriveManifest = useArriveManifest()
  const reconcileManifest = useReconcileManifest()
  const addShipment = useAddShipmentToManifest()

  const [awbInput, setAwbInput] = React.useState("")

  const m = manifestQuery.data
  const shipments = shipmentsQuery.data ?? []

  const isActionLoading =
    closeManifest.isPending ||
    departManifest.isPending ||
    arriveManifest.isPending ||
    reconcileManifest.isPending

  async function handleAction(action: "close" | "depart" | "arrive" | "reconcile") {
    try {
      if (action === "close") await closeManifest.mutateAsync(id)
      else if (action === "depart") await departManifest.mutateAsync(id)
      else if (action === "arrive") await arriveManifest.mutateAsync(id)
      else await reconcileManifest.mutateAsync(id)
      // Force-refetch the manifest query so the UI rebinds to the new status
      // synchronously. Relying on invalidateQueries + staleTime can leave the
      // page showing the prior status long enough that automation tools (and
      // operators) think nothing happened. Promise.all so the next action
      // button doesn't show until both manifest + shipments are fresh.
      await Promise.all([
        manifestQuery.refetch(),
        shipmentsQuery.refetch(),
      ])
      addNotification({
        type: "success",
        title: "Status updated",
        message: action.toUpperCase(),
      })
    } catch (err) {
      addNotification({
        type: "error",
        title: "Action failed",
        message: String(err),
      })
    }
  }

  async function handleAddAwb() {
    const awb = awbInput.trim().toUpperCase()
    if (!awb) return
    try {
      await addShipment.mutateAsync({ manifestId: id, awb })
      addNotification({ type: "success", title: "AWB added", message: awb })
      setAwbInput("")
    } catch (err) {
      addNotification({
        type: "error",
        title: "Failed to add AWB",
        message: String(err),
      })
    }
  }

  if (manifestQuery.isPending) {
    return (
      <OpsDetailFrame
        eyebrow="Manifest"
        title="…"
        backHref="/ops-console/manifests"
      >
        <OpsSkeleton className="h-4 w-2/3" />
        <OpsSkeleton className="h-32 w-full" />
      </OpsDetailFrame>
    )
  }

  if (manifestQuery.isError || !m) {
    return (
      <OpsDetailFrame
        eyebrow="Manifest"
        title={id}
        backHref="/ops-console/manifests"
      >
        <div className="border border-paper-err/40 border-l-[length:var(--indicator-w)] border-l-paper-err bg-paper-err-bg/30 p-6 flex items-start gap-3">
          <RiErrorWarningLine
            aria-hidden
            className="size-5 text-paper-err shrink-0"
          />
          <div>
            <div className="paper-eyebrow text-paper-err">NOT FOUND</div>
            <p className="font-paper-display text-ui-13 mt-1">
              Could not load manifest{" "}
              <span className="font-paper-mono">{id}</span>.
            </p>
          </div>
        </div>
      </OpsDetailFrame>
    )
  }

  const nextAction = NEXT_ACTION[m.status]
  const canAddAwb =
    m.status === ManifestStatus.OPEN || m.status === ManifestStatus.DRAFT

  return (
    <OpsDetailFrame
      eyebrow="Manifest"
      title={m.manifestNumber}
      sub={`${m.originHub} → ${m.destHub} · ${m.transportMode}`}
      backHref="/ops-console/manifests"
      status={
        <OpsBadge tone={STATUS_TONE[m.status] ?? "neutral"}>{m.status}</OpsBadge>
      }
      aside={
        <>
          <OpsCard ticks>
            <div className="paper-label">Shipments</div>
            <div className="paper-stat-value mt-1">{m.totalShipments}</div>
          </OpsCard>
          <OpsCard ticks>
            <div className="paper-label">Total Weight</div>
            <div className="paper-stat-value mt-1">
              {m.totalWeight.toFixed(1)} kg
            </div>
            <div className="paper-label mt-2">
              {m.totalPieces} pcs
            </div>
          </OpsCard>
          <OpsCard>
            <div className="paper-label mb-1">Created</div>
            <div className="font-paper-mono text-ui-13 tabular-nums">
              {new Date(m.createdAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            {m.departureDate && (
              <>
                <div className="paper-label mb-1 mt-3">Departure</div>
                <div className="font-paper-mono text-ui-13 tabular-nums">
                  {new Date(m.departureDate).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </>
            )}
          </OpsCard>
        </>
      }
    >
      {nextAction && (
        <OpsCard ticks>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="paper-label">Next Action</span>
              <span className="font-paper-mono text-ui-12 text-paper-fg-1">
                → {nextAction.label}
              </span>
            </div>
            <OpsButton
              variant="primary"
              size="sm"
              onClick={() => handleAction(nextAction.key)}
              disabled={isActionLoading}
            >
              {isActionLoading ? "Processing…" : nextAction.label}
            </OpsButton>
          </div>
        </OpsCard>
      )}

      {canAddAwb && (
        <OpsCard ticks>
          <div className="paper-label mb-2">Add AWB to manifest</div>
          <div className="flex items-stretch gap-2">
            <OpsFieldInput
              value={awbInput}
              onChange={(e) => setAwbInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleAddAwb()
                }
              }}
              placeholder="Scan or enter AWB…"
              className="flex-1"
              autoFocus
            />
            <OpsButton
              onClick={() => void handleAddAwb()}
              disabled={addShipment.isPending || !awbInput.trim()}
              size="default"
            >
              <RiAddLine aria-hidden className="size-3.5" />
              Add
            </OpsButton>
          </div>
        </OpsCard>
      )}

      <OpsCard ticks>
        <div className="paper-label mb-3">
          Loadlist · {shipments.length} AWBs
        </div>
        {shipmentsQuery.isPending ? (
          <div className="space-y-2">
            <OpsSkeleton className="h-3 w-1/2" />
            <OpsSkeleton className="h-3 w-2/3" />
          </div>
        ) : shipments.length === 0 ? (
          <div className="paper-label text-paper-fg-3">
            No shipments loaded yet.
          </div>
        ) : (
          <ul className="divide-y divide-paper-line">
            {shipments.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="paper-id">{s.awb_number}</span>
                  <OpsBadge tone="neutral">{s.status}</OpsBadge>
                </div>
                <div className="flex items-center gap-4 font-paper-mono text-ui-12 text-paper-fg-3 tabular-nums">
                  <span>{s.pieces ?? 0} pcs</span>
                  <span>
                    {s.chargeable_weight?.toFixed?.(1) ?? "—"} kg
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </OpsCard>

      {m.notes && (
        <OpsCard ticks>
          <div className="paper-label mb-2">Notes</div>
          <p className="font-paper-mono text-ui-12 text-paper-fg-1 whitespace-pre-line">
            {m.notes}
          </p>
        </OpsCard>
      )}
    </OpsDetailFrame>
  )
}
