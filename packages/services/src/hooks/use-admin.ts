"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createBrowserClient } from "@workspace/database/client"
import { createAdminService } from "../admin.service"
import type { UserRole } from "@workspace/types"

const db = createBrowserClient()
const adminService = createAdminService(db)

/**
 * Browser-side admin service singleton. Exported so `useRBAC` and other
 * cross-cutting hooks can call it imperatively without re-instantiating
 * `@workspace/database` themselves.
 */
export { adminService }

export function useStaffList() {
  return useQuery({
    queryKey: ["admin", "staff"],
    queryFn: () => adminService.getStaffList(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAuditLogs(page = 1) {
  return useQuery({
    queryKey: ["admin", "audit-logs", page],
    queryFn: () => adminService.getAuditLogs({ page, pageSize: 50 }),
    staleTime: 60 * 1000,
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      adminService.updateRole(userId, role),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "staff"] }) },
  })
}

export function useSetActiveStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminService.setActiveStatus(userId, isActive),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "staff"] }) },
  })
}

export function useUpdateOwnProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: { name?: string; hubCode?: string } }) =>
      adminService.updateProfile(userId, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "staff"] }) },
  })
}
