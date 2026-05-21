import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { ManifestFilters } from "@workspace/types"
import { createBrowserClient } from "@workspace/database/client"
import { createManifestService } from "../manifest.service"

const db = createBrowserClient()
const manifestService = createManifestService(db)

export function useManifests(filters: ManifestFilters = {}) {
  return useQuery({
    queryKey: ["manifests", filters],
    queryFn: () => manifestService.getManifests(filters),
    staleTime: 2 * 60 * 1000,
  })
}

export function useManifest(id: string) {
  return useQuery({
    queryKey: ["manifest", id],
    queryFn: () => manifestService.getManifestById(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}

export function useManifestShipments(manifestId: string) {
  return useQuery({
    queryKey: ["manifest-shipments", manifestId],
    queryFn: () => manifestService.getManifestShipments(manifestId),
    enabled: !!manifestId,
    staleTime: 30 * 1000,
  })
}

export function useCreateManifest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: manifestService.createManifest.bind(manifestService),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manifests"] }),
  })
}

export function useAddShipmentToManifest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ manifestId, awb }: { manifestId: string; awb: string }) =>
      manifestService.addShipmentToManifest(manifestId, awb),
    onSuccess: (_data, { manifestId }) => {
      queryClient.invalidateQueries({ queryKey: ["manifest", manifestId] })
      queryClient.invalidateQueries({ queryKey: ["manifest-shipments", manifestId] })
    },
  })
}

export function useCloseManifest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (manifestId: string) => manifestService.closeManifest(manifestId),
    onSuccess: (_data, manifestId) => {
      queryClient.invalidateQueries({ queryKey: ["manifest", manifestId] })
      queryClient.invalidateQueries({ queryKey: ["manifests"] })
    },
  })
}

export function useDepartManifest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (manifestId: string) => manifestService.departManifest(manifestId),
    onSuccess: (_data, manifestId) => {
      queryClient.invalidateQueries({ queryKey: ["manifest", manifestId] })
      queryClient.invalidateQueries({ queryKey: ["manifests"] })
    },
  })
}

export function useArriveManifest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (manifestId: string) => manifestService.arriveManifest(manifestId),
    onSuccess: (_data, manifestId) => {
      queryClient.invalidateQueries({ queryKey: ["manifest", manifestId] })
      queryClient.invalidateQueries({ queryKey: ["manifests"] })
    },
  })
}

export function useReconcileManifest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (manifestId: string) => manifestService.reconcileManifest(manifestId),
    onSuccess: (_data, manifestId) => {
      queryClient.invalidateQueries({ queryKey: ["manifest", manifestId] })
      queryClient.invalidateQueries({ queryKey: ["manifests"] })
    },
  })
}
