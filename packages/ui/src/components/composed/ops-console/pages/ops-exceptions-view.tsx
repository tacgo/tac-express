import * as React from "react"

import { RiShieldCheckLine } from "@workspace/ui/icons"

import { OpsFrame } from "../ops-frame"
import { OpsPageHead } from "../ops-page-head"
import { OpsEmptyState } from "../ops-empty-state"
import {
  OpsTable,
  OpsTableHead,
  OpsTableBody,
  OpsTableRow,
  OpsTableHeader,
  OpsTableCell,
} from "../ops-table"

interface ExceptionRow {
  awb: string
  status: string
  sender: string
  receiver: string
  route: string
}

interface OpsExceptionsViewProps {
  rows: ExceptionRow[]
}

function OpsExceptionsView({ rows }: OpsExceptionsViewProps) {
  return (
    <OpsFrame>
      <OpsPageHead
        eyebrow="Operations"
        title="Exceptions"
        sub="Shipment exceptions requiring attention"
      />
      {rows.length === 0 ? (
        // Standardised empty state instead of an inline OpsTableCell. Matches
        // the 4-element pattern (icon + eyebrow + headline + description)
        // used by every other ops-console list and gives screen readers a
        // proper heading. Closes #57.
        <OpsEmptyState
          icon={RiShieldCheckLine}
          eyebrow="NO EXCEPTIONS"
          headline="All shipments are clear."
          description="No exceptions are open right now. If a shipment is delayed, damaged, or lost, it will appear here for action."
        />
      ) : (
        <OpsTable>
          <OpsTableHead>
            <tr>
              <OpsTableHeader>AWB</OpsTableHeader>
              <OpsTableHeader>Status</OpsTableHeader>
              <OpsTableHeader>Sender</OpsTableHeader>
              <OpsTableHeader>Receiver</OpsTableHeader>
              <OpsTableHeader>Route</OpsTableHeader>
            </tr>
          </OpsTableHead>
          <OpsTableBody>
            {rows.map((r) => (
              <OpsTableRow key={r.awb}>
                <OpsTableCell>
                  <span className="paper-id">{r.awb}</span>
                </OpsTableCell>
                <OpsTableCell mono>{r.status}</OpsTableCell>
                <OpsTableCell>{r.sender}</OpsTableCell>
                <OpsTableCell>{r.receiver}</OpsTableCell>
                <OpsTableCell mono>{r.route}</OpsTableCell>
              </OpsTableRow>
            ))}
          </OpsTableBody>
        </OpsTable>
      )}
    </OpsFrame>
  )
}

export { OpsExceptionsView }
export type { OpsExceptionsViewProps, ExceptionRow }
