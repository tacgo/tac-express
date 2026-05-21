"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { createBrowserClient } from "@workspace/database/client"
import type { SavedViewEntity, SavedViewInput } from "@workspace/types"

import { createSavedViewService } from "../saved-view.service"

const db = createBrowserClient()
const savedViewService = createSavedViewService(db)

export function useSavedViews(userId: string | undefined, entityType: SavedViewEntity) {
  return useQuery({
    queryKey: ["saved-views", entityType, userId],
    queryFn: () => savedViewService.listForUser(userId!, entityType),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  })
}

export function useCreateSavedView(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SavedViewInput) => {
      if (!userId) throw new Error("Missing userId")
      return savedViewService.createView(userId, input)
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({
        queryKey: ["saved-views", saved.entityType, userId],
      })
    },
  })
}

export function useUpdateSavedView() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<SavedViewInput>
    }) => savedViewService.updateView(id, patch),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["saved-views", saved.entityType] })
    },
  })
}

export function useDeleteSavedView(entityType: SavedViewEntity) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => savedViewService.deleteView(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-views", entityType] })
    },
  })
}
