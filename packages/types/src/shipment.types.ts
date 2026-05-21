import type {
  AWB,
  UUID,
  Weight,
  ContactInfo,
  Financials,
  ShipmentStatus,
  ServiceLevel,
  PaymentMode,
  TransportMode,
  HubCode,
  ExceptionType,
  ExceptionSeverity,
  ExceptionStatus,
  TrackingEventSource,
} from "./domain.types"

export interface Shipment {
  id: UUID
  awbNumber: AWB
  status: ShipmentStatus
  serviceLevel: ServiceLevel
  paymentMode: PaymentMode
  transportMode: TransportMode
  originHub: HubCode
  destHub: HubCode
  sender: ContactInfo
  receiver: ContactInfo
  weight: Weight
  pieces: number
  description: string
  financials: Financials
  manifestId?: UUID
  manifestNumber?: string
  createdAt: string
  updatedAt: string
  createdBy: UUID
  deliveredAt?: string
  cancelledAt?: string
}

export interface ShipmentSummary {
  id: UUID
  awbNumber: AWB
  status: ShipmentStatus
  senderName: string
  receiverName: string
  originHub: HubCode
  destHub: HubCode
  chargeableWeight: number
  totalAmount: number
  pieces: number
  manifestNumber?: string
  serviceLevel?: ServiceLevel
  createdAt: string
  updatedAt: string
}

export interface ShipmentFilters {
  status?: ShipmentStatus[]
  originHub?: HubCode
  destHub?: HubCode
  paymentMode?: PaymentMode
  serviceLevel?: ServiceLevel
  search?: string
  dateFrom?: string
  dateTo?: string
  manifestId?: UUID
  page?: number
  pageSize?: number
}

export interface TrackingEvent {
  id: UUID
  awbNumber: AWB
  status: ShipmentStatus
  description: string
  location: string
  hubCode?: HubCode
  source: TrackingEventSource
  staffId?: UUID
  staffName?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface Exception {
  id: UUID
  awbNumber: AWB
  shipmentId: UUID
  type: ExceptionType
  severity: ExceptionSeverity
  status: ExceptionStatus
  description: string
  reportedBy: UUID
  resolvedBy?: UUID
  resolution?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  resolvedAt?: string
}

export interface ExceptionFilters {
  status?: ExceptionStatus[]
  type?: ExceptionType[]
  severity?: ExceptionSeverity[]
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
