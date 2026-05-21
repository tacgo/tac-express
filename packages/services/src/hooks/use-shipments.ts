import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { ShipmentFilters } from "@workspace/types"
import { createBrowserClient } from "@workspace/database/client"
import { createShipmentService, type CreateShipmentDbInput } from "../shipment.service"

const db = createBrowserClient()
const shipmentService = createShipmentService(db)

/**
 * Browser-side shipment service singleton. Exported for imperative use
 * in event handlers / effects (e.g. arrival audit, manifest builder)
 * so consumer apps don't need to instantiate `@workspace/database` directly.
 */
export { shipmentService }

export function useShipments(filters: ShipmentFilters = {}) {
  return useQuery({
    queryKey: ["shipments", filters],
    queryFn: () => shipmentService.getShipments(filters),
    staleTime: 2 * 60 * 1000,
  })
}

export function useShipment(id: string) {
  return useQuery({
    queryKey: ["shipment", id],
    queryFn: () => shipmentService.getShipmentById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Mutation that reserves a fresh AWB number via the server-side RPC.
 * Used by the invoice-create wizard to auto-fill the AWB field on mount.
 */
export function useGenerateAwbNumber() {
  return useMutation({
    mutationFn: () => shipmentService.generateAwbNumber(),
  })
}

export function useShipmentByAwb(awb: string) {
  return useQuery({
    queryKey: ["shipment-awb", awb],
    queryFn: () => shipmentService.getShipmentByAwb(awb),
    enabled: !!awb,
  })
}

export function useTrackingEvents(awbNumber: string) {
  return useQuery({
    queryKey: ["tracking", awbNumber],
    queryFn: () => shipmentService.getTrackingEvents(awbNumber),
    enabled: !!awbNumber,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useCreateShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateShipmentDbInput) => shipmentService.createShipment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] })
    },
  })
}

/**
 * Bulk-create shipments (CSV import / API ingest path). Returns per-row
 * outcome including the list of error messages keyed by 1-based row number.
 */
export function useBulkCreateShipments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (inputs: CreateShipmentDbInput[]) =>
      shipmentService.bulkCreateShipments(inputs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useUpdateShipmentStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Parameters<typeof shipmentService.updateStatus>[1] }) =>
      shipmentService.updateStatus(id, status),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["shipment", id] })
      queryClient.invalidateQueries({ queryKey: ["shipments"] })
    },
  })
}
