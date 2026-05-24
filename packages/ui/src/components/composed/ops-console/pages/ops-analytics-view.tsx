import * as React from "react"

import {
  RiBox3Line,
  RiMoneyDollarCircleLine,
  RiCheckboxCircleLine,
  RiPlaneLine,
  RiAlertLine,
  RiTimeLine,
} from "@workspace/ui/icons"
import { OpsFrame } from "../ops-frame"
import { OpsPageHead } from "../ops-page-head"
import { OpsCard } from "../ops-card"
import { OpsShipmentBarChart } from "../ops-shipment-bar-chart"
import { OpsRevenueRadialChart } from "../ops-revenue-radial-chart"
import { StatCard } from "../../stat-card"

interface AnalyticsKpis {
  totalShipments: number
  totalRevenue: string
  delivered: number
  deliveryRate: number
  inTransit: number
  openExceptions: number
  avgDeliveryDays: string
}

interface OpsAnalyticsViewProps {
  kpis: AnalyticsKpis
}

function OpsAnalyticsView({ kpis }: OpsAnalyticsViewProps) {
  return (
    <OpsFrame>
      <OpsPageHead
        eyebrow="Business"
        title="Analytics"
        sub="Operations overview across all hubs"
      />

      {/* KPI grid — propagated to the StatCard hierarchy system so Analytics
          shares the overview's metric scale + spacing rhythm (consistency
          propagation phase). Sharp surfaces, violet signal, mono numerals
          retained. Replaces the legacy paper-* KPI cards which mixed two value
          sizes (paper-stat-value vs text-ui-28) — the hierarchy inconsistency. */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard
          label="Total Shipments"
          value={kpis.totalShipments}
          visual={<RiBox3Line aria-hidden className="size-5 text-muted-foreground" />}
        />
        <StatCard
          label="Total Revenue"
          value={kpis.totalRevenue}
          visual={<RiMoneyDollarCircleLine aria-hidden className="size-5 text-muted-foreground" />}
        />
        <StatCard
          label="Delivered"
          value={kpis.delivered}
          context={`${kpis.deliveryRate}% delivery rate`}
          visual={<RiCheckboxCircleLine aria-hidden className="size-5 text-muted-foreground" />}
        />
        <StatCard
          label="In Transit"
          value={kpis.inTransit}
          visual={<RiPlaneLine aria-hidden className="size-5 text-muted-foreground" />}
        />
        <StatCard
          label="Open Exceptions"
          value={kpis.openExceptions}
          context="All clear"
          visual={<RiAlertLine aria-hidden className="size-5 text-muted-foreground" />}
        />
        <StatCard
          label="Avg Delivery Days"
          value={kpis.avgDeliveryDays}
          monoValue={false}
          visual={<RiTimeLine aria-hidden className="size-5 text-muted-foreground" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <OpsCard ticks>
          <OpsShipmentBarChart />
        </OpsCard>
        <OpsCard ticks>
          <OpsRevenueRadialChart />
        </OpsCard>
      </div>
    </OpsFrame>
  )
}

export { OpsAnalyticsView }
export type { OpsAnalyticsViewProps, AnalyticsKpis }
