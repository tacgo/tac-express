"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createBrowserClient } from "@workspace/database/client"
import type { HubInput } from "@workspace/types"
import { createHubService } from "../hub.service"

const db = createBrowserClient()
const hubService = createHubService(db)

export function useHubs(activeOnly = true) {
  return useQuery({
    queryKey: ["hubs", { activeOnly }],
    queryFn: () => hubService.listHubs(activeOnly),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateHub() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: HubInput) => hubService.createHub(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hubs"] })
    },
  })
}

export function useUpdateHub() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<HubInput> }) =>
      hubService.updateHub(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hubs"] })
    },
  })
}

export function useToggleHubActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      hubService.updateHub(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hubs"] })
    },
  })
}
