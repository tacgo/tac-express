import type { UUID, AWB, ExceptionType, ExceptionSeverity, ExceptionStatus } from "./domain.types"

export interface Exception {
  id: UUID
  awbNumber?: AWB
  shipmentId?: UUID
  type: ExceptionType
  severity: ExceptionSeverity
  status: ExceptionStatus
  description: string
  resolution?: string
  metadata?: Record<string, unknown>
  reportedBy?: UUID
  resolvedBy?: UUID
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ExceptionSummary {
  id: UUID
  awbNumber?: AWB
  type: ExceptionType
  severity: ExceptionSeverity
  status: ExceptionStatus
  description: string
  createdAt: string
}

export interface ExceptionFilters {
  status?: ExceptionStatus[]
  severity?: ExceptionSeverity[]
  type?: ExceptionType[]
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}
