"use client"

import { motion } from "motion/react"
import { Icon } from "@workspace/ui/icons"
import { controlTowerContent } from "./landing-data"
import { revealLeft, revealRight } from "./motion"

/**
 * §6 — Control tower. Ports the template's 2/3 split (feature list + framed
 * visual) into Violet Grid: the framed image becomes a tokenized telemetry
 * panel (no external asset), feature icons are remix, surfaces are tokens at
 * zero radius. Content from controlTowerContent.
 */
export function ControlTower() {
  return (
    <section className="py-16 md:py-32">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-12 lg:grid-cols-5 lg:gap-24">
          <motion.div
            variants={revealLeft}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="lg:col-span-2"
          >
            <div className="md:pr-6 lg:pr-0">
              <p className="t-overline text-muted-foreground">
                {controlTowerContent.overlineLead}{" "}
                <span className="text-primary">{controlTowerContent.overlineAccent}</span>
              </p>
              <h2 className="t-h1 mt-3 text-balance">{controlTowerContent.heading}</h2>
              <p className="t-body text-muted-foreground mt-4">{controlTowerContent.text}</p>
            </div>
            <ul className="mt-8 divide-y divide-border border-y border-border">
              {controlTowerContent.features.map((f) => (
                <li key={f.title} className="flex items-center gap-3 py-3">
                  <Icon name={f.icon} aria-hidden className="size-5 text-primary shrink-0" />
                  <span className="t-body-sm">{f.title}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            variants={revealRight}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="lg:col-span-3"
          >
            <div className="tac-fui-panel border-t-2 border-t-primary p-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="tac-mono-label text-primary">CONTROL TOWER · LIVE</span>
                <span aria-hidden className="size-2 bg-accent-success tac-blink motion-reduce:animate-none" />
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-px bg-border border border-border sm:grid-cols-4">
                {controlTowerContent.telemetry.map((r) => (
                  <div key={r.label} className="bg-card p-4">
                    <dt className="tac-mono-label">{r.label}</dt>
                    <dd className="t-mono mt-2 text-foreground">{r.value}</dd>
                  </div>
                ))}
              </dl>
              <svg aria-hidden viewBox="0 0 120 40" preserveAspectRatio="none" className="mt-6 h-20 w-full">
                {[42, 60, 35, 78, 52, 70, 46, 88, 58, 74, 50, 84].map((h, i) => (
                  <rect
                    key={i}
                    x={i * 10 + 1}
                    y={40 - (h / 100) * 40}
                    width={8}
                    height={(h / 100) * 40}
                    className="fill-chart-primary"
                    opacity={0.4}
                  />
                ))}
              </svg>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
