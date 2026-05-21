"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useCreateRateCard } from "@workspace/services/hooks/use-rate-cards"
import {
  OpsRateCardForm,
  type OpsRateCardFormInput,
} from "@workspace/ui/components/composed/ops-console/forms"

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

  return <OpsRateCardForm onSubmit={onSubmit} isLoading={isPending} />
}
