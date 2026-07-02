"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  useCreateManifest,
  useAddShipmentToManifest,
  useCloseManifest,
} from "@workspace/services/hooks/use-manifests"
import { useHubs } from "@workspace/services/hooks/use-hubs"
import { shipmentService } from "@workspace/services/hooks/use-shipments"
import { useNotificationStore } from "@workspace/services/stores/notification.store"

import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { ManifestBuilderWizard } from "@workspace/ui/components/composed/manifests/manifest-builder/manifest-builder-wizard"
import type { ManifestSetupValue } from "@workspace/ui/components/composed/manifests/manifest-builder/step-setup"
import type {
  ManifestShipmentRow,
  ScanResult,
} from "@workspace/ui/components/composed/manifests/manifest-builder/step-add-shipments"

/**
 * Multi-step manifest builder — restored 2026-05-13.
 *
 * History: this surface was downgraded to a 4-field MVP form during the
 * shadcn transformation (commit eaa7f67, 2026-05-12). The
 * ManifestBuilderWizard primitive + its 3 step files (setup / add-shipments
 * / review) were never deleted from
 * `packages/ui/src/components/composed/manifests/manifest-builder/`, so
 * this restoration is a re-wire of the route shell, not a rebuild.
 * See `docs/v6-mvp-regression-audit.md` for the full audit.
 *
 * Features preserved from v6:
 *  - 4-step builder (Setup → Add Shipments → Review → Close)
 *  - Hub combobox driven by `useHubs(true)` with `name · code` labels
 *  - Barcode-scan / type AWB loop in step 2: pre-validate via
 *    `shipmentService.getShipmentByAwb`, attach via `useAddShipmentToManifest`,
 *    build running table of consignor/consignee/pieces/weight/status
 *  - `SUCCESS` / `DUPLICATE` / `ERROR` scan-result branching with reason
 *  - Save (keeps manifest BUILDING/Open, editable from detail page) vs
 *    Close (locks loadlist into CLOSED, ready to depart)
 *  - Notification-store toasts that persist to the notifications panel
 *
 * Routing: lives at `/ops-console/manifests/create`; on save/close
 * redirects to `/ops-console/manifests/<id>` (was `/manifests/<id>` in v6,
 * before the single-shell consolidation).
 */
export function OpsCreateManifestLive() {
  const router = useRouter()
  const { data: rawHubs } = useHubs(true)
  const createManifest = useCreateManifest()
  const addAwb = useAddShipmentToManifest()
  const closeManifest = useCloseManifest()
  const addNotification = useNotificationStore((s) => s.addNotification)

  const hubOptions = React.useMemo(
    () =>
      (rawHubs ?? []).map((h) => ({
        value: h.id,
        label: `${h.name} · ${h.code}`,
      })),
    [rawHubs],
  )

  const hubByCode = React.useCallback(
    (id: string) => (rawHubs ?? []).find((h) => h.id === id)?.code ?? id,
    [rawHubs],
  )

  const handleSetupCommit = async (setup: ManifestSetupValue) => {
    const m = await createManifest.mutateAsync({
      transportMode: setup.type,
      originHub: hubByCode(setup.fromHubId),
      destHub: hubByCode(setup.toHubId),
      notes: setup.notes,
    })
    return { manifestId: m.id }
  }

  const handleAddAwb = async (manifestId: string, awb: string) => {
    try {
      // Pre-validate the AWB exists before attempting to attach. This keeps
      // the error UX scoped to "AWB not found" instead of bubbling a 4xx
      // from the manifest-shipment join.
      const shipment = await shipmentService.getShipmentByAwb(awb)
      if (!shipment) {
        return { result: "ERROR" as ScanResult, reason: "AWB not found" }
      }
      await addAwb.mutateAsync({ manifestId, awb })
      const row: ManifestShipmentRow = {
        awbNumber: shipment.awbNumber,
        consigneeName: shipment.receiver?.name,
        consigneeCity: shipment.receiver?.address?.city,
        consignorName: shipment.sender?.name,
        consignorCity: shipment.sender?.address?.city,
        pieces: shipment.pieces,
        weightKg: shipment.weight?.chargeable,
        status: shipment.status,
      }
      return { result: "SUCCESS" as ScanResult, row }
    } catch (err) {
      const msg = (err as Error).message
      const result: ScanResult = /duplicate|already/i.test(msg)
        ? "DUPLICATE"
        : "ERROR"
      return { result, reason: msg }
    }
  }

  const handleSaveOpen = async (manifestId: string) => {
    // Manifest stays in BUILDING / Open; navigate to the detail page where
    // operators can reopen, add more AWBs, or close it later.
    addNotification({
      type: "success",
      title: "Manifest saved",
      message: "Open — still editable from the manifest detail page.",
    })
    router.push(`/ops-console/manifests/${manifestId}`)
  }

  const handleClose = async (manifestId: string) => {
    await closeManifest.mutateAsync(manifestId)
    addNotification({
      type: "success",
      title: "Manifest closed",
      message: "Loadlist locked. Ready to depart.",
    })
    router.push(`/ops-console/manifests/${manifestId}`)
  }

  return (
    <PageShell width="wide">
      <ManifestBuilderWizard
        hubs={hubOptions}
        onSetupCommit={handleSetupCommit}
        onAddAwb={handleAddAwb}
        onSaveOpen={handleSaveOpen}
        onClose={handleClose}
        onExit={() => router.push("/ops-console/manifests")}
      />
    </PageShell>
  )
}
