"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"
import { Icon, type IconName } from "@workspace/ui/icons"
import { capabilitiesContent } from "./landing-data"
import { EASE_SMOOTH } from "./motion"

type ItemKey = "item-1" | "item-2" | "item-3" | "item-4"

interface CapabilityGroup {
  key: ItemKey
  icon: IconName
  title: string
  description: string
  /** Mono readout shown in the visual panel when this item is active. */
  readout: { label: string; value: string }[]
}

const groups: CapabilityGroup[] = [
  {
    key: "item-1",
    icon: "scan",
    title: "Real-time GPS telematics",
    description:
      "Every vehicle reports position, speed, and ETA on a 10-second uplink — no dark legs across the corridor.",
    readout: [
      { label: "UPLINK", value: "10s" },
      { label: "SPEED", value: "62 km/h" },
      { label: "LANE", value: "DEL → IMF" },
      { label: "SIGNAL", value: "STABLE" },
    ],
  },
  {
    key: "item-2",
    icon: "shield",
    title: "Chain-of-custody scanning",
    description:
      "Sealed-custody scanning at every hop, with defense-grade protocols for high-value freight.",
    readout: [
      { label: "CUSTODY", value: "SEALED" },
      { label: "SCANS", value: "7 / 7" },
      { label: "HUB", value: "GUWAHATI" },
      { label: "STATUS", value: "VERIFIED" },
    ],
  },
  {
    key: "item-3",
    icon: "money",
    title: "Cash-on-delivery reconciliation",
    description:
      "COD collected at the door and reconciled automatically against your invoices, with settlement reporting.",
    readout: [
      { label: "COLLECTED", value: "₹ 48,200" },
      { label: "RECONCILED", value: "100%" },
      { label: "INVOICES", value: "32" },
      { label: "SETTLED", value: "T+1" },
    ],
  },
  {
    key: "item-4",
    icon: "terminal",
    title: "API & webhook integration",
    description:
      "Tracking, rate quotes, and label generation — integrated through one API in a single working day.",
    readout: [
      { label: "ENDPOINT", value: "/v1/track" },
      { label: "WEBHOOKS", value: "ON" },
      { label: "LATENCY", value: "120 ms" },
      { label: "UPTIME", value: "99.9%" },
    ],
  },
]

/**
 * §7 — Capabilities. Ports the template's accordion-drives-a-visual layout
 * onto the @tac Accordion primitive: selecting an item swaps a mission-control
 * readout panel (no external images, no BorderBeam — a tokenized panel and
 * motion/react crossfade instead). Content from capabilitiesContent.
 */
export function Capabilities() {
  const [active, setActive] = React.useState<ItemKey>("item-1")
  const current = groups.find((g) => g.key === active) ?? groups[0]!

  return (
    <section className="py-16 md:py-28">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="t-overline text-muted-foreground">
            {capabilitiesContent.overlineLead}{" "}
            <span className="text-primary">{capabilitiesContent.overlineAccent}</span>
          </p>
          <h2 className="t-h1 mt-3 text-balance">{capabilitiesContent.heading}</h2>
          <p className="t-body text-muted-foreground mt-4">{capabilitiesContent.text}</p>
        </div>

        <div className="mt-12 grid gap-12 md:mt-16 md:grid-cols-2 md:gap-12 lg:gap-20">
          <Accordion
            type="single"
            value={active}
            onValueChange={(v) => v && setActive(v as ItemKey)}
            className="w-full"
          >
            {groups.map((g) => (
              <AccordionItem key={g.key} value={g.key}>
                <AccordionTrigger className="t-h4 py-4">
                  <span className="flex items-center gap-2.5">
                    <Icon name={g.icon} aria-hidden className="size-4 text-primary" />
                    {g.title}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="t-body-sm text-muted-foreground pb-4">
                  {g.description}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Visual panel — swaps with the active accordion item */}
          <div className="tac-fui-panel border-t-2 border-t-primary relative overflow-hidden p-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="tac-mono-label text-primary">{current.title}</span>
              <span aria-hidden className="size-2 bg-accent-success tac-blink motion-reduce:animate-none" />
            </div>
            <AnimatePresence mode="wait">
              <motion.dl
                key={current.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: EASE_SMOOTH }}
                className="mt-6 grid grid-cols-2 gap-px bg-border border border-border"
              >
                {current.readout.map((r) => (
                  <div key={r.label} className="bg-card p-4">
                    <dt className="tac-mono-label">{r.label}</dt>
                    <dd className="t-mono mt-2 text-foreground">{r.value}</dd>
                  </div>
                ))}
              </motion.dl>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
