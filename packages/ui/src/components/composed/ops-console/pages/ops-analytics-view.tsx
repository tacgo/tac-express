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

      {/* Top stats — violet-underline */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <OpsCard accent="violet-under">
          <div className="paper-label flex items-center gap-2">
            <RiBox3Line aria-hidden className="size-3.5" />
            <span>Total Shipments</span>
          </div>
          <div className="paper-stat-value mt-2.5">{kpis.totalShipments}</div>
        </OpsCard>
        <OpsCard accent="violet-under">
          <div className="paper-label flex items-center gap-2">
            <RiMoneyDollarCircleLine aria-hidden className="size-3.5" />
            <span>Total Revenue</span>
          </div>
          <div className="paper-stat-value mt-2.5">{kpis.totalRevenue}</div>
        </OpsCard>
        <OpsCard accent="violet-under">
          <div className="paper-label flex items-center gap-2">
            <RiCheckboxCircleLine aria-hidden className="size-3.5" />
            <span>Delivered</span>
          </div>
          <div className="paper-stat-value mt-2.5">{kpis.delivered}</div>
          <div className="paper-label mt-1">
            {kpis.deliveryRate}% delivery rate
          </div>
        </OpsCard>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <OpsCard>
          <div className="paper-label flex items-center gap-2">
            <RiPlaneLine aria-hidden className="size-3.5" />
            <span>In Transit</span>
          </div>
          <div className="font-paper-display font-extrabold text-[length:var(--text-paper-28)] mt-2.5">
            {kpis.inTransit}
          </div>
        </OpsCard>
        <OpsCard>
          <div className="paper-label flex items-center gap-2">
            <RiAlertLine aria-hidden className="size-3.5" />
            <span>Open Exceptions</span>
          </div>
          <div className="font-paper-display font-extrabold text-[length:var(--text-paper-28)] mt-2.5">
            {kpis.openExceptions}
          </div>
          <div className="paper-label mt-1">All clear</div>
        </OpsCard>
        <OpsCard>
          <div className="paper-label flex items-center gap-2">
            <RiTimeLine aria-hidden className="size-3.5" />
            <span>Avg Delivery Days</span>
          </div>
          <div className="font-paper-display font-extrabold text-[length:var(--text-paper-28)] mt-2.5">
            {kpis.avgDeliveryDays}
          </div>
        </OpsCard>
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
