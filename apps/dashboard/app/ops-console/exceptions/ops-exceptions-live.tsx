"use client"

import * as React from "react"

import { useExceptions } from "@workspace/services/hooks/use-exceptions"
import { useRealtimeExceptions } from "@workspace/services/hooks/use-realtime"
import type { ExceptionSummary } from "@workspace/types/exception.types"
import {
  V7OpsExceptions,
  type ExceptionRow,
} from "@workspace/ui/components/composed/exceptions/v7-ops-exceptions"

function toRow(e: ExceptionSummary): ExceptionRow {
  return {
    awb: e.awbNumber ?? "—",
    status: e.status,
    sender: e.severity, // surface the severity in the sender column slot
    receiver: e.type,   // and the exception type in the receiver column slot
    route: e.description.slice(0, 40),
  }
}

export function OpsExceptionsLive() {
  useRealtimeExceptions()
  const query = useExceptions({})
  // Memoize row mapping to prevent unnecessary deep re-renders of DataTable
  const rows = React.useMemo(() => (query.data ?? []).map(toRow), [query.data])
  return <V7OpsExceptions rows={rows} />
}
