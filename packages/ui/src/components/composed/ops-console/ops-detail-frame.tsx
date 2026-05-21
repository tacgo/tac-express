import * as React from "react"
import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"
import { RiArrowLeftLine } from "@workspace/ui/icons"
import { OpsFrame } from "./ops-frame"

interface OpsDetailFrameProps {
  /** Mono label shown above the title (e.g. "SHIPMENT", "MANIFEST"). */
  eyebrow: string
  /** Primary identifier — rendered in mono with `tabular-nums` (e.g. AWB, INV-2026-…). */
  title: string
  /** Subtitle — short descriptive line. */
  sub?: React.ReactNode
  /** Right-side status pill / badge. */
  status?: React.ReactNode
  /** Top-right action cluster (print, edit, etc.). */
  actions?: React.ReactNode
  /** Back-link target. If omitted, the Back link is not rendered (no implicit `..` fallback). */
  backHref?: string
  /** Aside content — typically status + meta. */
  aside?: React.ReactNode
  children: React.ReactNode
}

/**
 * OpsDetailFrame — paper-aesthetic detail page chrome.
 *
 * Layout: 12-col grid; main content 8 cols, optional aside 4 cols. Falls back
 * to single-column when `aside` is omitted. Header has eyebrow + mono title +
 * status pill + actions, with a back link.
 */
function OpsDetailFrame({
  eyebrow,
  title,
  sub,
  status,
  actions,
  backHref,
  aside,
  children,
}: OpsDetailFrameProps) {
  return (
    <OpsFrame>
      {/* Back link */}
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 paper-eyebrow text-paper-fg-3 hover:text-paper-violet transition-colors duration-fast ease-linear mb-3 focus-visible:outline-none focus-visible:tac-focus-premium"
        >
          <RiArrowLeftLine aria-hidden className="size-3" />
          Back
        </Link>
      )}

      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-paper-line">
        <div className="min-w-0">
          <div className="paper-eyebrow">{eyebrow}</div>
          <h1 className="paper-h1 font-paper-mono tabular-nums tracking-[length:var(--tracking-id)] mt-1 break-all">
            {title}
          </h1>
          {sub && (
            <div className="font-paper-display text-[length:var(--text-paper-13)] text-paper-fg-3 mt-1.5">
              {sub}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          {status && <div>{status}</div>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>

      {/* Body */}
      <div
        className={cn(
          "grid gap-6",
          aside ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1",
        )}
      >
        <div className={cn(aside && "lg:col-span-8 space-y-4")}>{children}</div>
        {aside && (
          <aside className="lg:col-span-4 space-y-4">{aside}</aside>
        )}
      </div>
    </OpsFrame>
  )
}

export { OpsDetailFrame }
export type { OpsDetailFrameProps }
