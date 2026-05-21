export interface RevenueTrendDataPoint {
  month: string
  revenue: number
}

export interface ShipmentTrendDataPoint {
  date: string
  shipments: number
  delivered: number
}

export interface StatusDistributionDataPoint {
  status: string
  count: number
  label?: string
}

export interface HubPerformanceDataPoint {
  hub: string
  dispatched: number
  delivered: number
}
