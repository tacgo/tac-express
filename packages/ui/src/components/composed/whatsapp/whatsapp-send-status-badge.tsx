import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import type { WhatsAppSendStatus } from "@workspace/types"

/**
 * Brutalist status badge for `whatsapp_sends.status` values.
 *
 * Mirrors the established project pattern from
 * `packages/ui/src/components/composed/exceptions/exception-severity-badge.tsx`
 * (PR #114 era): font-mono, uppercase, brutalist border, no radius. Uses
 * SEMANTIC tokens only — no Tailwind color classes, no arbitrary values.
 * Status text appears in the badge so a11y does NOT rely on color alone.
 *
 * Single-source-of-truth: a future refactor could consolidate this with
 * the exception badges into one parameterizable component. Not bundled
 * here (PR #146 cadence rule — out-of-scope refactor).
 */

const STATUS_STYLES: Record<WhatsAppSendStatus, string> = {
  queued: "text-accent-warning border-accent-warning/40 bg-accent-warning/5",
  sent: "text-primary border-primary/40 bg-primary/5",
  failed: "text-destructive border-destructive/40 bg-destructive/5",
}

interface WhatsAppSendStatusBadgeProps {
  status: WhatsAppSendStatus
  className?: string
}

function WhatsAppSendStatusBadge({
  status,
  className,
}: WhatsAppSendStatusBadgeProps) {
  return (
    <span
      data-slot="whatsapp-send-status-badge"
      className={cn(
        "font-mono text-2xs uppercase tracking-wider border px-1.5 py-0.5",
        STATUS_STYLES[status],
        className,
      )}
    >
      {status}
    </span>
  )
}

export { WhatsAppSendStatusBadge }
export type { WhatsAppSendStatusBadgeProps }
