/**
 * Pagination & response helpers used across services.
 * `PaginatedResult` and `DEFAULT_PAGE_SIZE` are also defined in older modules
 * (shipment.types.ts, constants.ts); this file holds shared mutation helpers
 * that don't conflict with those.
 */

import type { PaginatedResult } from "./shipment.types"

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortField?: string
  sortDirection?: "asc" | "desc"
}

export interface MutationResult<T = unknown> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

export const MAX_PAGE_SIZE_HARD = 200

export function clampPagination(p: PaginationParams = {}): Required<Pick<PaginationParams, "page" | "pageSize">> {
  const page = Math.max(1, p.page ?? 1)
  const pageSize = Math.min(MAX_PAGE_SIZE_HARD, Math.max(1, p.pageSize ?? 25))
  return { page, pageSize }
}

export type { PaginatedResult }
