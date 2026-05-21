export interface AnalyticsSummary {
  totalShipments: number
  totalRevenue: number
  deliveredCount: number
  inTransitCount: number
  exceptionCount: number
  avgDeliveryDays: number
}

export interface HubInventoryItem {
  hub: string
  created: number
  inTransit: number
  receivedAtDest: number
  outForDelivery: number
  exception: number
  total: number
}

export interface ShipmentTrendPoint {
  date: string
  shipments: number
  delivered: number
}

export interface RevenueTrendPoint {
  month: string
  revenue: number
}

export interface StatusDistPoint {
  status: string
  count: number
  label: string
}

export interface HubPerfPoint {
  hub: string
  dispatched: number
  delivered: number
}
