import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { ContentFrame, type ContentFrameProps } from "../content-frame"

interface OpsFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  /**
   * Bounded composition measure. `content` (1280px) for data/overview pages
   * (default); `workflow` (1120px) for multi-step create flows so the stepper
   * + form share one bound. Maps to ContentFrame sizes.
   */
  size?: Extract<ContentFrameProps["size"], "content" | "workflow" | "table">
}

/**
 * OpsFrame — the bordered content frame that wraps every Paper Ops Console
 * page body. Carries corner L-tick marks at the top-left and bottom-right
 * (LAW 13: straight lines only).
 *
 * Composition: the bordered box is bounded by ContentFrame (centered) instead
 * of the old `mx-6` full-width stretch — ops pages center inside a bounded
 * frame rather than sprawling toward the 1600px hardware edge on ultrawide
 * monitors. `size` selects the measure (content 1280 default / workflow 1120 /
 * table 1380).
 *
 * Source pattern: .design-bundle/ui_kits/web_app/app.css `.frame`.
 */
function OpsFrame({ children, className, size = "content", ...props }: OpsFrameProps) {
  return (
    <ContentFrame size={size} className="mt-2 mb-6">
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

/**
 * WorkflowShell — the bounded multi-step workflow frame (1120px, centered).
 *
 * Enterprise workflow rule: the stepper, form surface, and actions all share
 * ONE bound, so the stepper never stretches wider than the form and the right
 * edge never goes dead. A thin specialization of OpsFrame at the `workflow`
 * measure — used by create/edit flows (invoice, shipment, manifest).
 */
function WorkflowShell({ children, ...props }: Omit<OpsFrameProps, "size">) {
  return (
    <OpsFrame size="workflow" {...props}>
      {children}
    </OpsFrame>
  )
}

export { OpsFrame, WorkflowShell }
export type { OpsFrameProps }
