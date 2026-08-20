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
  const query = useCustomers({})
  // ⚡ Bolt: Memoize array mapping to prevent DataTable re-renders on every update
  const rows = React.useMemo(() => (query.data ?? []).map(toRow), [query.data])
  // Canonical v7 — v6 paper view retired in Phase 4 composition unification.
  return <V7OpsCustomers rows={rows} />
}
