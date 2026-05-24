"use client"

import * as React from "react"
import { Plus_Jakarta_Sans, Inter, IBM_Plex_Sans } from "next/font/google"

import { cn } from "@workspace/ui/lib/utils"

import "../v8.css"

/**
 * V8 INVOICE WORKFLOW SPIKE — isolated comparison route (/v8-preview/invoice,
 * no auth, scoped under `.dashboard-v8`). A multi-step invoice creation flow in
 * the editorial v8 design language: centered ≤1050px form, rounded-28 surface
 * cards, semantic field widths (220/320/420/520), pill stepper, soft shadows.
 * Mock/static — a design comparison aid only. Does NOT touch production v7.
 */

const head = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-v8-head" })
const body = Inter({ subsets: ["latin"], variable: "--font-v8-body" })
const metric = IBM_Plex_Sans({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-v8-metric" })

type Field = {
  label: string
  span?: number
  w?: "sm" | "md" | "lg"
  num?: boolean
  type?: "text" | "date" | "select" | "textarea"
  opts?: string[]
  ph?: string
}

const SECTIONS: { id: string; title: string; desc: string; fields: Field[] }[] = [
  {
    id: "basics",
    title: "Invoice Basics",
    desc: "Booking reference and payment terms.",
    fields: [
      { label: "AWB Number", span: 6, w: "md", num: true, ph: "TAC1000482" },
      { label: "Booking Date", span: 6, w: "sm", type: "date" },
      { label: "Payment Mode", span: 6, w: "md", type: "select", opts: ["To Pay", "Paid", "To be billed"] },
      { label: "Declared Value", span: 6, w: "sm", num: true, ph: "₹ 0" },
      { label: "Nature of Quantity", span: 12, w: "lg", ph: "Electronics, documents…" },
    ],
  },
  {
    id: "parties",
    title: "Parties",
    desc: "Sender, receiver and billing identity.",
    fields: [
      { label: "Sender", span: 6, w: "lg", ph: "Full name" },
      { label: "Receiver", span: 6, w: "lg", ph: "Full name" },
      { label: "Contact", span: 6, w: "md", num: true, ph: "98765 43210" },
      { label: "Branch", span: 6, w: "md", type: "select", opts: ["Imphal", "Delhi", "Guwahati"] },
      { label: "GSTIN", span: 6, w: "md", num: true, ph: "15-char GST" },
    ],
  },
  {
    id: "cargo",
    title: "Cargo Details",
    desc: "Dimensions, weight and rating basis.",
    fields: [
      { label: "Cargo Type", span: 6, w: "md", type: "select", opts: ["General", "Fragile", "Perishable", "Hazardous"] },
      { label: "Rate Type", span: 6, w: "md", type: "select", opts: ["Per kg", "Flat", "Volumetric"] },
      { label: "Weight (kg)", span: 4, w: "sm", num: true, ph: "1.50" },
      { label: "Pieces", span: 4, w: "sm", num: true, ph: "1" },
      { label: "Volume (cm³)", span: 4, w: "sm", num: true, ph: "30×20×15" },
    ],
  },
  {
    id: "charges",
    title: "Charges",
    desc: "Freight, surcharges and tax.",
    fields: [
      { label: "Freight", span: 6, w: "sm", num: true, ph: "₹ 0" },
      { label: "Handling", span: 6, w: "sm", num: true, ph: "₹ 0" },
      { label: "Fuel Surcharge", span: 6, w: "sm", num: true, ph: "₹ 0" },
      { label: "Tax (GST)", span: 6, w: "sm", num: true, ph: "18%" },
    ],
  },
  {
    id: "notes",
    title: "Notes",
    desc: "Internal context and invoice remarks.",
    fields: [
      { label: "Internal Notes", span: 12, type: "textarea", ph: "Visible to ops only…" },
      { label: "Invoice Remarks", span: 12, type: "textarea", ph: "Printed on the invoice…" },
    ],
  },
]

function FieldControl({ f }: { f: Field }) {
  const widthClass = f.w ? `v8-w-${f.w}` : ""
  if (f.type === "textarea") {
    return <textarea className="v8-input v8-textarea" placeholder={f.ph} />
  }
  if (f.type === "select") {
    return (
      <select className={cn("v8-input", widthClass)} defaultValue="">
        <option value="" disabled>Select…</option>
        {f.opts?.map((o) => <option key={o}>{o}</option>)}
      </select>
    )
  }
  return (
    <input
      type={f.type === "date" ? "date" : "text"}
      className={cn("v8-input", widthClass, f.num && "is-num")}
      placeholder={f.ph}
    />
  )
}

export default function V8InvoicePage() {
  const [step, setStep] = React.useState(0)
  const active = SECTIONS[step]!
  const isLast = step === SECTIONS.length - 1

  return (
    <div className={cn(head.variable, body.variable, metric.variable, "dashboard-v8")}>
      <div className="v8-page">
        {/* Header */}
        <div className="py-6">
          <div className="v8-caption mb-1.5">Finance · Invoices · Create</div>
          <h1 className="v8-display">New Invoice</h1>
          <p className="v8-caption mt-2" style={{ maxWidth: 560 }}>
            Build an invoice step by step — booking basics, parties, cargo, charges, then review.
          </p>
        </div>

        {/* Stepper */}
        <div className="v8-stepper mb-8">
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="v8-step"
              data-state={i === step ? "active" : i < step ? "done" : "inactive"}
              onClick={() => setStep(i)}
            >
              <span className="v8-step-num">{i < step ? "✓" : i + 1}</span>
              {s.title.replace("Invoice ", "")}
            </button>
          ))}
        </div>

        {/* Active section */}
        <div className="v8-form">
          <section className="v8-card">
            <h2 className="v8-h2">{active.title}</h2>
            <p className="v8-caption mt-0.5 mb-6">{active.desc}</p>
            <div className="v8-fieldgrid">
              {active.fields.map((f) => (
                <div key={f.label} className="v8-field" style={{ gridColumn: `span ${f.span ?? 6}` }}>
                  <label className="v8-label">{f.label}</label>
                  <FieldControl f={f} />
                </div>
              ))}
            </div>

            {active.id === "charges" && (
              <div className="v8-total mt-7">
                <span className="v8-caption">Total payable</span>
                <span className="v8-metric" style={{ fontSize: "1.5rem" }}>₹48,320</span>
              </div>
            )}
          </section>

          {/* Footer actions */}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              className="v8-btn v8-btn-ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              style={{ opacity: step === 0 ? 0.4 : 1 }}
            >
              ← Back
            </button>
            <div className="flex items-center gap-3">
              <button type="button" className="v8-btn v8-btn-secondary">Save draft</button>
              {isLast ? (
                <button type="button" className="v8-btn v8-btn-primary">Create invoice</button>
              ) : (
                <button type="button" className="v8-btn v8-btn-primary" onClick={() => setStep((s) => Math.min(SECTIONS.length - 1, s + 1))}>
                  Continue →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
