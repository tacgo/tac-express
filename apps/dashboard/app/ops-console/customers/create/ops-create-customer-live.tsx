"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useCreateCustomer } from "@workspace/services/hooks/use-customers"
import { type OpsCustomerFormInput } from "@workspace/ui/components/composed/ops-console/forms"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { V7CustomerForm } from "@workspace/ui/components/composed/customers/v7-customer-form"

export function OpsCreateCustomerLive() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateCustomer()

  const onSubmit = async (data: OpsCustomerFormInput) => {
    try {
      const customer = await mutateAsync({
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        gstin: data.gstin || undefined,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || undefined,
        city: data.city,
        state: data.state,
        zip: data.zip,
      })
      toast.success(`Customer ${customer.name} created`)
      router.push(`/ops-console/customers/${customer.id}`)
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : String(err)
      toast.error(`Failed to create customer: ${msg}`)
    }
  }

  // Canonical v7 — v6 OpsCustomerForm render retired in Phase 5. (Its zod
  // schema + OpsCustomerFormInput type are still consumed by V7CustomerForm,
  // so the form module stays as the schema home pending a types rehome.)
  return (
    <PageShell width="wide">
      <V7CustomerForm onSubmit={onSubmit} isLoading={isPending} />
    </PageShell>
  )
}
