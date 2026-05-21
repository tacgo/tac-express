"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createBrowserClient } from "@workspace/database/client"
import { createInvoiceService, type CreateInvoiceDbInput } from "../invoice.service"
import type { InvoiceFilters } from "@workspace/types"

const db = createBrowserClient()
const invoiceService = createInvoiceService(db)

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateInvoiceDbInput) => invoiceService.createInvoice(payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices"] }) },
  })
}

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: () => invoiceService.getInvoices(filters),
    staleTime: 2 * 60 * 1000,
  })
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: () => invoiceService.getInvoiceById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useIssueInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invoiceService.issueInvoice(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices"] }) },
  })
}

export function useMarkPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paidAt }: { id: string; paidAt?: string }) =>
      invoiceService.markPaid(id, paidAt),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices"] }) },
  })
}

export function useCancelInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invoiceService.cancelInvoice(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices"] }) },
  })
}
