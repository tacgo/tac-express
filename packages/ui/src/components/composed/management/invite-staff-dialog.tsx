"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/primitives/dialog"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { RiUserAddLine } from "@workspace/ui/icons"
import { UserRole } from "@workspace/types"

/**
 * InviteStaffDialog — captures email + role + optional hub for an
 * account-creation invitation. Form is wired via react-hook-form +
 * zodResolver per the project's tac-forms convention (mirrors
 * customer-form, shipment-form, sign-in-form patterns).
 *
 * The role and hub controls use the project's Radix-based Select
 * primitive (LAW 14: wrap shadcn, don't rebuild) wired through
 * Controller because Radix Select is controlled via value/onValueChange
 * rather than native form events.
 *
 * Server-side delivery (Supabase admin invite-by-email) needs a
 * service-role key configured server-side. The dialog is fully
 * shape-correct so the consumer can swap a real action into onInvite
 * once the server-side wiring lands.
 */

const inviteStaffSchema = z.object({
  // .trim() before .email() so addresses with leading/trailing whitespace
  // (common from clipboard paste) normalise to valid input rather than
  // tripping the email regex.
  email: z.string().trim().email("Valid email required"),
  role: z.nativeEnum(UserRole),
  // Empty string in the form maps to null (no default hub) on submit.
  hubCode: z.string(),
})

type InviteStaffFormValues = z.infer<typeof inviteStaffSchema>

export interface InviteStaffValues {
  email: string
  role: UserRole
  hubCode: string | null
}

interface InviteStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hubOptions: { value: string; label: string }[]
  onInvite: (values: InviteStaffValues) => void | Promise<void>
}

const NO_HUB_VALUE = "__none__"

export function InviteStaffDialog({
  open,
  onOpenChange,
  hubOptions,
  onInvite,
}: InviteStaffDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<InviteStaffFormValues>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { email: "", role: UserRole.OPS, hubCode: "" },
    mode: "onChange",
  })

  React.useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  async function onSubmit(values: InviteStaffFormValues) {
    try {
      await onInvite({
        // schema trims; values.email is already normalised
        email: values.email,
        role: values.role,
        hubCode: values.hubCode || null,
      })
    } catch (error) {
      // Surface the failure inline so the user sees feedback when the
      // real server-side delivery is wired up and a delivery rejects.
      setError("email", {
        type: "manual",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Failed to send invitation. Please retry.",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Invite staff</DialogTitle>
            <DialogDescription>
              Send an account-creation link to a teammate. They&apos;ll set
              their own password on first sign-in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                autoFocus
                autoComplete="email"
                placeholder="teammate@tacexpress.in"
                {...register("email")}
                className="h-9 font-mono text-sm"
                aria-invalid={Boolean(errors.email) || undefined}
                aria-describedby={
                  errors.email ? "invite-email-error" : undefined
                }
              />
              {errors.email ? (
                <p
                  id="invite-email-error"
                  role="alert"
                  className="font-mono text-2xs text-destructive"
                >
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as UserRole)}
                  >
                    <SelectTrigger
                      id="invite-role"
                      className="h-9 w-full font-mono text-sm uppercase tracking-wider"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(UserRole).map((r) => (
                        <SelectItem
                          key={r}
                          value={r}
                          className="font-mono text-sm uppercase tracking-wider"
                        >
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-hub">Hub (optional)</Label>
              <Controller
                control={control}
                name="hubCode"
                render={({ field }) => (
                  <Select
                    value={field.value || NO_HUB_VALUE}
                    onValueChange={(v) =>
                      field.onChange(v === NO_HUB_VALUE ? "" : v)
                    }
                  >
                    <SelectTrigger
                      id="invite-hub"
                      className="h-9 w-full font-mono text-sm uppercase tracking-wider"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value={NO_HUB_VALUE}
                        className="font-mono text-sm uppercase tracking-wider"
                      >
                        — No default hub —
                      </SelectItem>
                      {hubOptions.map((h) => (
                        <SelectItem
                          key={h.value}
                          value={h.value}
                          className="font-mono text-sm uppercase tracking-wider"
                        >
                          {h.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <span className="font-mono uppercase tracking-wider">Cancel</span>
            </Button>
            <Button type="submit" size="sm" disabled={!isValid || isSubmitting}>
              <RiUserAddLine aria-hidden="true" />
              <span className="ml-1.5 font-mono uppercase tracking-wider">
                {isSubmitting ? "Sending…" : "Send invitation"}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
