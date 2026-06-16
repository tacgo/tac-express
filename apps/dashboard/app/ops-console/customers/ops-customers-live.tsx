"use client"

import * as React from "react"

import { useCustomers } from "@workspace/services/hooks/use-customers"
import type { Customer } from "@workspace/types"
import {
  V7OpsCustomers,
  type CustomerRow,
} from "@workspace/ui/components/composed/customers/v7-ops-customers"

function toRow(c: Customer): CustomerRow {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? "",
    phone: c.phone,
    location: c.city,
    state: c.state,
    gstin: c.gstin,
    shipments: c.totalShipments,
    revenue: `₹${c.totalRevenue.toLocaleString("en-IN")}`,
    outstanding: `₹${(c.totalRevenue - c.totalRevenue).toLocaleString("en-IN")}`,
  }
}

export function OpsCustomersLive() {
  const { data } = useCustomers({})

  // ⚡ Bolt Optimization: Memoize mapped API data
  // What: Wraps the `.map()` transformation in `React.useMemo` and uses fallback `data ?? []` inline.
  // Why: Prevents passing a new array reference to the TanStack table on every render, especially avoiding `data = []` defaults causing changing references during loading.
  // Impact: Avoids unnecessary deep re-renders of the V7OpsCustomers list and state resets.
  const rows = React.useMemo(() => (data ?? []).map(toRow), [data])
  // Canonical v7 — v6 paper view retired in Phase 4 composition unification.
  return <V7OpsCustomers rows={rows} />
}
