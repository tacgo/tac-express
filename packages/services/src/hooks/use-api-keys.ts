import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ApiKeyInput } from "@workspace/types"
import { createBrowserClient } from "@workspace/database/client"
import { createApiKeyService } from "../api-key.service"

const db = createBrowserClient()
const apiKeyService = createApiKeyService(db)

const QUERY_KEY = ["api-keys"] as const

export function useApiKeys() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => apiKeyService.listApiKeys(),
    staleTime: 60 * 1000,
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ApiKeyInput) => apiKeyService.createApiKey(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiKeyService.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
