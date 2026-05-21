import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

type OpsAccessFallbackReason = "unauthenticated" | "forbidden"

interface OpsAccessFallbackProps {
  reason: OpsAccessFallbackReason
  requiredRole?: string
  className?: string
}

const COPY: Record<OpsAccessFallbackReason, { headline: string; body: string }> = {
  unauthenticated: {
    headline: "Sign in required.",
    body: "This view is only available to signed-in operators.",
  },
  forbidden: {
    headline: "Not authorized.",
    body: "This view requires a higher role.",
  },
}

function OpsAccessFallback({
  reason,
  requiredRole,
  className,
}: OpsAccessFallbackProps) {
  const copy = COPY[reason]
  const body =
    reason === "forbidden" && requiredRole
      ? `This view requires ${requiredRole} role or above.`
      : copy.body
  return (
    <div
      data-slot="ops-access-fallback"
      data-reason={reason}
      role="status"
      className={cn("p-6 t-data text-muted-foreground", className)}
    >
      <p className="font-medium text-foreground">{copy.headline}</p>
      <p className="mt-1">{body}</p>
    </div>
  )
}

export { OpsAccessFallback }
export type { OpsAccessFallbackProps, OpsAccessFallbackReason }
