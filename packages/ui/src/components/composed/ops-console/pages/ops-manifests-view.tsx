"use client"



import * as React from "react"
import Link from "next/link"

import { RiAddLine, RiFileList3Line } from "@workspace/ui/icons"
import { OpsFrame } from "../ops-frame"
import { OpsPageHead } from "../ops-page-head"
import { OpsButton } from "../ops-button"
import { OpsBadge, type OpsBadgeProps } from "../ops-badge"
import { OpsTabs } from "../ops-tabs"
import {
  OpsTable,
  OpsTableHead,
  OpsTableBody,
  OpsTableRow,
  OpsTableHeader,
  OpsTableCell,
} from "../ops-table"
import { OpsSkeleton } from "../ops-skeleton"
import { OpsEmptyState } from "../ops-empty-state"
import { OpsErrorState } from "../ops-error-state"

type ManifestStatus =
  | "Draft"
  | "Building"
  | "Open"
  | "Closed"
  | "Departed"
  | "Arrived"

interface ManifestRow {
  id: string
  from: string
  to: string
  shipments: number
  weight: string
  date: string
  status: ManifestStatus
  /** Detail page href (typically `/ops-console/manifests/<uuid>`). */
  detailHref?: string
}

interface OpsManifestsViewProps {
  items: ManifestRow[]
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
}

const TABS = [
  "All",
  "Draft",
  "Building",
  "Open",
  "Closed",
  "Departed",
  "Arrived",
] as const

// Status → badge tone — keeps the table scannable. Draft/Building are work-
// in-progress (neutral/info), Open is the active state the operator should
// notice (violet brand), Closed/Arrived are resolved (ok), Departed is in-
// flight (info).
const STATUS_TONE: Record<ManifestStatus, OpsBadgeProps["tone"]> = {
  Draft: "neutral",
  Building: "info",
  Open: "violet",
  Closed: "ok",
  Departed: "info",
  Arrived: "ok",
}

function OpsManifestsView({
  items,
  isLoading,
  isError,
  onRetry,
}: OpsManifestsViewProps) {
  const [tab, setTab] = React.useState<string>("All")
  const filtered = items.filter((m) => (tab === "All" ? true : m.status === tab))

  return (
    <OpsFrame>
      <OpsPageHead
        eyebrow="Operations"
        title="Manifests"
        sub="Transit manifests — create, build, depart and receive"
        actions={
          // Links to v6 manifest wizard (setup → barcode-scan-to-add → review
          // → close). The paper variant at /ops-console/manifests/create is a
          // simplified preview without the scan loop.
          <OpsButton asChild variant="primary">
            <Link href="/ops-console/manifests/create">
              <RiAddLine aria-hidden className="size-3" />
              New Manifest
            </Link>
          </OpsButton>
        }
      />
      <OpsTabs items={[...TABS]} value={tab} onChange={setTab} />
      {isError ? (
        <OpsErrorState
          code="MANIFESTS · FETCH FAILED"
          headline="Could not load manifests"
          message="The manifests API didn't respond. Retry the request, or contact support if the issue persists."
          onRetry={onRetry}
        />
      ) : isLoading ? (
        // eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md
        <OpsSkeleton className="h-[28rem] w-full" />
      ) : filtered.length === 0 ? (
        <OpsEmptyState
          icon={RiFileList3Line}
          eyebrow={tab === "All" ? "NO MANIFESTS" : `NO "${tab.toUpperCase()}" MANIFESTS`}
          headline={
            tab === "All"
              ? "No manifests yet"
              : `Nothing matches the ${tab} filter`
          }
          description={
            tab === "All"
              ? "Build the first manifest to start consolidating freight for hub-to-hub transit."
              : "Try switching to the All tab, or build a new manifest."
          }
          cta={
            <OpsButton asChild variant="primary">
              <Link href="/ops-console/manifests/create">
                <RiAddLine aria-hidden className="size-3" />
                New Manifest
              </Link>
            </OpsButton>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <OpsTable>
            <OpsTableHead>
              <OpsTableRow>
                {/* eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md */}
                <OpsTableHeader className="w-[180px]">Manifest</OpsTableHeader>
                <OpsTableHeader>Route</OpsTableHeader>
                {/* eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md */}
                <OpsTableHeader className="text-right w-[110px]">
                  Shipments
                </OpsTableHeader>
                {/* eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md */}
                <OpsTableHeader className="text-right w-[110px]">
                  Weight
                </OpsTableHeader>
                {/* eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md */}
                <OpsTableHeader className="w-[110px]">Created</OpsTableHeader>
                {/* eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md */}
                <OpsTableHeader className="w-[110px]">Status</OpsTableHeader>
                {/* eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md */}
                <OpsTableHeader className="w-[80px] text-right">
                  <span className="sr-only">Actions</span>
                </OpsTableHeader>
              </OpsTableRow>
            </OpsTableHead>
            <OpsTableBody>
              {filtered.map((m) => (
                <OpsTableRow key={m.id}>
                  <OpsTableCell>
                    {m.detailHref ? (
                      <Link
                        href={m.detailHref}
                        className="paper-id underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                      >
                        {m.id}
                      </Link>
                    ) : (
                      <span className="paper-id">{m.id}</span>
                    )}
                  </OpsTableCell>
                  <OpsTableCell mono muted>
                    {m.from} → {m.to}
                  </OpsTableCell>
                  <OpsTableCell
                    mono
                    className="text-right tabular-nums font-medium text-foreground"
                  >
                    {m.shipments}
                  </OpsTableCell>
                  <OpsTableCell
                    mono
                    className="text-right tabular-nums font-medium text-foreground"
                  >
                    {m.weight} kg
                  </OpsTableCell>
                  <OpsTableCell mono muted>
                    {m.date}
                  </OpsTableCell>
                  <OpsTableCell>
                    <OpsBadge tone={STATUS_TONE[m.status]}>{m.status}</OpsBadge>
                  </OpsTableCell>
                  <OpsTableCell className="text-right">
                    {m.detailHref ? (
                      // Use a generic aria-label so this trailing action link
                      // does not collide with the unique ID-link match that
                      // existing tests rely on (`getByRole("link", { name: /M-1001/i })`).
                      <Link
                        href={m.detailHref}
                        aria-label="Open manifest details"
                        className="font-mono text-ui-11 tracking-badge uppercase text-primary hover:underline underline-offset-4"
                      >
                        View →
                      </Link>
                    ) : (
                      <span
                        aria-hidden
                        className="font-mono text-ui-11 tracking-badge uppercase text-muted-foreground"
                      >
                        —
                      </span>
                    )}
                  </OpsTableCell>
                </OpsTableRow>
              ))}
            </OpsTableBody>
          </OpsTable>
        </div>
      )}
    </OpsFrame>
  )
}

export { OpsManifestsView }
export type { OpsManifestsViewProps, ManifestRow }
