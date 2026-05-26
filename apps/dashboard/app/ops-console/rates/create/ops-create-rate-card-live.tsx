"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useCreateRateCard } from "@workspace/services/hooks/use-rate-cards"
import { type OpsRateCardFormInput } from "@workspace/ui/components/composed/ops-console/forms"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { V7RateCardForm } from "@workspace/ui/components/composed/rates/v7-rate-card-form"

export function OpsCreateRateCardLive() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateRateCard()

  const onSubmit = async (data: OpsRateCardFormInput) => {
    try {
      await mutateAsync({
        originHub: data.originHub.toUpperCase(),
        destHub: data.destHub.toUpperCase(),
        serviceLevel: data.serviceLevel,
        weightSlabMin: data.weightSlabMin,
        weightSlabMax: data.weightSlabMax,
        ratePerKg: data.ratePerKg,
        docketCharge: data.docketCharge,
        fuelSurchargePct: data.fuelSurchargePct,
        handlingFee: data.handlingFee,
      })
      toast.success(`Rate card ${data.originHub} → ${data.destHub} added`)
      router.push("/ops-console/rates")
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : String(err)
      toast.error(`Failed to add rate card: ${msg}`)
    }
  }

  // Canonical v7 — v6 OpsRateCardForm render retired in Phase 10a. Its zod
  // schema + OpsRateCardFormInput type are still consumed by V7RateCardForm,
  // so the v6 form module stays as the schema home (mirrors V7CustomerForm).
  return (
    <PageShell width="wide">
      <V7RateCardForm onSubmit={onSubmit} isLoading={isPending} />
    </PageShell>
  )
}
