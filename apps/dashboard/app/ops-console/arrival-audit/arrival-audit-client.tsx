"use client"

import * as React from "react"

import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { Button } from "@workspace/ui/components/button"
import { Combobox } from "@workspace/ui/components/primitives/combobox"
import { Label } from "@workspace/ui/components/primitives/label"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import { ScanningConsole } from "@workspace/ui/components/composed/scanning/scanning-console"
import { ArrivalAuditStats } from "@workspace/ui/components/composed/scanning/arrival-audit-stats"
import {
  ExpectedShipmentsList,
  type ExpectedShipment,
} from "@workspace/ui/components/composed/scanning/expected-shipments-list"
import {
  useManifests,
  useManifest,
  useManifestShipments,
  useArriveManifest,
} from "@workspace/services/hooks/use-manifests"
import { shipmentService } from "@workspace/services/hooks/use-shipments"
import { useNotificationStore } from "@workspace/services/stores/notification.store"
import { RiListCheck3, RiCheckLine } from "@workspace/ui/icons"
import { ManifestStatus } from "@workspace/types"

export function ArrivalAuditClient() {
  const [activeId, setActiveId] = React.useState<string>("")
  const addNotification = useNotificationStore((s) => s.addNotification)

  // Manifests waiting for arrival audit (in DEPARTED state)
  const { data: candidates = [] } = useManifests({
    status: [ManifestStatus.DEPARTED],
  })

  const { data: manifest } = useManifest(activeId)
  const { data: manifestShipments } = useManifestShipments(activeId)
  const stableShipments = React.useMemo(() => manifestShipments ?? [], [manifestShipments])
  const arriveMutation = useArriveManifest()

  // Hydrate each manifest line with consignee data for the audit list.
  const [items, setItems] = React.useState<ExpectedShipment[]>([])
  const [hydrating, setHydrating] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    if (!activeId || stableShipments.length === 0) {
      setItems([])
      return
    }
    setHydrating(true)

    const fetchShipments = async () => {
      try {
        const awbs = stableShipments.map(ms => ms.awb_number)
        const shipments = await shipmentService.getShipmentsByAwbs(awbs)
        const shipmentMap = new Map(shipments.map(s => [s.awbNumber, s]))

        const rows = stableShipments.map(ms => {
          const ship = shipmentMap.get(ms.awb_number)
          return {
            awbNumber: ms.awb_number,
            consigneeName: ship?.receiver?.name ?? "—",
            consigneeCity: ship?.receiver?.address?.city,
            pieces: ms.pieces ?? ship?.pieces ?? 0,
            weightKg: ms.chargeable_weight ?? ship?.weight?.chargeable ?? 0,
            status: "PENDING" as const,
          }
        })

        if (!cancelled) {
          setItems(rows)
          setHydrating(false)
        }
      } catch (_error) {
        // Fallback if the bulk fetch fails
        if (!cancelled) {
          const fallbackRows = stableShipments.map(ms => ({
            awbNumber: ms.awb_number,
            consigneeName: "—",
            pieces: ms.pieces ?? 0,
            weightKg: ms.chargeable_weight ?? 0,
            status: "PENDING" as const,
          }))
          setItems(fallbackRows)
          setHydrating(false)
        }
      }
    }

    fetchShipments()

    return () => {
      cancelled = true
    }
  }, [activeId, stableShipments])

  const stats = React.useMemo(() => {
    return {
      total: items.length,
      scanned: items.filter((i) => i.status === "SCANNED").length,
      exceptions: items.filter((i) => i.status === "EXCEPTION").length,
    }
  }, [items])

  const handleScan = async (awb: string) => {
    const matched = items.find((i) => i.awbNumber === awb)
    if (!matched) {
      return {
        outcome: "ERROR" as const,
        reason: "AWB not on this manifest",
      }
    }
    if (matched.status === "SCANNED") {
      return { outcome: "DUPLICATE" as const, reason: "Already scanned" }
    }
    setItems((prev) =>
      prev.map((i) =>
        i.awbNumber === awb
          ? { ...i, status: "SCANNED", scannedAt: new Date().toISOString() }
          : i
      )
    )
    return { outcome: "SUCCESS" as const }
  }

  const markException = (awb: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.awbNumber === awb ? { ...i, status: "EXCEPTION" } : i
      )
    )
  }

  const finalize = async () => {
    if (!manifest) return
    const remaining =
      stats.total - stats.scanned - stats.exceptions
    if (remaining > 0) {
      const proceed = window.confirm(
        `${remaining} shipments are still pending. Mark them as exceptions and finalize?`
      )
      if (!proceed) return
      setItems((prev) =>
        prev.map((i) =>
          i.status === "PENDING" ? { ...i, status: "EXCEPTION" } : i
        )
      )
    }
    try {
      await arriveMutation.mutateAsync(manifest.id)
      addNotification({
        type: "success",
        title: "Manifest arrived",
        message: `${manifest.manifestNumber} reconciled · ${stats.scanned} scanned · ${stats.exceptions + remaining} exceptions.`,
      })
    } catch (err) {
      addNotification({
        type: "error",
        title: "Arrive failed",
        message: (err as Error).message,
      })
    }
  }

  const candidateOptions = candidates.map((c) => ({
    value: c.id,
    label: `${c.manifestNumber}`,
    meta: `${c.originHub} → ${c.destHub}`,
  }))

  return (
    <PageShell width="wide">
      <PageHeader
        overline="Operations"
        title="Arrival Audit"
        description="Reconcile inbound manifests at the receiving hub. Scan each AWB and resolve shortages before marking the manifest arrived."
      />

      {/* Manifest selector */}
      <section className="grid gap-3 border border-border bg-card p-4 sm:grid-cols-[2fr_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor="manifest-select">Inbound manifest</Label>
          <Combobox
            options={candidateOptions}
            value={activeId}
            onChange={setActiveId}
            placeholder={
              candidates.length === 0
                ? "No departed manifests waiting"
                : "Select a manifest in transit"
            }
            emptyMessage="No matching manifest"
          />
        </div>
        {manifest && (
          <Button
            type="button"
            onClick={finalize}
            disabled={arriveMutation.isPending}
            className="self-end"
          >
            <RiCheckLine />
            Mark Arrived
          </Button>
        )}
      </section>

      {!manifest ? (
        <EmptyState
          icon={<RiListCheck3 />}
          title="No active manifest"
          description="Pick a departed manifest above to begin scanning shipments at this hub."
        />
      ) : (
        <>
          <ArrivalAuditStats
            total={stats.total}
            scanned={stats.scanned}
            exceptions={stats.exceptions}
          />

          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <ScanningConsole
              mode="VERIFY_MANIFEST"
              onModeChange={() => {
                /* arrival-audit is locked to verify mode */
              }}
              onScan={handleScan}
              activeManifest={{
                id: manifest.id,
                manifestNumber: manifest.manifestNumber,
                fromHub: manifest.originHub,
                toHub: manifest.destHub,
              }}
            />

            <ExpectedShipmentsList
              items={items}
              onMarkException={markException}
            />
          </div>

          {hydrating && (
            <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
              Loading manifest contents…
            </p>
          )}
        </>
      )}
    </PageShell>
  )
}
