import { UserRole, canAccessModule, hasPermission, ROLE_HIERARCHY } from "@workspace/types"

export type { UserRole }

export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole]
}

/**
 * Idle-timeout policy by role.
 *
 * Tighter for warehouse staff (terminals in semi-public hub areas, higher
 * unattended-session risk); looser for admins (typically office-bound, locked
 * screens, multi-tab workflows).
 *
 * Override the dashboard layout's hardcoded timeout by reading these values
 * via `getIdleMinutesForRole`.
 */
const IDLE_MINUTES_BY_ROLE: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 60,
  [UserRole.ADMIN]: 60,
  [UserRole.MANAGER]: 45,
  [UserRole.OPS]: 30,
  [UserRole.OPS_STAFF]: 30,
  [UserRole.SUPPORT]: 30,
  [UserRole.INVOICE]: 30,
  [UserRole.FINANCE_STAFF]: 30,
  [UserRole.WAREHOUSE_IMPHAL]: 15,
  [UserRole.WAREHOUSE_DELHI]: 15,
  [UserRole.WAREHOUSE_STAFF]: 15,
}

const DEFAULT_IDLE_MINUTES = 30

/**
 * Returns the idle-timeout in minutes for the given role.
 * Falls back to the safe default (30) when the role is unknown / not loaded.
 */
export function getIdleMinutesForRole(role: UserRole | null | undefined): number {
  if (!role) return DEFAULT_IDLE_MINUTES
  return IDLE_MINUTES_BY_ROLE[role] ?? DEFAULT_IDLE_MINUTES
}

export function canAccess(userRole: UserRole, module: string): boolean {
  return canAccessModule(userRole, module)
}

export function canDo(
  userRole: UserRole,
  permission: Parameters<typeof hasPermission>[1]
): boolean {
  return hasPermission(userRole, permission)
}

export function isWarehouseRole(role: UserRole): boolean {
  return (
    role === UserRole.WAREHOUSE_IMPHAL ||
    role === UserRole.WAREHOUSE_DELHI ||
    role === UserRole.WAREHOUSE_STAFF
  )
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN
}

export function isAdminOrAbove(role: UserRole): boolean {
  return hasMinimumRole(role, UserRole.ADMIN)
}

export function isManagerOrAbove(role: UserRole): boolean {
  return hasMinimumRole(role, UserRole.MANAGER)
}
