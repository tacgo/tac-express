import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

interface SystemInfoCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Display version. Defaults to "TAC Express v1.0". */
  version?: string
  /** Display environment label. Defaults to NODE_ENV at consumer-build time. */
  environment?: string
}

/**
 * SystemInfoCard — small Settings sidebar tile surfacing build/runtime
 * metadata. Intentionally minimal — extra rows (commit SHA, deploy
 * time) get added when the values are wired through env at build time.
 */
export function SystemInfoCard({
  version = "TAC Express v1.0",
  environment,
  className,
  ...props
}: SystemInfoCardProps) {
  const env = environment ?? process.env.NODE_ENV ?? "production"
  const rows: { label: string; value: string }[] = [
    { label: "Version", value: version },
    { label: "Environment", value: env },
  ]

  return (
    <div
      data-slot="system-info-card"
      className={cn("tac-fui-panel space-y-3 bg-card p-5", className)}
      {...props}
    >
      <p className="border-b border-border pb-2 font-mono text-2xs uppercase tracking-widest text-muted-foreground">
        System information
      </p>
      <div className="space-y-2">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between py-1"
          >
            <span className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
              {label}
            </span>
            <span className="font-mono text-xs text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
