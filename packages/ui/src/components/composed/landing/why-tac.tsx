"use client"

import { motion } from "motion/react"
import { Icon } from "@workspace/ui/icons"
import { whyContent } from "./landing-data"
import { revealRight, staggerParent, staggerItem } from "./motion"

/**
 * §2 — "Why TAC Express". Two-column split (7/5): a heading + staggered
 * feature trio on the left, an instrument panel on the right. Replaces the
 * template's product image with a mission-control corridor readout so the
 * column carries information rather than stock art.
 */
export function WhyTac() {
  return (
    <section id="features" className="scroll-mt-20 py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-12 items-center gap-10">
          {/* Left — heading + feature trio */}
          <motion.div
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="col-span-12 lg:col-span-7"
          >
            <motion.p variants={staggerItem} className="t-overline text-muted-foreground">
              {whyContent.overlineLead} <span className="text-primary">{whyContent.overlineAccent}</span>
            </motion.p>
            <motion.h2 variants={staggerItem} className="t-h1 mt-3 max-w-xl">
              {whyContent.heading}
            </motion.h2>

            <div className="mt-10 grid sm:grid-cols-2 gap-6">
              {whyContent.features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={staggerItem}
                  className="tac-fui-panel border-t-2 border-t-primary p-5 flex flex-col gap-3 transition-transform duration-fast ease-linear hover:-translate-x-0.5 hover:-translate-y-0.5"
                >
                  <span className="inline-flex size-10 items-center justify-center border border-border bg-muted text-primary">
                    <Icon name={feature.icon} aria-hidden className="size-5" />
                  </span>
                  <h3 className="t-h4">{feature.title}</h3>
                  <p className="t-body-sm text-muted-foreground">{feature.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right — instrument panel */}
          <motion.div
            variants={revealRight}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="col-span-12 lg:col-span-5"
          >
            <div className="tac-fui-panel p-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="tac-mono-label">CORRIDOR · LIVE</span>
                <span aria-hidden className="size-2 bg-accent-success tac-blink motion-reduce:animate-none" />
              </div>
              <ol className="relative mt-6 pl-8">
                <div aria-hidden className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                {[
                  { label: "Pickup · Imphal", tone: "success", time: "06:14" },
                  { label: "Hub scan · Guwahati", tone: "success", time: "11:02" },
                  { label: "In transit · NH-27", tone: "warning", time: "14:48" },
                  { label: "Out for delivery · Delhi", tone: "neutral", time: "ETA 04:12" },
                ].map((event) => (
                  <li key={event.label} className="relative pb-6 last:pb-0">
                    <div
                      aria-hidden
                      className={
                        "absolute -left-7 top-1 size-3 border " +
                        (event.tone === "success"
                          ? "bg-accent-success border-accent-success"
                          : event.tone === "warning"
                            ? "bg-accent-warning border-accent-warning"
                            : "bg-card border-border")
                      }
                    />
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="t-body-sm">{event.label}</span>
                      <span className="t-mono-sm tabular-nums text-muted-foreground">{event.time}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
