"use client"

import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"
import { useDesignVersion } from "@workspace/ui/hooks/use-design-version"
import { useRBAC } from "@workspace/ui/hooks/use-rbac"
import type { DesignVersion } from "@workspace/ui/lib/design-flag"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/primitives/radio-group"
import { Label } from "@workspace/ui/components/primitives/label"

const adminDesignVersionToggleVariants = cva(
  "flex flex-col gap-3 border border-border bg-card p-card-pad text-card-foreground shadow-brutal-sm"
)

/**
 * AdminDesignVersionToggle — admin-only Settings widget for flipping the
 * design-version flag (Layer 3 of the rollback playbook).
 *
 * Renders nothing for non-admin users. Reads / writes
 * `localStorage['tac-design']` via `useDesignVersion`, which is also
 * consumed by composed components that branch on the active design.
 *
 * The deploy-wide default still comes from `NEXT_PUBLIC_DESIGN`; this
 * widget only sets the per-session override.
 *
 * See `docs/ROLLBACK-PLAYBOOK.md § NextAdmin Refactor → Layer 3`.
 */

const OPTIONS: Array<{
  value: DesignVersion
  label: string
  description: string
}> = [
  {
    value: "v6",
    label: "v6 — Violet Grid (current)",
    description: "The shipped Violet Grid design system.",
  },
  {
    value: "v7",
    label: "v7 — NextAdmin refactor (in progress)",
    description: "Phase-gated rollout of the wider page rhythm + new primitives.",
  },
]

interface AdminDesignVersionToggleProps {
  className?: string
}

function isDesignVersion(value: string): value is DesignVersion {
  return value === "v6" || value === "v7"
}

function AdminDesignVersionToggle({ className }: AdminDesignVersionToggleProps) {
  const { isAdmin, isLoading } = useRBAC()
  const { version, setVersion } = useDesignVersion()
  // Instance-scoped prefix so multiple toggles on the same page don't collide
  // on `aria-labelledby` / `htmlFor` bindings (WCAG 2.1 AA).
  const instanceId = React.useId()
  const headingId = `${instanceId}-heading`

  if (isLoading || !isAdmin) return null

  return (
    <section
      data-slot="admin-design-version-toggle"
      aria-labelledby={headingId}
      className={cn(adminDesignVersionToggleVariants(), className)}
    >
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="t-overline text-muted-foreground">
          Design version (admin)
        </h3>
        <p className="t-caption text-muted-foreground">
          Per-session override of the active dashboard design. Resets on sign-out.
        </p>
      </div>

      <RadioGroup
        value={version}
        aria-labelledby={headingId}
        onValueChange={(value) => {
          if (isDesignVersion(value)) setVersion(value)
        }}
        className="gap-3"
      >
        {OPTIONS.map((option) => {
          const id = `${instanceId}-${option.value}`
          return (
            <div key={option.value} className="flex items-start gap-3">
              <RadioGroupItem id={id} value={option.value} className="mt-0.5" />
              <Label htmlFor={id} className="flex flex-col gap-0.5 cursor-pointer">
                <span className="t-data text-foreground">
                  {option.label}
                </span>
                <span className="t-caption text-muted-foreground">
                  {option.description}
                </span>
              </Label>
            </div>
          )
        })}
      </RadioGroup>
    </section>
  )
}

export { AdminDesignVersionToggle }
