import type { UUID } from "./domain.types"

export interface Hub {
  id: UUID
  code: string
  name: string
  city: string
  state: string
  country: string
  pincode: string
  address: string
  managerId: UUID | null
  isOrigin: boolean
  isDestination: boolean
  isActive: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface HubInput {
  code: string
  name: string
  city: string
  state: string
  country?: string
  pincode: string
  address: string
  managerId?: UUID | null
  isOrigin?: boolean
  isDestination?: boolean
  isActive?: boolean
}
