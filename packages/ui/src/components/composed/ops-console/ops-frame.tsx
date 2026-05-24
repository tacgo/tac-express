import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { ContentFrame } from "../content-frame"

interface OpsFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

/**
 * OpsFrame — the bordered content frame that wraps every Paper Ops Console
 * page body. Carries corner L-tick marks at the top-left and bottom-right
 * (LAW 13: straight lines only).
 *
 * Composition: the bordered box is now bounded by ContentFrame (size
 * `content` = 1280px, centered) instead of the old `mx-6` full-width stretch.
 * This is the enterprise composition rule — ops pages center inside a bounded
 * frame rather than sprawling toward the 1600px hardware edge on ultrawide
 * monitors. Every page using OpsFrame is bounded by this one change.
 *
 * Source pattern: .design-bundle/ui_kits/web_app/app.css `.frame`.
 */
function OpsFrame({ children, className, ...props }: OpsFrameProps) {
  return (
    <ContentFrame size="content" className="mt-2 mb-6">
      <div
        data-slot="ops-frame"
        className={cn(
          "paper-frame-ticks relative bg-background border border-border overflow-hidden",
          className,
        )}
        {...props}
      >
        <span aria-hidden className="paper-tick-tl" />
        <span aria-hidden className="paper-tick-br" />
        <div className="px-8 pt-7 pb-9">{children}</div>
      </div>
    </ContentFrame>
  )
}

export { OpsFrame }
export type { OpsFrameProps }
