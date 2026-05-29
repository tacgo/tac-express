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
import { reconcileArrivalScan } from "@workspace/services/arrival-audit"
import { useBarcodeScanner } from "@workspace/ui/hooks/use-barcode-scanner"
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
    Promise.all(
      stableShipments.map(async (ms) => {
        try {
          const ship = await shipmentService.getShipmentByAwb(ms.awb_number)
          return {
            awbNumber: ms.awb_number,
            consigneeName: ship?.receiver?.name ?? "—",
            consigneeCity: ship?.receiver?.address?.city,
            pieces: ms.pieces ?? ship?.pieces ?? 0,
            weightKg: ms.chargeable_weight ?? ship?.weight?.chargeable ?? 0,
            status: "PENDING" as const,
          }
        } catch {
          return {
            awbNumber: ms.awb_number,
            consigneeName: "—",
            pieces: ms.pieces ?? 0,
            weightKg: ms.chargeable_weight ?? 0,
            status: "PENDING" as const,
          }
        }
      })
    ).then((rows) => {
      if (!cancelled) {
        setItems(rows)
        setHydrating(false)
      }
    })
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

  const handleScan = async (raw: string) => {
    // Classification lives in services (LAW 7); the component only applies the
    // resulting state change. A barcode that isn't a well-formed AWB or isn't
    // on this manifest is rejected without touching state or creating a record.
    const result = reconcileArrivalScan(items, raw)
    if (result.outcome === "SUCCESS" && result.matchedAwb) {
      const awb = result.matchedAwb
      setItems((prev) =>
        prev.map((i) =>
          i.awbNumber === awb
            ? { ...i, status: "SCANNED", scannedAt: new Date().toISOString() }
            : i
        )
      )
    }
    return { outcome: result.outcome, reason: result.reason }
  }

  // HID barcode capture (USB keyboard-wedge, e.g. Helett HT20). Armed only
  // while a manifest is active, so the listener is scoped to the working
  // session. A decoded scan is injected into the console via `externalScan`,
  // flowing through the SAME submit()/onScan() reconcile path manual entry
  // uses — no parallel write path. The hook ignores editable targets, so the
  // console's focused manual input keeps accepting normal typing.
  const [externalScan, setExternalScan] = React.useState<{
    code: string
    nonce: number
  } | null>(null)
  const scanNonce = React.useRef(0)

  // Drop any captured-but-unconsumed scan when the manifest context changes, so
  // a scan from manifest A can never replay against manifest B after the
  // console remounts (its nonce tracker resets while this state would persist).
  React.useEffect(() => {
    setExternalScan(null)
    scanNonce.current = 0
  }, [manifest?.id])

  useBarcodeScanner({
    enabled: Boolean(manifest),
    onScan: (code) => {
      scanNonce.current += 1
      setExternalScan({ code, nonce: scanNonce.current })
    },
  })

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
              externalScan={externalScan}
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
