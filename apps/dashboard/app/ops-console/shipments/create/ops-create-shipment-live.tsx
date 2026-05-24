"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useCreateShipment } from "@workspace/services/hooks/use-shipments"
import type { CreateShipmentInput } from "@workspace/ui/components/composed/shipments/create-shipment-schema"
import { V7CreateShipmentWizard } from "@workspace/ui/components/composed/shipments/v7-create-shipment-wizard"

/**
 * Multi-step shipment wizard — restored 2026-05-13.
 *
 * History: this surface was downgraded to a single-page `OpsShipmentForm`
 * during the shadcn transformation (commit eaa7f67, 2026-05-12). The
 * `CreateShipmentForm` wizard (4 steps: Sender → Receiver → Package →
 * Review) with `SmartAddressFields` pincode autocomplete and live
 * volumetric-weight preview was never deleted from
 * `packages/ui/src/components/composed/shipments/`, so this restoration is
 * a re-wire of the route shell, not a rebuild. See
 * `docs/v6-mvp-regression-audit.md` for the full audit.
 *
 * Volumetric weight rule: `volumetric = L × B × H / 5000` (cm → kg),
 * `chargeable = max(actual, volumetric)`. Both stored alongside the
 * dead-weight for billing audits downstream.
 *
 * Routing: lives at `/ops-console/shipments/create`; on success redirects
 * to `/ops-console/shipments/<id>`.
 */
export function OpsCreateShipmentLive() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateShipment()

  const onSubmit = async (data: CreateShipmentInput) => {
    try {
      const volumetric = (data.length * data.breadth * data.height) / 5000
      const chargeable = Math.max(data.weight, volumetric)
      const shipment = await mutateAsync({
        sender_name: data.senderName,
        sender_phone: data.senderPhone,
        sender_address: data.senderAddress,
        sender_city: data.senderCity,
        sender_state: data.senderState,
        sender_pincode: data.senderPincode,
        receiver_name: data.receiverName,
        receiver_phone: data.receiverPhone,
        receiver_address: data.receiverAddress,
        receiver_city: data.receiverCity,
        receiver_state: data.receiverState,
        receiver_pincode: data.receiverPincode,
        dead_weight: data.weight,
        volumetric_weight: volumetric,
        chargeable_weight: chargeable,
        financials: { declaredValue: data.declaredValue },
        description: data.description,
        payment_mode: data.paymentMode,
        service_level: data.serviceType,
      })
      toast.success(`Shipment ${shipment.awbNumber} created`)
      router.push(`/ops-console/shipments/${shipment.id}`)
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : JSON.stringify(err)
      toast.error(`Failed to create shipment: ${msg}`)
      console.error("[OpsCreateShipmentLive]", { message: msg, raw: err })
    }
  }

  // Canonical v7 — v6 CreateShipmentForm retired in Phase 5.
  return <V7CreateShipmentWizard onSubmit={onSubmit} isLoading={isPending} />
}
