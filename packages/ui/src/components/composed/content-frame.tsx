import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

/**
 * ContentFrame — the canonical bounded-composition wrapper for TAC Express.
 *
 * The enterprise composition rule: content is NEVER stretched edge-to-edge.
 * Every surface centers inside one bounded measure so an ultrawide ops monitor
 * reads as a composed operating system, not a sprawled admin template.
 *
 * Sizes (mapped to the `--spacing-frame-*` tokens):
 *   - `shell`    1440px — outermost page bound
 *   - `content`  1280px — primary content frame (DEFAULT)
 *   - `table`    1380px — data-heavy table surfaces
 *   - `workflow` 1120px — bounded multi-step workflows / forms
 *   - `full`     unbounded — escape hatch (print surfaces only)
 *
 * Identity unchanged: this is a layout wrapper only — no borders, radius, or
 * color. Sharp Violet Grid surfaces compose *inside* it.
 *
 * Relationship to PageShell: ContentFrame is the go-forward consolidation of
 * the per-route width contract. PageShell remains for existing v7 routes; new
 * surfaces (and the ops frame) bound via ContentFrame.
 */
const contentFrameVariants = cva("mx-auto w-full", {
  variants: {
    size: {
      shell: "max-w-frame-shell",
      content: "max-w-frame-content",
      table: "max-w-frame-table",
      workflow: "max-w-frame-workflow",
      full: "",
    },
  },
  defaultVariants: {
    size: "content",
  },
})

interface ContentFrameProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof contentFrameVariants> {}

function ContentFrame({ className, size, ...props }: ContentFrameProps) {
  return (
    <div
      data-slot="content-frame"
      data-size={size ?? "content"}
      className={cn(contentFrameVariants({ size }), className)}
      {...props}
    />
  )
}

export { ContentFrame, contentFrameVariants }
export type { ContentFrameProps }
