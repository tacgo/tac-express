"use client"

import { useQuery } from "@tanstack/react-query"

import { createBrowserClient } from "@workspace/database/client"
import type { AuditLogFilters } from "@workspace/types"

import { createAuditService } from "../audit.service"

const db = createBrowserClient()
const auditService = createAuditService(db)

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => auditService.listAuditLogs(filters),
    staleTime: 30 * 1000,
  })
}
