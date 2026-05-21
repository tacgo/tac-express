import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { WebhookInput } from "@workspace/types"
import { createBrowserClient } from "@workspace/database/client"
import { createWebhookService } from "../webhook.service"

const db = createBrowserClient()
const webhookService = createWebhookService(db)

const QUERY_KEY = ["webhooks"] as const

export function useWebhooks() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => webhookService.listWebhooks(),
    staleTime: 60 * 1000,
  })
}

export function useCreateWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WebhookInput) => webhookService.createWebhook(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => webhookService.deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
