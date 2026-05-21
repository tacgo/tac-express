"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createBrowserClient } from "@workspace/database/client"
import type { ContactLeadFilters, ContactLeadStatus } from "@workspace/types"

import { createContactLeadInboxService } from "../contact-lead.service"

// Browser client + service instantiated once at module scope (mirrors
// use-customers.ts). RLS on contact_leads gates reads/updates to MANAGER+;
// a lower-role session simply receives zero rows.
const db = createBrowserClient()
const inbox = createContactLeadInboxService(db)

export function useContactLeads(filters: ContactLeadFilters = {}) {
  return useQuery({
    queryKey: ["contact-leads", filters],
    queryFn: () => inbox.getContactLeads(filters),
    staleTime: 60 * 1000,
  })
}

export function useContactLead(id: string | undefined) {
  return useQuery({
    queryKey: ["contact-leads", id],
    queryFn: () => inbox.getContactLeadById(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}

export function useUpdateContactLeadStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactLeadStatus }) =>
      inbox.updateContactLeadStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["contact-leads"] })
      queryClient.invalidateQueries({ queryKey: ["contact-leads", id] })
    },
  })
}
