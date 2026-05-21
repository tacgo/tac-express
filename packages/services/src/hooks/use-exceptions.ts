"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createBrowserClient } from "@workspace/database/client"
import { createExceptionService } from "../exception.service"
import type { ExceptionFilters } from "@workspace/types"

const db = createBrowserClient()
const exceptionService = createExceptionService(db)

export function useExceptions(filters: ExceptionFilters = {}) {
  return useQuery({
    queryKey: ["exceptions", filters],
    queryFn: () => exceptionService.getExceptions(filters),
    staleTime: 60 * 1000,
  })
}

export function useException(id: string | undefined) {
  return useQuery({
    queryKey: ["exceptions", id],
    queryFn: () => exceptionService.getExceptionById(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}

export function useResolveException() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      exceptionService.resolveException(id, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exceptions"] })
    },
  })
}

export function useCreateException() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof exceptionService.createException>[0]) =>
      exceptionService.createException(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exceptions"] })
    },
  })
}
