"use client"

import { motion } from "motion/react"
import { Icon } from "@workspace/ui/icons"
import { capabilitiesContent } from "./landing-data"
import { staggerParent, staggerItem } from "./motion"

/**
 * §7 — Capabilities checklist. Two-column split: heading + intro on the left,
 * an eight-item checklist on the right. Replaces the template's la:check
 * iconify glyphs with the remix check and the brutalist marker square.
 */
export function Capabilities() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-12 gap-12 items-start">
          <motion.div
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="col-span-12 lg:col-span-5"
          >
            <motion.p variants={staggerItem} className="t-overline text-muted-foreground">
              {capabilitiesContent.overlineLead}{" "}
              <span className="text-primary">{capabilitiesContent.overlineAccent}</span>
            </motion.p>
            <motion.h2 variants={staggerItem} className="t-h1 mt-3">
              {capabilitiesContent.heading}
            </motion.h2>
            <motion.p variants={staggerItem} className="t-body text-muted-foreground mt-4 max-w-md">
              {capabilitiesContent.text}
            </motion.p>
          </motion.div>

          <motion.ul
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="col-span-12 lg:col-span-7 grid sm:grid-cols-2 gap-px bg-border border border-border"
          >
            {capabilitiesContent.items.map((item) => (
              <motion.li
                key={item}
                variants={staggerItem}
                className="bg-card flex items-center gap-3 px-5 py-5 transition-colors duration-fast ease-linear hover:bg-muted"
              >
                <Icon name="checkCircle" aria-hidden className="size-5 text-primary shrink-0" />
                <span className="t-body-sm">{item}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>
    </section>
  )
}
