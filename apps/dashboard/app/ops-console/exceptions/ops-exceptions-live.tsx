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
  const { data } = useExceptions({})

  // ⚡ Bolt Optimization: Memoize mapped API data
  // What: Wraps the `.map()` transformation in `React.useMemo` and uses fallback `data ?? []` inline.
  // Why: Prevents passing a new array reference to the table on every render, especially avoiding `data = []` defaults causing changing references during loading.
  // Impact: Avoids unnecessary deep re-renders of the V7OpsExceptions list.
  const rows = React.useMemo(() => (data ?? []).map(toRow), [data])
  return <V7OpsExceptions rows={rows} />
}
