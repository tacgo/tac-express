"use client"



import * as React from "react"
import Link from "next/link"

import { RiAddLine } from "@workspace/ui/icons"
import { OpsFrame } from "../ops-frame"
import { OpsPageHead } from "../ops-page-head"
import { OpsButton } from "../ops-button"
import { OpsBadge } from "../ops-badge"
import { OpsFieldInput } from "../ops-field"
import {
  OpsTable,
  OpsTableHead,
  OpsTableBody,
  OpsTableRow,
  OpsTableHeader,
  OpsTableCell,
} from "../ops-table"

interface RateCardRow {
  route: string
  service: "Priority" | "Standard"
  slab: string
  rate: string
  docket: string
  fuelPct: string
  handling: string
}

interface OpsRateCardsViewProps {
  rows: RateCardRow[]
}

function OpsRateCardsView({ rows }: OpsRateCardsViewProps) {
  const [origin, setOrigin] = React.useState("")
  const [dest, setDest] = React.useState("")
  const filtered = rows.filter((r) => {
    if (origin && !r.route.toLowerCase().includes(origin.toLowerCase())) return false
    if (dest && !r.route.toLowerCase().includes(dest.toLowerCase())) return false
    return true
  })

  return (
    <OpsFrame size="table">
      <OpsPageHead
        eyebrow="Business"
        title="Rate Cards"
        sub="Pricing rules per route, service level, and weight slab"
        actions={
          // Routes to the dedicated create page (apps/dashboard/app/ops-console/rates/create/).
          // The label "Add Rate Card" now matches the destination — operators land on a
          // form, not a list. Closes #58.
          <OpsButton asChild variant="primary">
            <Link href="/ops-console/rates/create">
              <RiAddLine aria-hidden className="size-3" />
              Add Rate Card
            </Link>
          </OpsButton>
        }
      />
      <div className="flex items-center gap-3 mb-3.5">
        <OpsFieldInput
          aria-label="Filter origin"
          placeholder="FILTER ORIGIN (E.G. IMPHA"
          // eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md
          className="max-w-[240px]"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />
        <OpsFieldInput
          aria-label="Filter destination"
          placeholder="FILTER DESTINATION"
          // eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md
          className="max-w-[240px]"
          value={dest}
          onChange={(e) => setDest(e.target.value)}
        />
      </div>
      <OpsTable>
        <OpsTableHead>
          <tr>
            <OpsTableHeader>Route</OpsTableHeader>
            <OpsTableHeader>Service</OpsTableHeader>
            <OpsTableHeader>Slab (kg)</OpsTableHeader>
            <OpsTableHeader>Rate/kg</OpsTableHeader>
            <OpsTableHeader>Docket</OpsTableHeader>
            <OpsTableHeader>Fuel %</OpsTableHeader>
            <OpsTableHeader>Handling</OpsTableHeader>
            <OpsTableHeader>
              <span className="sr-only">Actions</span>
            </OpsTableHeader>
          </tr>
        </OpsTableHead>
        <OpsTableBody>
          {filtered.map((r, i) => (
            <OpsTableRow key={`${r.route}-${r.service}-${r.slab}-${i}`}>
              <OpsTableCell mono className="uppercase">
                {r.route}
              </OpsTableCell>
              <OpsTableCell>
                <OpsBadge tone={r.service === "Priority" ? "warn" : "neutral"}>
                  {r.service}
                </OpsBadge>
              </OpsTableCell>
              <OpsTableCell mono>{r.slab}</OpsTableCell>
              <OpsTableCell mono>{r.rate}</OpsTableCell>
              <OpsTableCell mono>{r.docket}</OpsTableCell>
              <OpsTableCell mono>{r.fuelPct}</OpsTableCell>
              <OpsTableCell mono>{r.handling}</OpsTableCell>
              <OpsTableCell>
                <OpsButton size="sm" variant="danger">
                  Deactivate
                </OpsButton>
              </OpsTableCell>
            </OpsTableRow>
          ))}
        </OpsTableBody>
      </OpsTable>
    </OpsFrame>
  )
}

export { OpsRateCardsView }
export type { OpsRateCardsViewProps, RateCardRow }
