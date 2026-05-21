import type { UUID, ManifestNumber, AWB, ManifestStatus, TransportMode, HubCode } from "./domain.types"

export interface Manifest {
  id: UUID
  manifestNumber: ManifestNumber
  status: ManifestStatus
  transportMode: TransportMode
  originHub: HubCode
  destHub: HubCode
  departureDate?: string
  arrivalDate?: string
  totalShipments: number
  totalPieces: number
  totalWeight: number
  createdBy: UUID
  closedBy?: UUID
  departedBy?: UUID
  arrivedBy?: UUID
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ManifestSummary {
  id: UUID
  manifestNumber: ManifestNumber
  status: ManifestStatus
  transportMode: TransportMode
  originHub: HubCode
  destHub: HubCode
  totalShipments: number
  totalPieces: number
  totalWeight: number
  departureDate?: string
  createdAt: string
}

export interface ManifestShipment {
  manifestId: UUID
  awbNumber: AWB
  shipmentId: UUID
  addedAt: string
  addedBy: UUID
}

export interface ManifestFilters {
  status?: ManifestStatus[]
  originHub?: HubCode
  destHub?: HubCode
  transportMode?: TransportMode
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}
