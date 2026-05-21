"use client"

import * as React from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { RiCalculatorLine } from "@workspace/ui/icons"

const HUBS = ["IMP", "DEL", "BLR", "BOM", "GAU", "CCU", "MAA", "HYD", "AGT", "IXA"] as const
const SERVICES = ["standard", "express", "priority", "same_day"] as const

interface Quote {
  total: number
  base: number
  fuel: number
  handling: number
  chargeable: number
}

export function RateCalculator() {
  const [origin, setOrigin] = React.useState<string>("IMP")
  const [dest, setDest] = React.useState<string>("DEL")
  const [service, setService] = React.useState<string>("standard")
  const [weight, setWeight] = React.useState<string>("5")
  const [pieces, setPieces] = React.useState<string>("1")
  const [quote, setQuote] = React.useState<Quote | null>(null)

  function calculate() {
    const kg = Math.max(1, Number(weight) || 1)
    // Stub formula matching default rate cards in seed.sql
    type RateRow = { base: number; perKg: number; min: number; fuelPct: number; handling: number }
    const RATES: Record<string, RateRow> = {
      standard: { base: 50, perKg: 18, min: 100, fuelPct: 8, handling: 25 },
      express:  { base: 80, perKg: 28, min: 200, fuelPct: 8, handling: 35 },
      priority: { base: 250, perKg: 65, min: 500, fuelPct: 12, handling: 50 },
      same_day: { base: 500, perKg: 95, min: 800, fuelPct: 15, handling: 50 },
    }
    const r = RATES[service] ?? RATES.standard!
    const baseFreight = Math.max(r.min, r.base + r.perKg * kg)
    const fuel = (baseFreight * r.fuelPct) / 100
    const total = Math.round(baseFreight + fuel + r.handling + 30)
    setQuote({ total, base: Math.round(baseFreight), fuel: Math.round(fuel), handling: r.handling, chargeable: kg })
  }

  return (
    <div className="space-y-6">
      <div className="tac-fui-panel space-y-4 p-6">
        <p className="border-b border-border pb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Shipment details
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Origin hub">
            <SelectField value={origin} onChange={setOrigin} options={HUBS as unknown as string[]} />
          </Field>
          <Field label="Destination hub">
            <SelectField value={dest} onChange={setDest} options={HUBS as unknown as string[]} />
          </Field>
          <Field label="Service level">
            <SelectField value={service} onChange={setService} options={SERVICES as unknown as string[]} />
          </Field>
          <Field label="Pieces">
            <Input value={pieces} onChange={(e) => setPieces(e.target.value)} type="number" min={1} />
          </Field>
          <Field label="Chargeable weight (kg)">
            <Input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" min={0.5} step={0.5} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button onClick={calculate}>
            <RiCalculatorLine className="mr-2 size-4" aria-hidden="true" />
            Calculate rate
          </Button>
        </div>
      </div>

      {quote && (
        <div className="tac-fui-panel border-l-2 border-l-primary p-6">
          <p className="tac-mono-label">Indicative rate</p>
          <p className="mt-2 font-mono text-5xl text-foreground">₹{quote.total.toLocaleString()}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            For {pieces} piece{pieces === "1" ? "" : "s"}, {quote.chargeable} kg, {origin} → {dest}, {service.replace("_", " ")}
          </p>
          <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-4 text-sm">
            <div>
              <dt className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Base freight</dt>
              <dd className="mt-1 font-mono">₹{quote.base.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Fuel surcharge</dt>
              <dd className="mt-1 font-mono">₹{quote.fuel.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Handling + docket</dt>
              <dd className="mt-1 font-mono">₹{quote.handling + 30}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Statutory taxes (CGST/SGST/IGST as applicable) are added at billing. Final rate is locked when the
            shipment is created.
          </p>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="block font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function SelectField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="font-mono uppercase tracking-wider">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="font-mono uppercase tracking-wider">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
