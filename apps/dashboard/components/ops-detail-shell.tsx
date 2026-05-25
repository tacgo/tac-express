"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"
import { RiArrowLeftLine } from "@workspace/ui/icons"
import { PageShell } from "@workspace/ui/components/composed/page-shell"

/**
 * Shared detail-page composition for the ops-console `[id]` routes — the v7
 * replacement for the retired Paper `OpsDetailFrame`. Co-located in
 * apps/dashboard/components (not packages/ui) per the Approach-A decision:
 * direct composition in the app layer, mirroring customers/[id], rather than
 * a packages/ui V7DetailFrame primitive. Consumed by finance/[id],
 * manifests/[id], and shipments/[id].
 */

/** Mono field-key label — muted; the v7 token equivalent of the paper-label class. */
export const FIELD_LABEL =
  "font-mono text-2xs uppercase tracking-widest text-muted-foreground"

/** Status-pill tone → v7 outline-Badge class. Shared across the detail routes. */
export const STATUS_TONE_CLASS: Record<
  "neutral" | "ok" | "warn" | "err" | "violet",
  string
> = {
  neutral: "border-border text-muted-foreground",
  ok: "border-accent-success/30 bg-accent-success/15 text-accent-success",
  warn: "border-accent-warning/30 bg-accent-warning/15 text-accent-warning",
  err: "border-destructive/30 bg-destructive/15 text-destructive",
  violet: "border-primary/30 bg-primary/15 text-primary",
}

interface DetailShellProps {
  /** Mono label above the title (e.g. "Invoice", "Manifest", "Shipment · AWB"). */
  eyebrow: string
  /** Primary identifier — rendered mono + tabular-nums (AWB, INV-…, manifest #). */
  title: string
  /** Short descriptive sub-line. */
  sub?: React.ReactNode
  /** Right-side status pill. */
  status?: React.ReactNode
  /** Top-right action cluster (print, etc.). */
  actions?: React.ReactNode
  /** Back-link target. Omitted → no back link. */
  backHref?: string
  /** Aside content — status + meta cards (4-col rail). */
  aside?: React.ReactNode
  children: React.ReactNode
}

/**
 * DetailShell — PageShell + back link + header (eyebrow / mono-tabular ID title
 * / sub / status / actions) + an 8/4 main+aside grid (single column when no
 * aside). Direct PageShell + SurfaceCard composition; no shared primitive.
 */
export function DetailShell({
  eyebrow,
  title,
  sub,
  status,
  actions,
  backHref,
  aside,
  children,
}: DetailShellProps) {
  return (
    <PageShell width="wide">
      {backHref && (
        <Link
          href={backHref}
          className={cn(
            FIELD_LABEL,
            "inline-flex items-center gap-1.5 hover:text-primary transition-colors duration-fast ease-linear focus-visible:outline-none focus-visible:tac-focus-premium",
          )}
        >
          <RiArrowLeftLine aria-hidden className="size-3" />
          Back
        </Link>
      )}

      <header className="flex items-start justify-between gap-4 pb-4 border-b border-border">
        <div className="min-w-0">
          <p className={FIELD_LABEL}>{eyebrow}</p>
          <h1 className="font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground mt-1 break-all">
            {title}
          </h1>
          {sub && <p className="t-body-sm text-muted-foreground mt-1.5">{sub}</p>}
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          {status && <div>{status}</div>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>

      <div
        className={cn(
          "grid gap-6",
          aside ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1",
        )}
      >
        <div className={cn(aside && "lg:col-span-8 space-y-4")}>{children}</div>
        {aside && <aside className="lg:col-span-4 space-y-4">{aside}</aside>}
      </div>
    </PageShell>
  )
}
