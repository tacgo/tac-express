"use client"



import * as React from "react"
import Link from "next/link"

import { RiBox3Line, RiAddLine } from "@workspace/ui/icons"
import { OpsFrame } from "../ops-frame"
import { OpsPageHead } from "../ops-page-head"
import { OpsButton } from "../ops-button"
import { OpsBadge } from "../ops-badge"
import { OpsTabs } from "../ops-tabs"
import { OpsFieldInput } from "../ops-field"
import {
  OpsTable,
  OpsTableHead,
  OpsTableBody,
  OpsTableRow,
  OpsTableHeader,
  OpsTableCell,
} from "../ops-table"
import { OpsSkeletonRow } from "../ops-skeleton"
import { OpsEmptyState } from "../ops-empty-state"
import { OpsErrorState } from "../ops-error-state"

interface ShipmentRow {
  /** AWB number — displayed in the CN column. */
  id: string
  customer: string
  receiver: string
  route: string
  service: "STD" | "PRIORITY"
  weight: string
  status: string
  age: string
  /** Detail-page link target (typically `/ops-console/shipments/<uuid>`). */
  detailHref?: string
}

interface OpsShipmentsViewProps {
  rows: ShipmentRow[]
  /** Initial fetch in-flight — render skeleton rows. */
  isLoading?: boolean
  /** Hook reports an error — render the error state with a retry CTA. */
  isError?: boolean
  /** Invoked when the operator clicks Retry on the error state. */
  onRetry?: () => void
}

const TABS = [
  "All",
  "Created",
  "In Transit",
  "Out for Delivery",
  "Delivered",
  "Exception",
] as const

const PAGE_SIZE = 25

function OpsShipmentsView({
  rows,
  isLoading,
  isError,
  onRetry,
}: OpsShipmentsViewProps) {
  const [tab, setTab] = React.useState<string>("All")
  const [pageIndex, setPageIndex] = React.useState(0)
  // Reset to page 1 when the operator changes the filter — otherwise we'd
  // be silently on page 4 of "Created" when they switch to "Delivered" and
  // appear to have no results.
  React.useEffect(() => setPageIndex(0), [tab])
  const [query, setQuery] = React.useState("")

  const filtered = rows.filter((r) => {
    const matchesTab =
      tab === "All" || r.status.toLowerCase() === tab.toLowerCase()
    const q = query.trim().toLowerCase()
    const matchesQuery =
      !q ||
      r.id.toLowerCase().includes(q) ||
      r.customer.toLowerCase().includes(q) ||
      r.receiver.toLowerCase().includes(q) ||
      r.route.toLowerCase().includes(q)
    return matchesTab && matchesQuery
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const pageStart = safePageIndex * PAGE_SIZE
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  return (
    <OpsFrame size="table">
      <OpsPageHead
        eyebrow="Operations"
        title="Shipments"
        sub="All shipments — search, filter, and manage"
        actions={
          // Links to v6 multi-step wizard (4 steps, smart address, dimensions,
          // declared value, rate lookup). The simplified paper variant at
          // /ops-console/shipments/create is a preview only — keeping the
          // primary "+ New" action on the full-featured v6 wizard preserves
          // feature parity until the paper wizard is rebuilt 1:1.
          <OpsButton asChild variant="primary">
            <Link href="/ops-console/shipments/create">
              <RiAddLine aria-hidden className="size-3" />
              New Shipment
            </Link>
          </OpsButton>
        }
      />
      <OpsTabs items={[...TABS]} value={tab} onChange={setTab} />
      {/* eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md */}
      <div className="mb-3.5 max-w-[520px]">
        <OpsFieldInput
          aria-label="Search shipments"
          placeholder="SEARCH AWB, SENDER, RECEIVER.."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {isError ? (
        <OpsErrorState
          code="SHIPMENTS · FETCH FAILED"
          headline="Could not load shipments"
          message="The shipments API didn't respond. Retry the request, or contact support if the issue persists."
          onRetry={onRetry}
        />
      ) : !isLoading && filtered.length === 0 ? (
        <OpsEmptyState
          icon={RiBox3Line}
          eyebrow={tab === "All" ? "NO SHIPMENTS" : `NO "${tab.toUpperCase()}" SHIPMENTS`}
          headline={
            tab === "All"
              ? "No shipments yet"
              : `Nothing matches the ${tab} filter`
          }
          description={
            tab === "All"
              ? "Create the first shipment to start moving freight through the network."
              : "Try switching back to the All tab, or create a new shipment with a different status."
          }
          cta={
            <OpsButton asChild variant="primary">
              <Link href="/ops-console/shipments/create">
                <RiAddLine aria-hidden className="size-3" />
                New Shipment
              </Link>
            </OpsButton>
          }
        />
      ) : (
      <OpsTable>
        <OpsTableHead>
          <tr>
            <OpsTableHeader>CN Number</OpsTableHeader>
            <OpsTableHeader>Customer</OpsTableHeader>
            <OpsTableHeader>Route</OpsTableHeader>
            <OpsTableHeader>Service</OpsTableHeader>
            <OpsTableHeader>Pkgs · Weight</OpsTableHeader>
            <OpsTableHeader>Status</OpsTableHeader>
            <OpsTableHeader>Created</OpsTableHeader>
            <OpsTableHeader>
              <span className="sr-only">Actions</span>
            </OpsTableHeader>
          </tr>
        </OpsTableHead>
        <OpsTableBody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <OpsSkeletonRow key={`skeleton-${i}`} cols={8} />
              ))
            : paginated.map((r) => (
            <OpsTableRow key={r.id}>
              <OpsTableCell>
                <span className="flex items-center gap-2">
                  <RiBox3Line aria-hidden className="size-3.5" />
                  <span className="paper-id">{r.id}</span>
                </span>
              </OpsTableCell>
              <OpsTableCell>
                <div className="font-sans font-semibold text-ui-13">
                  {r.customer}
                </div>
                <div className="font-mono text-muted-foreground text-ui-12">
                  → {r.receiver}
                </div>
              </OpsTableCell>
              <OpsTableCell mono>{r.route}</OpsTableCell>
              <OpsTableCell>
                <OpsBadge tone={r.service === "PRIORITY" ? "warn" : "neutral"}>
                  {r.service}
                </OpsBadge>
              </OpsTableCell>
              <OpsTableCell mono>1 · {r.weight}</OpsTableCell>
              <OpsTableCell>
                <OpsBadge>{r.status}</OpsBadge>
              </OpsTableCell>
              <OpsTableCell mono muted>
                {r.age}
              </OpsTableCell>
              <OpsTableCell>
                {r.detailHref ? (
                  <OpsButton asChild size="sm">
                    <Link href={r.detailHref}>View</Link>
                  </OpsButton>
                ) : (
                  <OpsButton size="sm" disabled>View</OpsButton>
                )}
              </OpsTableCell>
            </OpsTableRow>
          ))}
        </OpsTableBody>
      </OpsTable>
      )}
      <div className="flex items-center justify-between mt-3.5">
        <div className="paper-label">
          Page {safePageIndex + 1} of {totalPages} · {filtered.length}{" "}
          shipment{filtered.length === 1 ? "" : "s"}
        </div>
        <div className="flex items-center gap-2">
          <OpsButton
            size="sm"
            aria-label="Previous page"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={safePageIndex === 0}
          >
            ‹
          </OpsButton>
          <OpsButton
            size="sm"
            aria-label="Next page"
            onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePageIndex >= totalPages - 1}
          >
            ›
          </OpsButton>
        </div>
      </div>
    </OpsFrame>
  )
}

export { OpsShipmentsView }
export type { OpsShipmentsViewProps, ShipmentRow }
