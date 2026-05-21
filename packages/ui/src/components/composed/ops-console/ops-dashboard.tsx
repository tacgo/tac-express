"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"
import {
  RiBarChart2Line,
  RiTruckLine,
  RiAlertLine,
} from "@workspace/ui/icons"
import { OpsFrame } from "./ops-frame"
import { OpsPageHead } from "./ops-page-head"
import { OpsCard } from "./ops-card"
import { OpsButton } from "./ops-button"
import { OpsStatCard } from "./ops-stat-card"
import { OpsGrowthAreaChart } from "./ops-growth-chart"
import { OpsVolumeBarChart } from "./ops-volume-chart"
import { OpsUpcomingCalendar } from "./ops-upcoming-calendar"

interface OpsDashboardProps {
  activeShipments: number
  inTransit: number
  openExceptions: number
  upcoming: Array<{ id: string; label: string; eta: string; etaDate?: string | null }>
}

function OpsDashboard({
  activeShipments,
  inTransit,
  openExceptions,
  upcoming,
}: OpsDashboardProps) {
  return (
    <OpsFrame>
      <OpsPageHead
        eyebrow="Platform"
        title="Dashboard"
        sub="Real-time operations overview across the network"
      />

      {/* Hero banner — TAC Express network artwork (4500×600 editorial strip).
          The "TAPAN ASSOCIATE CARGO EXPRESS" wordmark is baked into the image.
          Full-bleed inside the OpsFrame: -ml-8 + explicit w-calc cancels both
          sides of the frame's px-8 padding so the banner fills the empty space
          flush to the frame's inner border. Aspect 15/2 matches the source. */}
      {/* Banner bleed = -ml-8 + w-(100%+4rem) where 4rem = 2 × frame px-8
          padding. The calc() must track the parent's px-8 — not tokenizable
          without losing the relationship. ESLint's no-restricted-syntax
          allows it because the bracket contains calc(), not a magic number. */}
      <div
        className={cn(
          "relative overflow-hidden border-y border-paper-line mb-5",
          "-ml-8 w-[calc(100%+4rem)] aspect-[15/2] max-h-[length:var(--spacing-chart-xl)]",
        )}
      >
        <Image
          src="/dashboard-banner-v3.png"
          alt="TAPAN Associate Cargo Express"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        {/* DISPATCH · LIVE capsule — the only operational overlay */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-paper-card border border-paper-line px-2.5 py-1.5 font-paper-mono font-medium text-paper-10 tracking-paper-10 text-paper-fg-1">
          <span
            aria-hidden
            className="inline-block size-1.5 bg-paper-ok mr-2 align-middle animate-pulse"
          />
          DISPATCH · LIVE
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <OpsStatCard
          icon={RiBarChart2Line}
          label="Active Shipments"
          value={activeShipments}
          href="/ops-console/shipments?status=active"
        />
        <OpsStatCard
          icon={RiTruckLine}
          label="In Transit"
          value={inTransit}
          href="/ops-console/shipments?status=in_transit"
        />
        <OpsStatCard
          icon={RiAlertLine}
          label="Open Exceptions"
          value={openExceptions}
          href="/ops-console/exceptions"
        />

        {/* Command Center */}
        <OpsCard>
          <div className="paper-label mb-2.5">Command Center</div>
          <div className="flex items-center gap-2">
            <OpsButton variant="primary" className="flex-1 justify-center">
              + Shipment
            </OpsButton>
            <OpsButton variant="default" className="flex-1 justify-center">
              + Manifest
            </OpsButton>
          </div>
        </OpsCard>
      </div>

      {/* Three-column detail row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Growth — interactive stacked area chart */}
        <OpsCard ticks>
          <OpsGrowthAreaChart />
        </OpsCard>

        {/* Shipment Volume — interactive bar chart */}
        <OpsCard ticks>
          <OpsVolumeBarChart />
        </OpsCard>

        {/* Upcoming Operations — calendar with scheduled-departure highlights */}
        <OpsCard ticks>
          <OpsUpcomingCalendar upcoming={upcoming} />
        </OpsCard>
      </div>
    </OpsFrame>
  )
}

export { OpsDashboard }
export type { OpsDashboardProps }
