"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import { Textarea } from "@workspace/ui/components/primitives/textarea"
import { Switch } from "@workspace/ui/components/primitives/switch"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/primitives/toggle-group"
import { DatePicker } from "@workspace/ui/components/primitives/date-picker"
import { Combobox } from "@workspace/ui/components/primitives/combobox"
import { TimePicker } from "@workspace/ui/components/primitives/time-picker"
import {
  RiPlaneLine,
  RiTruckLine,
  RiErrorWarningLine,
  RiArrowRightLine,
} from "@workspace/ui/icons"

export type ManifestType = "AIR" | "TRUCK"

export interface ManifestSetupValue {
  fromHubId: string
  toHubId: string
  type: ManifestType
  /** AIR fields */
  airlineCode?: string
  flightNumber?: string
  flightDate?: Date
  etd?: string
  eta?: string
  /** TRUCK fields */
  vehicleNumber?: string
  driverName?: string
  driverPhone?: string
  dispatchDate?: Date
  dispatchTime?: string
  /** Rules */
  onlyReady: boolean
  matchDestination: boolean
  excludeCod: boolean
  notes?: string
}

interface HubOption {
  value: string
  label: string
}

interface StepSetupProps {
  value: ManifestSetupValue
  onChange: (next: ManifestSetupValue) => void
  hubs: HubOption[]
  className?: string
}

export const DEFAULT_SETUP_VALUE: ManifestSetupValue = {
  fromHubId: "",
  toHubId: "",
  type: "AIR",
  onlyReady: true,
  matchDestination: true,
  excludeCod: false,
}

export function isSetupValid(v: ManifestSetupValue): boolean {
  if (!v.fromHubId || !v.toHubId || v.fromHubId === v.toHubId) return false
  if (v.type === "AIR") {
    if (!v.flightNumber || v.flightNumber.length < 2) return false
    if (!v.flightDate) return false
  } else {
    if (!v.vehicleNumber || v.vehicleNumber.length < 4) return false
    if (!v.dispatchDate) return false
  }
  return true
}

export function StepSetup({
  value,
  onChange,
  hubs,
  className,
}: StepSetupProps) {
  const update = <K extends keyof ManifestSetupValue>(
    key: K,
    next: ManifestSetupValue[K]
  ) => {
    onChange({ ...value, [key]: next })
  }

  const hubsEmpty = hubs.length === 0

  return (
    <div data-slot="manifest-step-setup" className={cn("grid gap-6", className)}>
      {/* Empty-state guard — if no hubs are configured the entire wizard is
          unusable (origin + destination are required). Surface a clear,
          actionable recovery path instead of letting the operator hit a
          dead "No results." dropdown. */}
      {hubsEmpty && (
        <div
          role="alert"
          className="border border-accent-warning/40 border-l-[length:var(--indicator-w)] border-l-accent-warning bg-accent-warning/5 p-4 flex items-start gap-3"
        >
          <RiErrorWarningLine
            aria-hidden
            className="size-5 text-accent-warning shrink-0 mt-0.5"
          />
          <div className="flex-1 space-y-2">
            <p className="tac-mono-label text-accent-warning">
              No hubs configured
            </p>
            <p className="t-body-sm text-foreground">
              You need at least two hubs (origin + destination) before you can
              build a manifest. Add hubs in Management → Hubs, then come back
              to create your first manifest.
            </p>
            <Link
              href="/ops-console/management"
              className="inline-flex items-center gap-1.5 mt-1 tac-mono-label text-primary hover:text-foreground transition-colors duration-fast focus-visible:outline-none focus-visible:tac-focus-premium"
            >
              Go to Hub Management
              <RiArrowRightLine aria-hidden className="size-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Route */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="from-hub">From Hub</Label>
          <Combobox
            options={hubs}
            value={value.fromHubId}
            onChange={(v) => update("fromHubId", v)}
            placeholder="Select origin"
            aria-label="From Hub"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="to-hub">To Hub</Label>
          <Combobox
            options={hubs.map((h) =>
              h.value === value.fromHubId ? { ...h, disabled: true } : h
            )}
            value={value.toHubId}
            onChange={(v) => update("toHubId", v)}
            placeholder="Select destination"
            aria-label="To Hub"
          />
        </div>
      </section>

      {/* Type */}
      <section className="grid gap-1.5">
        <Label>Transport Type</Label>
        <ToggleGroup
          type="single"
          value={value.type}
          onValueChange={(v) => v && update("type", v as ManifestType)}
          className="w-full"
        >
          <ToggleGroupItem value="AIR" className="flex-1 gap-2" aria-label="Air freight">
            <RiPlaneLine />
            <span className="font-mono text-paper-11 uppercase tracking-widest">
              Air
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem value="TRUCK" className="flex-1 gap-2" aria-label="Truck freight">
            <RiTruckLine />
            <span className="font-mono text-paper-11 uppercase tracking-widest">
              Truck
            </span>
          </ToggleGroupItem>
        </ToggleGroup>
      </section>

      {/* Mode-specific block */}
      {value.type === "AIR" ? (
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="airline">Airline Code (3-char)</Label>
            <Input
              id="airline"
              value={value.airlineCode ?? ""}
              maxLength={3}
              placeholder="6E"
              onChange={(e) =>
                update("airlineCode", e.target.value.toUpperCase())
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="flight">Flight Number</Label>
            <Input
              id="flight"
              value={value.flightNumber ?? ""}
              placeholder="6E-7042"
              onChange={(e) =>
                update("flightNumber", e.target.value.toUpperCase())
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Flight Date</Label>
            <DatePicker
              value={value.flightDate}
              onChange={(d) => update("flightDate", d)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="etd">ETD</Label>
              <TimePicker
                id="etd"
                aria-label="Estimated departure time"
                value={value.etd ?? ""}
                onChange={(v) => update("etd", v)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="eta">ETA</Label>
              <TimePicker
                id="eta"
                aria-label="Estimated arrival time"
                value={value.eta ?? ""}
                onChange={(v) => update("eta", v)}
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="vehicle">Vehicle Number</Label>
            <Input
              id="vehicle"
              value={value.vehicleNumber ?? ""}
              placeholder="MN-04-AB-1234"
              onChange={(e) =>
                update("vehicleNumber", e.target.value.toUpperCase())
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="driver">Driver Name</Label>
            <Input
              id="driver"
              value={value.driverName ?? ""}
              onChange={(e) => update("driverName", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="driver-phone">Driver Phone</Label>
            <Input
              id="driver-phone"
              type="tel"
              value={value.driverPhone ?? ""}
              maxLength={10}
              onChange={(e) =>
                update("driverPhone", e.target.value.replace(/\D/g, ""))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Dispatch Date</Label>
            <DatePicker
              value={value.dispatchDate}
              onChange={(d) => update("dispatchDate", d)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dispatch-time">Dispatch Time</Label>
            <TimePicker
              id="dispatch-time"
              aria-label="Dispatch time"
              value={value.dispatchTime ?? ""}
              onChange={(v) => update("dispatchTime", v)}
            />
          </div>
        </section>
      )}

      {/* Rules */}
      <section className="grid gap-2">
        <p className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
          Auto-validate scans against
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex items-center justify-between border border-border bg-background px-3 py-2">
            <span className="font-mono text-paper-11 uppercase tracking-widest">
              Only Ready Status
            </span>
            <Switch
              checked={value.onlyReady}
              onCheckedChange={(c) => update("onlyReady", c)}
            />
          </label>
          <label className="flex items-center justify-between border border-border bg-background px-3 py-2">
            <span className="font-mono text-paper-11 uppercase tracking-widest">
              Match Destination
            </span>
            <Switch
              checked={value.matchDestination}
              onCheckedChange={(c) => update("matchDestination", c)}
            />
          </label>
          <label className="flex items-center justify-between border border-border bg-background px-3 py-2">
            <span className="font-mono text-paper-11 uppercase tracking-widest">
              Exclude COD
            </span>
            <Switch
              checked={value.excludeCod}
              onCheckedChange={(c) => update("excludeCod", c)}
            />
          </label>
        </div>
      </section>

      {/* Notes */}
      <section className="grid gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          rows={3}
          value={value.notes ?? ""}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Special handling, customs reference, contact persons…"
        />
      </section>
    </div>
  )
}
