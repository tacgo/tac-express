"use client"

import { motion } from "motion/react"
import { Icon } from "@workspace/ui/icons"
import { controlTowerContent } from "./landing-data"
import { revealLeft, staggerParent, staggerItem } from "./motion"

/**
 * §6 — Control tower. Two-column (portfolio-style) split: a mission-control
 * telemetry panel on the left, the heading + capability list on the right.
 * The template's portfolio screenshot is replaced with a live-readout panel
 * so the visual carries operational data, not stock art.
 */
export function ControlTower() {
  return (
    <section className="py-20 lg:py-28 bg-card border-y border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-12 items-center gap-12">
          {/* Left — telemetry panel */}
          <motion.div
            variants={revealLeft}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="col-span-12 lg:col-span-5"
          >
            <div className="tac-fui-panel border-t-2 border-t-primary p-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="tac-mono-label text-primary">CONTROL TOWER</span>
                <span className="flex items-center gap-2">
                  <span aria-hidden className="size-2 bg-accent-success tac-blink motion-reduce:animate-none" />
                  <span className="tac-mono-label text-accent-success">LIVE</span>
                </span>
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-px bg-border border border-border">
                {controlTowerContent.telemetry.map((readout) => (
                  <div key={readout.label} className="bg-card p-4">
                    <dt className="tac-mono-label">{readout.label}</dt>
                    <dd className="t-mono mt-2 text-foreground">{readout.value}</dd>
                  </div>
                ))}
              </dl>
              <div aria-hidden className="mt-6 h-16 grid grid-cols-12 gap-1 items-end">
                {[40, 65, 30, 80, 55, 70, 45, 90, 60, 75, 50, 85].map((h, i) => (
                  <div key={i} className="bg-primary/30" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right — heading + features */}
          <motion.div
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="col-span-12 lg:col-span-7"
          >
            <motion.p variants={staggerItem} className="t-overline text-muted-foreground">
              {controlTowerContent.overlineLead}{" "}
              <span className="text-primary">{controlTowerContent.overlineAccent}</span>
            </motion.p>
            <motion.h2 variants={staggerItem} className="t-h1 mt-3 max-w-xl">
              {controlTowerContent.heading}
            </motion.h2>
            <motion.p variants={staggerItem} className="t-body text-muted-foreground mt-4 max-w-xl">
              {controlTowerContent.text}
            </motion.p>

            <ul className="mt-8 divide-y divide-border border-y border-border max-w-xl">
              {controlTowerContent.features.map((feature) => (
                <motion.li key={feature.title} variants={staggerItem} className="flex items-center gap-4 py-4">
                  <span className="inline-flex size-9 items-center justify-center border border-border bg-muted text-primary shrink-0">
                    <Icon name={feature.icon} aria-hidden className="size-4" />
                  </span>
                  <span className="t-h4">{feature.title}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
