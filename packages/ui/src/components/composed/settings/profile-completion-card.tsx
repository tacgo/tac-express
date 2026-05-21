import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { RiCheckLine } from "@workspace/ui/icons"

export interface ProfileField {
  label: string
  filled: boolean
}

interface ProfileCompletionCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Tracked profile fields. The card computes percentage = filled/total. */
  fields: ProfileField[]
}

/**
 * ProfileCompletionCard — small "you're N% done" nudge to encourage
 * operators to fill in optional profile fields that improve UX
 * downstream (display name shows in audit logs and notifications;
 * hub code unlocks default routing in create-shipment pickers).
 *
 * Generic over an arbitrary list of tracked fields so future profile
 * surfaces (avatar, phone, MFA enrollment, etc.) can pass their own
 * tracking shape without changing the card.
 */
export function ProfileCompletionCard({
  fields,
  className,
  ...props
}: ProfileCompletionCardProps) {
  const total = fields.length
  const filled = fields.filter((f) => f.filled).length
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0
  const missingCount = total - filled

  return (
    <div
      data-slot="profile-completion-card"
      className={cn("tac-fui-panel space-y-3 bg-card p-5", className)}
      {...props}
    >
      <p className="border-b border-border pb-2 font-mono text-2xs uppercase tracking-widest text-muted-foreground">
        Profile completion
      </p>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-3xl font-light tabular-nums text-foreground">
            {percent}
            <span className="ml-0.5 text-base text-muted-foreground">%</span>
          </span>
          <span className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
            {missingCount === 0 ? "Complete" : `${missingCount} pending`}
          </span>
        </div>

        <div
          className="h-1 w-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completion"
        >
          {/* Inline transitionDuration sidesteps the recurring debate
              about the right Tailwind class form for this token (built-in
              `duration-150` vs themed `duration-base` vs arbitrary
              `duration-[var(--duration-base)]`). The CSS variable
              reference is unambiguous and survives any future Tailwind
              utility renames. */}
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${percent}%`,
              transitionDuration: "var(--duration-base)",
            }}
          />
        </div>
      </div>

      <ul className="space-y-1.5 pt-1">
        {fields.map((f) => (
          <li
            key={f.label}
            className="flex items-center gap-2 font-mono text-2xs uppercase tracking-widest"
          >
            {f.filled ? (
              <RiCheckLine className="size-3 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <span
                className="inline-block size-1.5 shrink-0 bg-muted-foreground"
                aria-hidden="true"
              />
            )}
            <span className={f.filled ? "text-foreground" : "text-muted-foreground"}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
