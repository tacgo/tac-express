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
import { cn } from "@workspace/ui/lib/utils"
import { RiErrorWarningLine, RiAddLine } from "@workspace/ui/icons"
import {
  DetailShell,
  FIELD_LABEL,
  STATUS_TONE_CLASS,
} from "@workspace/ui/components/composed/detail-shell"
import { SurfaceCard } from "@workspace/ui/components/composed/surface-card"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/primitives/skeleton"
import { Input } from "@workspace/ui/components/primitives/input"

/**
 * Violet Grid v7 manifest detail (Phase 10b in-place re-tokenize). Preserves
 * v6's full state machine (close → depart → arrive → reconcile), inline AWB
 * scan input, and notification-store wiring. Only the visual layer moved from
 * Paper Ops Console primitives to v7 (PageShell + inline header + 8/4
 * SurfaceCard grid). No services, hooks, or handlers changed.
 */

const STATUS_TONE: Record<
  string,
  "neutral" | "ok" | "warn" | "err" | "violet"
> = {
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

  async function handleAction(
    action: "close" | "depart" | "arrive" | "reconcile"
  ) {
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
      await Promise.all([manifestQuery.refetch(), shipmentsQuery.refetch()])
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
      <DetailShell
        eyebrow="Manifest"
        title="…"
        backHref="/ops-console/manifests"
      >
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </DetailShell>
    )
  }

  if (manifestQuery.isError || !m) {
    return (
      <DetailShell
        eyebrow="Manifest"
        title={id}
        backHref="/ops-console/manifests"
      >
        <div className="flex items-start gap-3 border border-l-[length:var(--indicator-w)] border-destructive/40 border-l-destructive bg-destructive/15 p-6">
          <RiErrorWarningLine
            aria-hidden
            className="size-5 shrink-0 text-destructive"
          />
          <div>
            <div className="font-mono text-2xs tracking-widest text-destructive uppercase">
              NOT FOUND
            </div>
            <p className="t-body-sm mt-1">
              Could not load manifest <span className="font-mono">{id}</span>.
            </p>
          </div>
        </div>
      </DetailShell>
    )
  }

  const nextAction = NEXT_ACTION[m.status]
  const canAddAwb =
    m.status === ManifestStatus.OPEN || m.status === ManifestStatus.DRAFT

  return (
    <DetailShell
      eyebrow="Manifest"
      title={m.manifestNumber}
      sub={`${m.originHub} → ${m.destHub} · ${m.transportMode}`}
      backHref="/ops-console/manifests"
      status={
        <Badge
          variant="outline"
          className={cn(
            "font-mono tracking-tag uppercase",
            STATUS_TONE_CLASS[STATUS_TONE[m.status] ?? "neutral"]
          )}
        >
          {m.status}
        </Badge>
      }
      aside={
        <>
          <SurfaceCard density="compact">
            <div className={FIELD_LABEL}>Shipments</div>
            <div className="t-data-md mt-1 text-foreground">
              {m.totalShipments}
            </div>
          </SurfaceCard>
          <SurfaceCard density="compact">
            <div className={FIELD_LABEL}>Total Weight</div>
            <div className="t-data-md mt-1 text-foreground">
              {m.totalWeight.toFixed(1)} kg
            </div>
            <div className={cn(FIELD_LABEL, "mt-2")}>{m.totalPieces} pcs</div>
          </SurfaceCard>
          <SurfaceCard density="compact">
            <div className={cn(FIELD_LABEL, "mb-1")}>Created</div>
            <div className="t-mono">
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
                <div className={cn(FIELD_LABEL, "mt-3 mb-1")}>Departure</div>
                <div className="t-mono">
                  {new Date(m.departureDate).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </>
            )}
          </SurfaceCard>
        </>
      }
    >
      {nextAction && (
        <SurfaceCard>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className={FIELD_LABEL}>Next Action</span>
              <span className="font-mono text-xs text-foreground">
                → {nextAction.label}
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => handleAction(nextAction.key)}
              disabled={isActionLoading}
            >
              {isActionLoading ? "Processing…" : nextAction.label}
            </Button>
          </div>
        </SurfaceCard>
      )}

      {canAddAwb && (
        <SurfaceCard>
          <div className={cn(FIELD_LABEL, "mb-2")}>Add AWB to manifest</div>
          <div className="flex items-stretch gap-2">
            <Input
              value={awbInput}
              onChange={(e) => setAwbInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleAddAwb()
                }
              }}
              placeholder="Scan or enter AWB…"
              className="flex-1 font-mono uppercase"
              autoFocus
            />
            <Button
              onClick={() => void handleAddAwb()}
              disabled={addShipment.isPending || !awbInput.trim()}
            >
              <RiAddLine aria-hidden className="size-3.5" />
              Add
            </Button>
          </div>
        </SurfaceCard>
      )}

      <SurfaceCard>
        <div className={cn(FIELD_LABEL, "mb-3")}>
          Loadlist · {shipments.length} AWBs
        </div>
        {shipmentsQuery.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ) : shipments.length === 0 ? (
          <div className={cn(FIELD_LABEL, "text-muted-foreground")}>
            No shipments loaded yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {shipments.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="t-mono font-semibold text-primary">
                    {s.awb_number}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono tracking-tag uppercase",
                      STATUS_TONE_CLASS.neutral
                    )}
                  >
                    {s.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground tabular-nums">
                  <span>{s.pieces ?? 0} pcs</span>
                  <span>{s.chargeable_weight?.toFixed?.(1) ?? "—"} kg</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>

      {m.notes && (
        <SurfaceCard>
          <div className={cn(FIELD_LABEL, "mb-2")}>Notes</div>
          <p className="font-mono text-xs whitespace-pre-line text-foreground">
            {m.notes}
          </p>
        </SurfaceCard>
      )}
    </DetailShell>
  )
}
