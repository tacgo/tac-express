"use client"

import * as React from "react"
import { getBrowserAuth } from "@workspace/auth/client"
import { adminService } from "@workspace/services/hooks/use-admin"
import {
  UserRole,
  ROLE_PERMISSIONS,
  canAccessModule as canAccessModuleFn,
  hasPermission as hasPermissionFn,
} from "@workspace/types"

export interface RBACContext {
  userId: string | null
  email: string | null
  name: string
  role: UserRole | null
  isLoading: boolean
  canAccessModule: (module: string) => boolean
  hasPermission: (permission: keyof (typeof ROLE_PERMISSIONS)[UserRole.ADMIN]) => boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  isManager: boolean
}

/**
 * Client-side RBAC hook. Fetches the current user via @workspace/auth and
 * the profile row via the admin service, so this hook never touches the
 * Supabase client directly (LAW 6/7/8 compliant).
 *
 * RLS still enforces security at the DB layer — this hook is strictly for UX.
 */
export function useRBAC(): RBACContext {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [email, setEmail] = React.useState<string | null>(null)
  const [name, setName] = React.useState<string>("")
  const [role, setRole] = React.useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true

    ;(async () => {
      const auth = getBrowserAuth()
      const user = await auth.getUser()

      if (!user) {
        if (mounted) {
          setUserId(null)
          setEmail(null)
          setName("")
          setRole(null)
          setIsLoading(false)
        }
        return
      }

      if (mounted) {
        setUserId(user.id)
        setEmail(user.email ?? null)
      }

      const profile = await adminService.getProfileById(user.id)

      if (!mounted) return

      setRole((profile?.role as UserRole) ?? UserRole.OPS)
      setName(profile?.name || (user.email?.split("@")[0] ?? ""))
      setIsLoading(false)
    })()

    return () => {
      mounted = false
    }
  }, [])

  const canAccessModule = React.useCallback(
    (module: string) => {
      if (!role) return false
      return canAccessModuleFn(role, module)
    },
    [role]
  )

  const hasPermission = React.useCallback(
    (permission: keyof (typeof ROLE_PERMISSIONS)[UserRole.ADMIN]) => {
      if (!role) return false
      return hasPermissionFn(role, permission)
    },
    [role]
  )

  return {
    userId,
    email,
    name,
    role,
    isLoading,
    canAccessModule,
    hasPermission,
    isAdmin: role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN,
    isSuperAdmin: role === UserRole.SUPER_ADMIN,
    isManager:
      role === UserRole.MANAGER || role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN,
  }
}
