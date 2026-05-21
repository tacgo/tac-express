"use client"

import * as React from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Textarea } from "@workspace/ui/components/primitives/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { RiSendPlaneLine } from "@workspace/ui/icons"

// PL-2b — real POST to /api/contact replaces the previous fake setSubmitted
// stub. The form captures the lead durably via the contact_leads table
// before attempting a WhatsApp notification (service-layer contract in
// packages/services/src/contact-lead.service.ts).

const REASONS = [
  { value: "sales", label: "Sales — pricing & onboarding" },
  { value: "support", label: "Support — existing shipment" },
  { value: "partner", label: "Partner program" },
  { value: "press", label: "Press / media" },
  { value: "other", label: "Other" },
] as const

type FormStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string }

export function ContactForm() {
  const [status, setStatus] = React.useState<FormStatus>({ kind: "idle" })
  const [reason, setReason] = React.useState<string>(REASONS[0].value)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status.kind === "submitting") return

    const form = e.currentTarget
    const formData = new FormData(form)
    // Hidden honeypot field — bots fill it; humans don't see it.
    const honeypot = ((formData.get("website") as string | null) ?? "").trim()
    const payload = {
      name: ((formData.get("name") as string | null) ?? "").trim(),
      email: ((formData.get("email") as string | null) ?? "").trim(),
      company:
        ((formData.get("company") as string | null) ?? "").trim() || undefined,
      reason,
      message: ((formData.get("message") as string | null) ?? "").trim(),
      website: honeypot,
    }

    setStatus({ kind: "submitting" })

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
      }

      if (res.ok && data.ok !== false) {
        // The API returns { ok: true } on legitimate success AND when the
        // honeypot fires (silent reject). The visitor UX is identical;
        // bots can't probe their way around.
        setStatus({ kind: "success" })
        return
      }

      const fallback =
        res.status === 429
          ? "Too many submissions. Please try again in a few minutes."
          : "Something went wrong. Please try again."
      setStatus({ kind: "error", message: data.error ?? fallback })
    } catch (err) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error && err.message
            ? `Network error: ${err.message}`
            : "Network error. Please check your connection and try again.",
      })
    }
  }

  if (status.kind === "success") {
    return (
      <div className="tac-fui-panel border-l-4 border-l-accent-success p-8 text-center">
        <p className="tac-mono-label text-accent-success">Sent</p>
        <h2 className="mt-2 text-2xl font-bold">Thanks — we&apos;ll get back to you.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sales replies within 4 hours during India business hours. Support replies within 1 hour.
        </p>
      </div>
    )
  }

  const submitting = status.kind === "submitting"

  return (
    <form className="tac-fui-panel relative space-y-4 p-6" onSubmit={onSubmit} noValidate>
      <p className="border-b border-border pb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Send us a note
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Your name" required>
          <Input name="name" required disabled={submitting} />
        </Field>
        <Field label="Work email" required>
          <Input name="email" type="email" required disabled={submitting} />
        </Field>
        <Field label="Company">
          <Input name="company" disabled={submitting} />
        </Field>
        <Field label="Reason">
          <Select name="reason" value={reason} onValueChange={setReason} disabled={submitting}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Message" required>
        <Textarea name="message" rows={5} required disabled={submitting} />
      </Field>

      {/* Honeypot — visible to bots in the HTML, hidden from humans +
          screen-readers via Tailwind's sr-only utility (clip-path off-
          screen positioning without arbitrary pixel values). Bots that
          auto-fill every text input populate this; legitimate submissions
          leave it empty. The server returns 200 silently on a hit (no
          lead row written, no signal to the bot). */}
      <div aria-hidden className="sr-only">
        <label htmlFor="website">
          Website (leave blank)
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </label>
      </div>

      {status.kind === "error" && (
        <p
          role="alert"
          className="font-mono text-xs uppercase tracking-wider text-accent-danger"
        >
          {status.message}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          <RiSendPlaneLine className="mr-2 size-4" aria-hidden="true" />
          {submitting ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="block font-mono text-2xs uppercase tracking-wider text-muted-foreground">
        {label}{required && <span aria-hidden className="ml-0.5 text-accent-danger">*</span>}
      </span>
      {children}
    </label>
  )
}
