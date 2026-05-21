"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { createBrowserClient } from "@workspace/database/client"

import {
  createPaymentService,
  type RecordPaymentInput,
} from "../payment.service"

const db = createBrowserClient()
const paymentService = createPaymentService(db)

export function usePaymentsForInvoice(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["payments", invoiceId],
    queryFn: () => paymentService.listForInvoice(invoiceId!),
    enabled: Boolean(invoiceId),
    staleTime: 60 * 1000,
  })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RecordPaymentInput) =>
      paymentService.recordPayment(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["payments", vars.invoiceId] })
      qc.invalidateQueries({ queryKey: ["invoice", vars.invoiceId] })
      qc.invalidateQueries({ queryKey: ["invoices"] })
    },
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; invoiceId: string }) =>
      paymentService.deletePayment(id),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["payments", vars.invoiceId] })
      qc.invalidateQueries({ queryKey: ["invoice", vars.invoiceId] })
      qc.invalidateQueries({ queryKey: ["invoices"] })
    },
  })
}
