"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import { Textarea } from "@workspace/ui/components/primitives/textarea"
import {
  FileDropzone,
  type FileDropzoneFile,
} from "@workspace/ui/components/primitives/file-dropzone"
import {
  RiAddLine,
  RiDeleteBinLine,
  RiSendPlaneLine,
} from "@workspace/ui/icons"

export interface BookingPartyValue {
  name: string
  phone: string
  email?: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zip: string
}

export interface VolumeRowValue {
  length: string
  width: string
  height: string
  weight: string
  count: string
}

export interface PublicBookingFormValues {
  whatsappNumber: string
  consignor: BookingPartyValue
  consignee: BookingPartyValue
  volumeMatrix: VolumeRowValue[]
  notes?: string
  images: FileDropzoneFile[]
}

interface PublicBookingFormProps {
  onSubmit: (values: PublicBookingFormValues) => Promise<void> | void
  className?: string
}

const EMPTY_PARTY: BookingPartyValue = {
  name: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
}

const EMPTY_ROW: VolumeRowValue = {
  length: "",
  width: "",
  height: "",
  weight: "",
  count: "1",
}

function isPartyValid(p: BookingPartyValue): boolean {
  return (
    p.name.trim().length > 1 &&
    /^\d{10}$/.test(p.phone.replace(/\D/g, "")) &&
    p.addressLine1.trim().length > 4 &&
    p.city.trim().length > 1 &&
    p.state.trim().length > 1 &&
    /^\d{6}$/.test(p.zip)
  )
}

function isRowValid(r: VolumeRowValue): boolean {
  const l = Number(r.length)
  const w = Number(r.width)
  const h = Number(r.height)
  const wt = Number(r.weight)
  const c = Number(r.count)
  return l > 0 && w > 0 && h > 0 && wt > 0 && c >= 1
}

export function PublicBookingForm({
  onSubmit,
  className,
}: PublicBookingFormProps) {
  const [whatsapp, setWhatsapp] = React.useState("")
  const [consignor, setConsignor] = React.useState<BookingPartyValue>({
    ...EMPTY_PARTY,
  })
  const [consignee, setConsignee] = React.useState<BookingPartyValue>({
    ...EMPTY_PARTY,
  })
  const [rows, setRows] = React.useState<VolumeRowValue[]>([{ ...EMPTY_ROW }])
  const [notes, setNotes] = React.useState("")
  const [images, setImages] = React.useState<FileDropzoneFile[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [submittedRefId, setSubmittedRefId] = React.useState<string | null>(
    null
  )

  const valid =
    /^\d{10}$/.test(whatsapp.replace(/\D/g, "")) &&
    isPartyValid(consignor) &&
    isPartyValid(consignee) &&
    rows.length > 0 &&
    rows.every(isRowValid)

  const addRow = () => setRows((r) => [...r, { ...EMPTY_ROW }])
  const removeRow = (idx: number) =>
    setRows((r) => r.filter((_, i) => i !== idx))
  const patchRow = (idx: number, patch: Partial<VolumeRowValue>) =>
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSubmitting(true)
    try {
      await onSubmit({
        whatsappNumber: whatsapp.replace(/\D/g, ""),
        consignor,
        consignee,
        volumeMatrix: rows,
        notes: notes.trim() || undefined,
        images,
      })
      setSubmittedRefId("OK") // consumer overrides via re-render if it has a ref id
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedRefId) {
    return (
      <div className="border border-border bg-card p-6 text-center">
        <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
          Booking submitted
        </p>
        <h2 className="mt-2 font-heading text-lg font-semibold">
          We&apos;ll be in touch on WhatsApp
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Our operations team will contact you shortly to confirm pickup. Your
          booking reference will arrive via WhatsApp.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => {
            setWhatsapp("")
            setConsignor({ ...EMPTY_PARTY })
            setConsignee({ ...EMPTY_PARTY })
            setRows([{ ...EMPTY_ROW }])
            setNotes("")
            setImages([])
            setSubmittedRefId(null)
          }}
        >
          Submit another booking
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      data-slot="public-booking-form"
      className={cn("space-y-6", className)}
    >
      <section className="grid gap-3 border border-border bg-card p-4">
        <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
          Contact
        </p>
        <div className="grid gap-1.5">
          <Label htmlFor="booking-whatsapp">
            WhatsApp number (10 digits)
          </Label>
          <Input
            id="booking-whatsapp"
            value={whatsapp}
            onChange={(e) =>
              setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            inputMode="tel"
            placeholder="9876543210"
            className="font-mono text-base tracking-widest"
          />
        </div>
      </section>

      <PartyCard
        title="Consignor (sender)"
        value={consignor}
        onChange={setConsignor}
      />
      <PartyCard
        title="Consignee (receiver)"
        value={consignee}
        onChange={setConsignee}
      />

      <section className="grid gap-3 border border-border bg-card p-4">
        <header className="flex items-center justify-between">
          <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            Volume matrix · {rows.length} item{rows.length === 1 ? "" : "s"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            className="font-mono text-ui-10 uppercase tracking-widest"
          >
            <RiAddLine className="size-3.5" />
            Add row
          </Button>
        </header>

        <div className="grid gap-2">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[repeat(5,1fr)_auto] items-end gap-2"
            >
              {(
                [
                  ["length", "L (cm)"],
                  ["width", "W (cm)"],
                  ["height", "H (cm)"],
                  ["weight", "Wt (kg)"],
                  ["count", "Qty"],
                ] as [keyof VolumeRowValue, string][]
              ).map(([k, label]) => (
                <div key={k} className="grid gap-1">
                  {idx === 0 && (
                    <Label className="text-ui-10">{label}</Label>
                  )}
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    value={row[k] ?? ""}
                    onChange={(e) =>
                      patchRow(idx, { [k]: e.target.value })
                    }
                    className="font-mono"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(idx)}
                disabled={rows.length === 1}
                aria-label="Remove row"
                className="size-9 self-end"
              >
                <RiDeleteBinLine className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-2">
        <Label>Photos (optional, up to 5)</Label>
        <FileDropzone
          value={images}
          onChange={setImages}
          accept="image/*"
          maxFiles={5}
          maxSizeBytes={5 * 1024 * 1024}
          label="Drop photos of the cargo here"
          showPreviews
        />
      </section>

      <section className="grid gap-2">
        <Label htmlFor="booking-notes">Notes (optional)</Label>
        <Textarea
          id="booking-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Pickup instructions, time windows, contact preferences…"
        />
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={!valid || submitting} size="lg">
          <RiSendPlaneLine />
          {submitting ? "Submitting…" : "Submit booking"}
        </Button>
      </div>
    </form>
  )
}

function PartyCard({
  title,
  value,
  onChange,
}: {
  title: string
  value: BookingPartyValue
  onChange: (next: BookingPartyValue) => void
}) {
  const update = <K extends keyof BookingPartyValue>(
    key: K,
    next: BookingPartyValue[K]
  ) => onChange({ ...value, [key]: next })

  return (
    <section className="grid gap-3 border border-border bg-card p-4">
      <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <Input
            value={value.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </Field>
        <Field label="Phone">
          <Input
            type="tel"
            value={value.phone}
            onChange={(e) =>
              update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            className="font-mono"
          />
        </Field>
        <Field label="Email (optional)">
          <Input
            type="email"
            value={value.email ?? ""}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Address line 1">
        <Input
          value={value.addressLine1}
          onChange={(e) => update("addressLine1", e.target.value)}
        />
      </Field>
      <Field label="Address line 2">
        <Input
          value={value.addressLine2 ?? ""}
          onChange={(e) => update("addressLine2", e.target.value)}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="City">
          <Input
            value={value.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </Field>
        <Field label="State">
          <Input
            value={value.state}
            onChange={(e) => update("state", e.target.value)}
          />
        </Field>
        <Field label="Pincode">
          <Input
            value={value.zip}
            maxLength={6}
            onChange={(e) =>
              update("zip", e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="font-mono"
          />
        </Field>
      </div>
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-ui-10">{label}</Label>
      {children}
    </div>
  )
}
