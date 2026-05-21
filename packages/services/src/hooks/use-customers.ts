"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createBrowserClient } from "@workspace/database/client"
import { createCustomerService } from "../customer.service"
import type { Customer, CustomerFilters } from "@workspace/types"

const db = createBrowserClient()
const customerService = createCustomerService(db)

export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: ["customers", filters],
    queryFn: () => customerService.getCustomers(filters),
    staleTime: 2 * 60 * 1000,
  })
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: () => customerService.getCustomerById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCustomerShipments(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customers", customerId, "shipments"],
    queryFn: () => customerService.getShipmentsByCustomer(customerId!),
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof customerService.createCustomer>[0]) =>
      customerService.createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Customer> }) =>
      customerService.updateCustomer(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      queryClient.invalidateQueries({ queryKey: ["customers", id] })
    },
  })
}
