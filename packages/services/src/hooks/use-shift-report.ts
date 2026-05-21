"use client"

import { useQuery } from "@tanstack/react-query"

import { createBrowserClient } from "@workspace/database/client"

import {
  createShiftReportService,
  type ShiftReportRequest,
} from "../shift-report.service"

const db = createBrowserClient()
const shiftReportService = createShiftReportService(db)

export function useShiftReport(req: ShiftReportRequest = {}) {
  return useQuery({
    queryKey: ["shift-report", req],
    queryFn: () => shiftReportService.getReport(req),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}
