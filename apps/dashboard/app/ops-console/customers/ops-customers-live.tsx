"use client"

import * as React from "react"

import { useCustomers } from "@workspace/services/hooks/use-customers"
import type { Customer } from "@workspace/types"
import { useDesignVersion } from "@workspace/ui/hooks/use-design-version"
import {
  OpsCustomersView,
  type CustomerRow,
} from "@workspace/ui/components/composed/ops-console/pages"
import { V7OpsCustomers } from "@workspace/ui/components/composed/customers/v7-ops-customers"

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
  const { data = [] } = useCustomers({})
  const { version } = useDesignVersion()
  const rows = data.map(toRow)

  if (version === "v7") return <V7OpsCustomers rows={rows} />
  return <OpsCustomersView rows={rows} />
}
