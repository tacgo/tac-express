"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { cn } from "@workspace/ui/lib/utils"
import {
  RiUserLine,
  RiMapPinLine,
  RiAddLine,
  RiLoaderLine,
} from "@workspace/ui/icons"

import { OpsCard } from "../ops-card"
import { OpsButton } from "../ops-button"
import { OpsFieldInput, OpsFieldLabel } from "../ops-field"

export const opsCustomerFormSchema = z.object({
  name: z.string().min(2, "Name required"),
  phone: z.string().min(10, "Valid phone required"),
  email: z.string().email("Valid email").optional().or(z.literal("")),
  gstin: z.string().optional().or(z.literal("")),
  addressLine1: z.string().min(5, "Address required"),
  addressLine2: z.string().optional().or(z.literal("")),
  city: z.string().min(2, "City required"),
  state: z.string().min(2, "State required"),
  zip: z.string().length(6, "6-digit PIN required"),
})

export type OpsCustomerFormInput = z.infer<typeof opsCustomerFormSchema>

interface OpsCustomerFormProps {
  onSubmit: (data: OpsCustomerFormInput) => Promise<void> | void
  isLoading?: boolean
  className?: string
}

interface FieldErrorProps {
  id?: string
  message?: string
}

function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null
  return (
    <p
      id={id}
      role="alert"
      className="font-paper-mono text-paper-err text-[length:var(--text-ui-11)] mt-1"
    >
      {message}
    </p>
  )
}

export function OpsCustomerForm({ onSubmit, isLoading, className }: OpsCustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OpsCustomerFormInput>({
    resolver: zodResolver(opsCustomerFormSchema),
    mode: "onBlur",
  })

  // a11y helper: every input gets aria-invalid + aria-describedby pointing
  // at its error message when validation fails. Closes R0 audit C1.
  // WCAG 4.1.3 Status Messages (AA) + 3.3.1 Error Identification (A).
  const errorAttrs = (id: string, hasError: boolean) =>
    hasError
      ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` }
      : {}

  return (
    <form
      onSubmit={handleSubmit((d) => onSubmit(d))}
      className={cn("space-y-4", className)}
      noValidate
    >
      <OpsCard ticks className="p-6">
        <div className="flex items-center gap-2 paper-eyebrow mb-4">
          <RiUserLine aria-hidden className="size-3.5" />
          <span>Contact</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <OpsFieldLabel htmlFor="cust-name">Name</OpsFieldLabel>
            <OpsFieldInput
              id="cust-name"
              placeholder="FULL NAME"
              {...register("name")}
              {...errorAttrs("cust-name", !!errors.name)}
            />
            <FieldError id="cust-name-error" message={errors.name?.message} />
          </div>
          <div>
            <OpsFieldLabel htmlFor="cust-phone">Phone</OpsFieldLabel>
            <OpsFieldInput
              id="cust-phone"
              inputMode="tel"
              placeholder="10 DIGITS"
              {...register("phone")}
              {...errorAttrs("cust-phone", !!errors.phone)}
            />
            <FieldError id="cust-phone-error" message={errors.phone?.message} />
          </div>
          <div>
            <OpsFieldLabel htmlFor="cust-email">Email (optional)</OpsFieldLabel>
            <OpsFieldInput
              id="cust-email"
              type="email"
              placeholder="NAME@DOMAIN.COM"
              {...register("email")}
              {...errorAttrs("cust-email", !!errors.email)}
            />
            <FieldError id="cust-email-error" message={errors.email?.message} />
          </div>
          <div>
            <OpsFieldLabel htmlFor="cust-gstin">GSTIN (optional)</OpsFieldLabel>
            <OpsFieldInput
              id="cust-gstin"
              placeholder="15-CHAR GSTIN"
              {...register("gstin")}
              {...errorAttrs("cust-gstin", !!errors.gstin)}
            />
            <FieldError id="cust-gstin-error" message={errors.gstin?.message} />
          </div>
        </div>
      </OpsCard>

      <OpsCard ticks className="p-6">
        <div className="flex items-center gap-2 paper-eyebrow mb-4">
          <RiMapPinLine aria-hidden className="size-3.5" />
          <span>Address</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <OpsFieldLabel htmlFor="cust-line1">Address Line 1</OpsFieldLabel>
            <OpsFieldInput
              id="cust-line1"
              placeholder="STREET / BUILDING"
              {...register("addressLine1")}
              {...errorAttrs("cust-line1", !!errors.addressLine1)}
            />
            <FieldError id="cust-line1-error" message={errors.addressLine1?.message} />
          </div>
          <div className="col-span-3">
            <OpsFieldLabel htmlFor="cust-line2">Line 2 (optional)</OpsFieldLabel>
            <OpsFieldInput
              id="cust-line2"
              placeholder="AREA / LANDMARK"
              {...register("addressLine2")}
            />
          </div>
          <div>
            <OpsFieldLabel htmlFor="cust-city">City</OpsFieldLabel>
            <OpsFieldInput
              id="cust-city"
              placeholder="CITY"
              {...register("city")}
              {...errorAttrs("cust-city", !!errors.city)}
            />
            <FieldError id="cust-city-error" message={errors.city?.message} />
          </div>
          <div>
            <OpsFieldLabel htmlFor="cust-state">State</OpsFieldLabel>
            <OpsFieldInput
              id="cust-state"
              placeholder="STATE"
              {...register("state")}
              {...errorAttrs("cust-state", !!errors.state)}
            />
            <FieldError id="cust-state-error" message={errors.state?.message} />
          </div>
          <div>
            <OpsFieldLabel htmlFor="cust-zip">PIN</OpsFieldLabel>
            <OpsFieldInput
              id="cust-zip"
              inputMode="numeric"
              placeholder="6 DIGITS"
              {...register("zip")}
              {...errorAttrs("cust-zip", !!errors.zip)}
            />
            <FieldError id="cust-zip-error" message={errors.zip?.message} />
          </div>
        </div>
      </OpsCard>

      <div className="flex items-center justify-end gap-2 border-t border-paper-line pt-4">
        <OpsButton type="reset" variant="ghost">Reset</OpsButton>
        <OpsButton type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? (
            <>
              <RiLoaderLine aria-hidden className="size-3 animate-spin motion-reduce:animate-none" />
              Saving…
            </>
          ) : (
            <>
              <RiAddLine aria-hidden className="size-3" />
              Save Customer
            </>
          )}
        </OpsButton>
      </div>
    </form>
  )
}
