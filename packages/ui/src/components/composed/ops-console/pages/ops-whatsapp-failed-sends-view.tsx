import * as React from "react"

import type { FailedWhatsappSendRow } from "@workspace/types"

import {
  FailedSendsTable,
  type FailedSendsTableRetryConfig,
} from "../../whatsapp/failed-sends-table"
import { OpsFrame } from "../ops-frame"
import { OpsPageHead } from "../ops-page-head"
import { OpsCard } from "../ops-card"

/**
 * Page-shape view for the WhatsApp failed-sends operator triage page
 * (backlog item W2 — issue #142, originally PR 1 visibility-only at PR
 * #152; PR 2 added retry via the OPTIONAL `retryConfig` prop — SB-1 /
 * #153).
 *
 * Pure — receives rows + optional retry config as props and composes the
 * existing OpsFrame / OpsPageHead / OpsCard shells + the FailedSendsTable.
 * Zero data fetch, zero mutation logic. LAW 6 + LAW 7 respected. When
 * `retryConfig` is omitted the view reverts exactly to the PR #152 shape.
 *
 * Sub-title surfaces the time window so an operator knows the cutoff
 * without having to read the service code or page query string.
 */

interface OpsWhatsAppFailedSendsViewProps {
  rows: FailedWhatsappSendRow[]
  /**
   * Number of days back the underlying query covered. Defaults to the
   * service-level default (7) so the page can pass the value through
   * without computing it twice.
   */
  windowDays?: number
  /**
   * Optional retry config — passes through to FailedSendsTable to render
   * a Retry column. Owned by the apps/dashboard client wrapper; this view
   * stays pure (no fetch / no per-row state owned here).
   */
  retryConfig?: FailedSendsTableRetryConfig
}

function OpsWhatsAppFailedSendsView({
  rows,
  windowDays = 7,
  retryConfig,
}: OpsWhatsAppFailedSendsViewProps) {
  return (
    <OpsFrame>
      <OpsPageHead
        eyebrow="WhatsApp"
        title="Failed sends"
        sub={`Most-recent ${windowDays}-day window. ${rows.length} failed send${rows.length === 1 ? "" : "s"}.`}
      />
      <OpsCard pad="lg">
        <FailedSendsTable rows={rows} retryConfig={retryConfig} />
      </OpsCard>
    </OpsFrame>
  )
}

export { OpsWhatsAppFailedSendsView }
export type { OpsWhatsAppFailedSendsViewProps }
