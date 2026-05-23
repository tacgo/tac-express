import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

interface OpsFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

/**
 * OpsFrame — the bordered content frame that wraps every Paper Ops Console
 * page body. Carries corner L-tick marks at the top-left and bottom-right
 * (LAW 13: straight lines only).
 *
 * The diagonal "hazard" hatch band (`paper-hatch-band`, formerly top + bottom)
 * was removed 2026-05-23 — it read as a recurring hazard stripe on every route
 * (and flashed on dual routes during the client-side v7 swap). v7 (PageShell)
 * never had it; this aligns the v6 frame ahead of full convergence.
 *
 * Source pattern: .design-bundle/ui_kits/web_app/app.css `.frame`.
 */
function OpsFrame({ children, className, ...props }: OpsFrameProps) {
  return (
    <div
      data-slot="ops-frame"
      className={cn(
        "paper-frame-ticks relative bg-background border border-border overflow-hidden mx-6 mt-2 mb-6",
        className,
      )}
      {...props}
    >
      <span aria-hidden className="paper-tick-tl" />
      <span aria-hidden className="paper-tick-br" />
      <div className="px-8 pt-7 pb-9">{children}</div>
    </div>
  )
}

export { OpsFrame }
export type { OpsFrameProps }
