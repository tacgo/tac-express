import type { Metadata } from "next"

import { ShiftReportClient } from "./shift-report-client"

export const metadata: Metadata = {
  title: "Shift Report · TAC Express",
  description: "Trailing operations summary by hub and duration.",
}

export default function ShiftReportPage() {
  return <ShiftReportClient />
}
export const dynamic = 'force-dynamic'
