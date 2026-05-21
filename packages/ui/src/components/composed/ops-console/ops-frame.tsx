import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

interface OpsFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

/**
 * OpsFrame — the bordered content frame that wraps every Paper Ops Console
 * page body. Carries the project's signature **diagonal hatch stripe** along
 * the top and bottom edges and corner L-tick marks at the top-left and
 * bottom-right (LAW 13: straight lines only — the hatch is a 135° diagonal,
 * still straight).
 *
 * Source pattern: .design-bundle/ui_kits/web_app/app.css `.frame`.
 */
function OpsFrame({ children, className, ...props }: OpsFrameProps) {
  return (
    <div
      data-slot="ops-frame"
      className={cn(
        "paper-frame-ticks relative bg-paper-bg border border-paper-line overflow-hidden mx-6 mt-2 mb-6",
        className,
      )}
      {...props}
    >
      <div aria-hidden className="paper-hatch-band" />
      <span aria-hidden className="paper-tick-tl" />
      <span aria-hidden className="paper-tick-br" />
      <div className="px-8 pt-7 pb-9">{children}</div>
      <div aria-hidden className="paper-hatch-band" />
    </div>
  )
}

export { OpsFrame }
export type { OpsFrameProps }
