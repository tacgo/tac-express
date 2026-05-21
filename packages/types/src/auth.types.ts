import type { UUID, UserRole, HubCode } from "./domain.types"

export interface StaffUser {
  id: UUID
  email: string
  name: string
  role: UserRole
  hubCode?: HubCode
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface StaffUserSummary {
  id: UUID
  name: string
  email: string
  role: UserRole
  hubCode?: HubCode
  isActive: boolean
}

export interface AuthSession {
  user: StaffUser
  token: string
  expiresAt: string
}

export interface StaffUserFilters {
  role?: UserRole[]
  hubCode?: HubCode
  isActive?: boolean
  search?: string
  page?: number
  pageSize?: number
}
