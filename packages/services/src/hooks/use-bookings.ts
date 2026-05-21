"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { createBrowserClient } from "@workspace/database/client"

import {
  createBookingService,
  type BookingFilters,
  type BookingInput,
} from "../booking.service"

const db = createBrowserClient()
const bookingService = createBookingService(db)

export function useBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: ["bookings", filters],
    queryFn: () => bookingService.listBookings(filters),
    staleTime: 30 * 1000,
  })
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: () => bookingService.getBookingById(id!),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BookingInput) => bookingService.createBooking(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  })
}

export function useApproveBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => bookingService.approveBooking(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["bookings"] })
      qc.invalidateQueries({ queryKey: ["booking", id] })
    },
  })
}

export function useRejectBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      bookingService.rejectBooking(id, reason),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["bookings"] })
      qc.invalidateQueries({ queryKey: ["booking", vars.id] })
    },
  })
}

export function useConvertBookingToShipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => bookingService.convertBookingToShipment(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["bookings"] })
      qc.invalidateQueries({ queryKey: ["booking", id] })
      qc.invalidateQueries({ queryKey: ["shipments"] })
    },
  })
}
