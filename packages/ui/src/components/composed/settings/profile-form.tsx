"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"

/**
 * ProfileForm — display-name + hub-code form for the Settings page.
 *
 * Owns its own react-hook-form + zodResolver state per the project's
 * tac-forms convention (the consuming Settings page is not allowed to
 * declare RHF directly because react-hook-form lives in packages/ui's
 * dependency closure, not apps/dashboard's). The hubCode field is
 * uppercased on submit (not as the user types — keeps the input
 * controlled by RHF without a Controller wrapper).
 *
 * Lifts live form values via the optional `onValuesChange` callback so
 * the consuming page can bind sidebar widgets like
 * `ProfileCompletionCard` to the in-flight values without duplicating
 * the form state.
 */

const profileSchema = z.object({
  name: z.string(),
  hubCode: z.string(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export interface ProfileSubmitValues {
  name: string
  hubCode: string | undefined
}

interface ProfileFormProps {
  email: string
  defaultValues: ProfileFormValues
  /** Disable the submit button + render the busy label. */
  isSaving?: boolean
  /** Show "Saved." after a successful save. Consumer handles fade-out. */
  saved?: boolean
  onSubmit: (values: ProfileSubmitValues) => Promise<void> | void
  /** Fires on every form-state change. Useful for lifting live values
   *  up to sidebar widgets that mirror the form (e.g. completion meters). */
  onValuesChange?: (values: ProfileFormValues) => void
  className?: string
}

export function ProfileForm({
  email,
  defaultValues,
  isSaving,
  saved,
  onSubmit,
  onValuesChange,
  className,
}: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  })

  // Re-hydrate when the consumer's defaultValues change (e.g. session
  // resolves after first render). reset() also clears the dirty flag.
  // Pushes the new values to onValuesChange too — watch() doesn't fire
  // on programmatic resets, so without this the sidebar widgets that
  // depend on onValuesChange would stay stale until the user types.
  React.useEffect(() => {
    reset(defaultValues)
    onValuesChange?.({
      name: defaultValues.name ?? "",
      hubCode: defaultValues.hubCode ?? "",
    })
  }, [defaultValues, onValuesChange, reset])

  // Lift live values to the consumer for sidebar widget binding.
  React.useEffect(() => {
    if (!onValuesChange) return
    const subscription = watch((values) => {
      onValuesChange({
        name: values.name ?? "",
        hubCode: values.hubCode ?? "",
      })
    })
    return () => subscription.unsubscribe()
  }, [watch, onValuesChange])

  async function handle(values: ProfileFormValues) {
    const normalized: ProfileSubmitValues = {
      name: values.name.trim(),
      hubCode: values.hubCode.trim().toUpperCase() || undefined,
    }
    await onSubmit(normalized)
    reset({ name: normalized.name, hubCode: normalized.hubCode ?? "" })
  }

  const busy = Boolean(isSaving) || isSubmitting

  return (
    <form
      data-slot="profile-form"
      onSubmit={handleSubmit(handle)}
      className={cn("tac-fui-panel space-y-4 bg-card p-5", className)}
    >
      <p className="border-b border-border pb-2 font-mono text-2xs uppercase tracking-widest text-muted-foreground">
        Profile
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          value={email}
          readOnly
          aria-readonly="true"
          className={cn(
            "h-9 bg-muted/30 font-mono text-sm uppercase tracking-wider text-muted-foreground",
          )}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="profile-name">Display name</Label>
        <Input
          id="profile-name"
          {...register("name")}
          className="h-9 font-mono text-sm uppercase"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="profile-hub-code">Hub code</Label>
        <Input
          id="profile-hub-code"
          {...register("hubCode")}
          placeholder="e.g. IMPHAL"
          className="h-9 font-mono text-sm uppercase"
        />
      </div>
      <div className="flex items-center justify-between pt-1">
        {saved ? (
          <p className="font-mono text-xs text-primary">Saved.</p>
        ) : null}
        <div className="ml-auto">
          <Button
            type="submit"
            disabled={busy || !isDirty}
            className="h-8 px-5 font-mono text-xs uppercase tracking-wider"
          >
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  )
}
