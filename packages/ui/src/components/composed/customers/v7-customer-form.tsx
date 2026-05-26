"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { cn } from "@workspace/ui/lib/utils"
import { RiLoader4Line } from "@workspace/ui/icons"
import { Input } from "@workspace/ui/components/primitives/input"
import { Button } from "@workspace/ui/components/button"
import {
  FormCard,
  FormSection,
  FormGrid,
  FormField,
  FormFooter,
} from "@workspace/ui/components/composed/forms/form-primitives"

import {
  opsCustomerFormSchema,
  type OpsCustomerFormInput,
} from "@workspace/ui/components/composed/ops-console/forms/ops-customer-form"

/**
 * V7CustomerForm — Violet-Grid v7 customer create form.
 *
 * Phase 4a — first consumer of the v7 form primitives. Reuses the
 * `opsCustomerFormSchema` (zod) + `OpsCustomerFormInput` type from the
 * v6 OpsCustomerForm so the live wrapper can submit the same payload
 * regardless of which design version is active.
 *
 * Behavior is unchanged from v6: react-hook-form + zod resolver, blur
 * mode, identity fields in one section, address fields in another,
 * single submit button. The visual chrome is v7: sharp corners,
 * brutalist offset shadow, --spacing-card-pad, Plus Jakarta Sans
 * labels, no Paper Ops tracking.
 */

interface V7CustomerFormProps {
  onSubmit: (data: OpsCustomerFormInput) => Promise<void> | void
  isLoading?: boolean
  className?: string
}

function V7CustomerForm({ onSubmit, isLoading, className }: V7CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OpsCustomerFormInput>({
    resolver: zodResolver(opsCustomerFormSchema),
    mode: "onBlur",
  })

  return (
    <FormCard
      maxWidth="md"
      onSubmit={handleSubmit((d) => onSubmit(d))}
      className={cn(className)}
      noValidate
    >
      <FormSection title="Identity" description="Who is the customer?">
        <FormGrid cols={2}>
          <FormField
            fieldId="v7-cust-name"
            controlWidth="lg"
            label="Name"
            required
            error={errors.name?.message}
          >
            <Input
              id="v7-cust-name"
              placeholder="Customer name"
              aria-invalid={errors.name ? "true" : undefined}
              {...register("name")}
            />
          </FormField>
          <FormField
            fieldId="v7-cust-phone"
            controlWidth="sm"
            label="Phone"
            required
            error={errors.phone?.message}
          >
            <Input
              id="v7-cust-phone"
              inputMode="tel"
              placeholder="+91 90000 00000"
              aria-invalid={errors.phone ? "true" : undefined}
              {...register("phone")}
            />
          </FormField>
          <FormField
            fieldId="v7-cust-email"
            controlWidth="lg"
            label="Email"
            error={errors.email?.message}
          >
            <Input
              id="v7-cust-email"
              type="email"
              placeholder="name@example.com"
              aria-invalid={errors.email ? "true" : undefined}
              {...register("email")}
            />
          </FormField>
          <FormField
            fieldId="v7-cust-gstin"
            controlWidth="md"
            label="GSTIN"
            hint="Optional. 15-digit GST identification."
            error={errors.gstin?.message}
          >
            <Input
              id="v7-cust-gstin"
              placeholder="22AAAAA0000A1Z5"
              aria-invalid={errors.gstin ? "true" : undefined}
              {...register("gstin")}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Address" description="Where are they located?">
        <FormGrid cols={1}>
          <FormField
            fieldId="v7-cust-addr1"
            controlWidth="lg"
            label="Address line 1"
            required
            error={errors.addressLine1?.message}
          >
            <Input
              id="v7-cust-addr1"
              placeholder="Street, building, unit"
              aria-invalid={errors.addressLine1 ? "true" : undefined}
              {...register("addressLine1")}
            />
          </FormField>
          <FormField
            fieldId="v7-cust-addr2"
            controlWidth="lg"
            label="Address line 2"
            error={errors.addressLine2?.message}
          >
            <Input
              id="v7-cust-addr2"
              placeholder="Landmark, area (optional)"
              aria-invalid={errors.addressLine2 ? "true" : undefined}
              {...register("addressLine2")}
            />
          </FormField>
        </FormGrid>
        <FormGrid cols={2}>
          <FormField
            fieldId="v7-cust-city"
            controlWidth="md"
            label="City"
            required
            error={errors.city?.message}
          >
            <Input
              id="v7-cust-city"
              aria-invalid={errors.city ? "true" : undefined}
              {...register("city")}
            />
          </FormField>
          <FormField
            fieldId="v7-cust-state"
            controlWidth="md"
            label="State"
            required
            error={errors.state?.message}
          >
            <Input
              id="v7-cust-state"
              aria-invalid={errors.state ? "true" : undefined}
              {...register("state")}
            />
          </FormField>
          <FormField
            fieldId="v7-cust-zip"
            controlWidth="code"
            label="PIN"
            required
            error={errors.zip?.message}
          >
            <Input
              id="v7-cust-zip"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit PIN"
              aria-invalid={errors.zip ? "true" : undefined}
              {...register("zip")}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormFooter>
        <Button type="submit" disabled={isLoading} aria-label="Create customer">
          {isLoading ? (
            <>
              <RiLoader4Line className="size-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            "Create customer"
          )}
        </Button>
      </FormFooter>
    </FormCard>
  )
}

export { V7CustomerForm }
export type { V7CustomerFormProps }
