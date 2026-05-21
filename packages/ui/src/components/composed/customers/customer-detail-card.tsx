import * as React from "react"
import { format, formatDistanceToNow, parseISO } from "date-fns"
import type { Customer } from "@workspace/types"
import { cn } from "@workspace/ui/lib/utils"
import {
  RiMapPinLine,
  RiPhoneLine,
  RiMailLine,
  RiBuilding4Line,
  RiCalendarLine,
  RiBox3Line,
  RiMoneyDollarCircleLine,
  RiAlertLine,
  RiBarChart2Line,
} from "@workspace/ui/icons"

interface CustomerDetailCardProps {
  customer: Customer
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string
  value: string
  hint?: string
  icon: React.ElementType
  tone?: "default" | "warning" | "success"
}) {
  return (
    <div
      className={cn(
        "border border-border bg-card p-3 space-y-1.5",
        tone === "warning" && "border-accent-warning/30 bg-accent-warning/5",
        tone === "success" && "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            tone === "warning"
              ? "text-accent-warning"
              : tone === "success"
                ? "text-primary"
                : "text-muted-foreground/60"
          )}
          aria-hidden="true"
        />
      </div>
      <p
        className={cn(
          "font-sans text-lg font-semibold tabular-nums",
          tone === "warning"
            ? "text-accent-warning"
            : tone === "success"
              ? "text-primary"
              : "text-foreground"
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="font-mono text-2xs text-muted-foreground/70">{hint}</p>
      )}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  multiline,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  multiline?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon
        className="h-4 w-4 text-muted-foreground/70 shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground/60">
          {label}
        </p>
        <p
          className={cn(
            "font-sans text-sm text-foreground",
            multiline ? "whitespace-pre-line" : "truncate"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

export function CustomerDetailCard({ customer }: CustomerDetailCardProps) {
  const addressLines = [
    customer.addressLine1,
    customer.addressLine2,
    [customer.city, customer.state, customer.zip].filter(Boolean).join(", "),
  ].filter(Boolean)

  const createdLabel = customer.createdAt
    ? formatDistanceToNow(parseISO(customer.createdAt), { addSuffix: true })
    : "—"
  const createdAbsolute = customer.createdAt
    ? format(parseISO(customer.createdAt), "dd MMM yyyy")
    : "—"

  const avgOrderValue =
    customer.totalShipments > 0
      ? customer.totalRevenue / customer.totalShipments
      : 0

  const accountStatus =
    customer.outstandingBalance > 0
      ? { label: "Outstanding Balance", tone: "warning" as const }
      : customer.totalShipments > 0
        ? { label: "Active", tone: "success" as const }
        : { label: "New", tone: "default" as const }

  return (
    <div className="space-y-4">
      {/* Stats row — full-width, four-column on lg. Hoisting the KPIs above
          the profile card means the customer profile no longer fights a
          1/3-width column for vertical real estate, and the row of stats
          gives operators a scannable top-line snapshot. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Total Shipments"
          value={customer.totalShipments.toLocaleString("en-IN")}
          hint={
            customer.totalShipments === 0
              ? "No shipments yet"
              : "Across this account"
          }
          icon={RiBox3Line}
        />
        <StatTile
          label="Total Revenue"
          value={`₹${customer.totalRevenue.toLocaleString("en-IN", {
            maximumFractionDigits: 0,
          })}`}
          hint="Lifetime billed"
          icon={RiMoneyDollarCircleLine}
          tone={customer.totalRevenue > 0 ? "success" : "default"}
        />
        <StatTile
          label="Outstanding"
          value={`₹${customer.outstandingBalance.toLocaleString("en-IN", {
            maximumFractionDigits: 0,
          })}`}
          hint={
            customer.outstandingBalance > 0 ? "Awaiting payment" : "All cleared"
          }
          icon={RiAlertLine}
          tone={customer.outstandingBalance > 0 ? "warning" : "success"}
        />
        <StatTile
          label="Avg AWB Value"
          value={`₹${avgOrderValue.toLocaleString("en-IN", {
            maximumFractionDigits: 0,
          })}`}
          hint={
            customer.totalShipments > 0
              ? `Across ${customer.totalShipments} shipments`
              : "No data yet"
          }
          icon={RiBarChart2Line}
        />
      </div>

      {/* Profile card — full-width below the stats */}
      <div className="border border-border bg-card p-5 space-y-4">
        {/* Header row: name + IDs (left) / status badge (right) */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-xl font-bold text-foreground truncate">
              {customer.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
                ID · {customer.id.slice(0, 8)}
              </span>
              {customer.gstin && (
                <span className="font-mono text-2xs text-muted-foreground">
                  GSTIN ·{" "}
                  <span className="text-foreground">{customer.gstin}</span>
                </span>
              )}
            </div>
          </div>
          <span
            className={cn(
              "font-mono text-2xs uppercase tracking-widest border px-2 py-0.5 shrink-0",
              accountStatus.tone === "warning" &&
                "border-accent-warning/40 bg-accent-warning/10 text-accent-warning",
              accountStatus.tone === "success" &&
                "border-primary/40 bg-primary/10 text-primary",
              accountStatus.tone === "default" &&
                "border-border bg-muted text-muted-foreground"
            )}
          >
            {accountStatus.label}
          </span>
        </div>

        {/* Info grid — phone / email / address / customer-since */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 divide-border">
          <InfoRow icon={RiPhoneLine} label="Phone" value={customer.phone} />
          <InfoRow
            icon={RiMailLine}
            label="Email"
            value={
              customer.email ?? (
                <span className="text-muted-foreground/50">—</span>
              )
            }
          />
          <InfoRow
            icon={RiMapPinLine}
            label="Billing Address"
            value={addressLines.join("\n") || "—"}
            multiline
          />
          <InfoRow
            icon={RiCalendarLine}
            label="Customer Since"
            value={
              <>
                {createdAbsolute}
                <span className="ml-2 font-mono text-2xs text-muted-foreground">
                  ({createdLabel})
                </span>
              </>
            }
          />
        </div>
      </div>

      {/* Tax & Compliance — sibling card, full-width */}
      <div className="border border-border bg-card p-5">
        <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
          <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
            Tax & Compliance
          </p>
          <RiBuilding4Line
            className="h-3.5 w-3.5 text-muted-foreground/60"
            aria-hidden="true"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-0.5">
            <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
              GSTIN
            </p>
            <p
              className={cn(
                "font-mono text-sm tabular-nums",
                customer.gstin ? "text-foreground" : "text-muted-foreground/50"
              )}
            >
              {customer.gstin || "Not provided"}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
              State Code
            </p>
            <p className="font-mono text-sm text-foreground">
              {customer.state || "—"}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
              Pincode
            </p>
            <p className="font-mono text-sm tabular-nums text-foreground">
              {customer.zip || "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
