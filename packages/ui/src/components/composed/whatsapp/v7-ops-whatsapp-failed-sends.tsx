"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import type { FailedWhatsappSendRow } from "@workspace/types"
import { RiWhatsappLine, RiCheckboxCircleLine } from "@workspace/ui/icons"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { SurfaceCard } from "@workspace/ui/components/composed/surface-card"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import {
  FailedSendsTable,
  type FailedSendsTableRetryConfig,
} from "@workspace/ui/components/composed/whatsapp/failed-sends-table"

/**
 * V7OpsWhatsAppFailedSends — Violet Grid v7 layout for the WhatsApp
 * failed-sends operator triage page.
 *
 * Replaces the Paper Ops Console `OpsWhatsAppFailedSendsView` (Phase 9). This
 * is a workhorse triage surface, not an overview — no display moment; the
 * triage table is the content hero, framed on the elevated `command` surface
 * tier. The reused `FailedSendsTable` owns the columns + per-row retry; this
 * view only re-frames the shell (PageShell + header + SurfaceCard) and adds
 * the designed empty state.
 *
 * Pure — receives server-resolved rows + optional retry config as props
 * (LAW 6 + LAW 7). Data fetch + retry mutation stay in the apps/dashboard
 * client/live wrappers; the prop contract matches the retired v6 view so the
 * wrapper change is a one-line swap. Loading / error are resolved upstream by
 * the server component, so the meaningful client states are empty (queue
 * clear) and populated.
 */

interface V7OpsWhatsAppFailedSendsProps {
  rows: FailedWhatsappSendRow[]
  /** Days back the underlying query covered (defaults to the service default). */
  windowDays?: number
  /** Optional per-row retry wiring — passed straight through to the table. */
  retryConfig?: FailedSendsTableRetryConfig
  className?: string
}

function V7OpsWhatsAppFailedSends({
  rows,
  windowDays = 7,
  retryConfig,
  className,
}: V7OpsWhatsAppFailedSendsProps) {
  const isEmpty = rows.length === 0

  return (
    <PageShell width="wide" className={cn(className)}>
      <PageHeader
        overline="WhatsApp"
        title="Failed sends"
        description="Operator triage for undelivered WhatsApp notifications — retry eligible sends inline."
      />

      <SurfaceCard
        emphasis="command"
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <RiWhatsappLine aria-hidden className="size-3.5" />
            Delivery failures
          </span>
        }
        title="Failed sends"
        subtitle={`Most-recent ${windowDays}-day window · ${rows.length} failed send${
          rows.length === 1 ? "" : "s"
        }`}
      >
        {isEmpty ? (
          <EmptyState
            icon={
              <RiCheckboxCircleLine
                className="size-5 text-accent-success"
                aria-hidden
              />
            }
            title="Queue clear — no failed sends"
            description={`Every WhatsApp notification in the last ${windowDays}-day window was delivered. Failures surface here for one-click retry.`}
          />
        ) : (
          <FailedSendsTable rows={rows} retryConfig={retryConfig} />
        )}
      </SurfaceCard>
    </PageShell>
  )
}

export { V7OpsWhatsAppFailedSends }
export type { V7OpsWhatsAppFailedSendsProps }
