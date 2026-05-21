import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@workspace/ui/lib/utils"

/**
 * PageShell — canonical content-width wrapper for every dashboard route.
 *
 * Pre-PageShell, dashboard pages diverged: settings capped at `max-w-4xl`
 * and aligned left (right-side empty space); manifests/scanning had no cap
 * and sprawled across the full 1600px hardware frame; management /
 * notifications had no cap but sparse content read as wasted real estate.
 *
 * PageShell solves the inconsistency at the source: every page wraps its
 * content in a single shell that centers at `max-w-page-content` (80rem /
 * 1280px) and supplies the standard vertical rhythm between PageHeader
 * and the body.
 *
 * Use the `width` prop only when a route legitimately needs to escape the
 * default — e.g., a print preview that should hit the full hardware frame.
 */

const pageShellVariants = cva("mx-auto w-full", {
  variants: {
    width: {
      content: "max-w-page-content",
      wide: "max-w-page-wide",
      control: "max-w-control",
      full: "",
    },
    spacing: {
      tight: "space-y-4",
      default: "space-y-6",
      loose: "space-y-8",
    },
  },
  defaultVariants: {
    width: "content",
    spacing: "default",
  },
})

interface PageShellProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof pageShellVariants> {
  children: React.ReactNode
}

export function PageShell({
  className,
  children,
  width,
  spacing,
  ...props
}: PageShellProps) {
  return (
    <div
      data-slot="page-shell"
      data-width={width ?? "content"}
      className={cn(pageShellVariants({ width, spacing }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { pageShellVariants }
