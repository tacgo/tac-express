import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { ContentFrame } from "../content-frame"

interface WorkflowShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

/**
 * WorkflowShell — 1120px bounded frame for multi-step create/edit flows.
 *
 * Stepper, form surface, and actions share one bound so the stepper never
 * stretches wider than the form and the right edge never goes dead.
 */
function WorkflowShell({ children, className, ...props }: WorkflowShellProps) {
  return (
    <ContentFrame size="workflow" className="mt-2 mb-6">
      <div
        data-slot="workflow-shell"
        className={cn(
          "relative bg-background border border-border overflow-hidden",
          className,
        )}
        {...props}
      >
        <div className="px-4 pt-5 pb-6 sm:px-8 sm:pt-7 sm:pb-9">{children}</div>
      </div>
    </ContentFrame>
  )
}

export { WorkflowShell }
export type { WorkflowShellProps }
