"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createBrowserClient } from "@workspace/database/client"
import { createRateCardService } from "../rate-card.service"
import type { RateCardFilters, RateCardInput } from "@workspace/types"

const db = createBrowserClient()
const rateCardService = createRateCardService(db)

export function useRateCards(filters: RateCardFilters = {}) {
  return useQuery({
    queryKey: ["rate-cards", filters],
    queryFn: () => rateCardService.getRateCards(filters),
    staleTime: 5 * 60 * 1000,
  })
}

export function useRateLookup(
  originHub: string | undefined,
  destHub: string | undefined,
  serviceLevel: string | undefined,
  weight: number | undefined,
) {
  return useQuery({
    queryKey: ["rate-lookup", originHub, destHub, serviceLevel, weight],
    queryFn: () =>
      rateCardService.lookupRate(originHub!, destHub!, serviceLevel!, weight!),
    enabled: !!(originHub && destHub && serviceLevel && weight && weight > 0),
    staleTime: 60 * 1000,
  })
}

export function useCreateRateCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RateCardInput) => rateCardService.createRateCard(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rate-cards"] }),
  })
}

export function useUpdateRateCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RateCardInput> }) =>
      rateCardService.updateRateCard(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rate-cards"] }),
  })
}

export function useDeactivateRateCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rateCardService.deactivateRateCard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rate-cards"] }),
  })
}

export function useRateLookupMutation() {
  return useMutation({
    mutationFn: ({
      originHub,
      destHub,
      serviceLevel,
      weight,
    }: {
      originHub: string
      destHub: string
      serviceLevel: string
      weight: number
    }) => rateCardService.lookupRate(originHub, destHub, serviceLevel, weight),
  })
}
