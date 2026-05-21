"use client"

import { motion } from "motion/react"
import { Icon } from "@workspace/ui/icons"
import { pipelineContent } from "./landing-data"
import { revealUp, staggerParent, staggerItem } from "./motion"

/**
 * §4 — Ops pipeline ("how it works"). A four-step lifecycle laid out as a
 * horizontal rail of square nodes on desktop, stacking on mobile. Replaces
 * the template's absolutely-positioned blur-circle timeline with the Violet
 * Grid square-node + 1px-rail vocabulary.
 */
export function OpsPipeline() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="text-center max-w-2xl mx-auto"
        >
          <p className="t-overline text-muted-foreground">
            {pipelineContent.overlineLead}{" "}
            <span className="text-primary">{pipelineContent.overlineAccent}</span>
          </p>
          <h2 className="t-h1 mt-3">{pipelineContent.heading}</h2>
        </motion.div>

        <motion.ol
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="relative mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0"
        >
          {/* Connecting rail (desktop only) */}
          <div aria-hidden className="hidden lg:block absolute left-0 right-0 top-6 h-px bg-border" />

          {pipelineContent.steps.map((step) => (
            <motion.li
              key={step.step}
              variants={staggerItem}
              className="relative flex flex-col items-center text-center lg:px-6"
            >
              <span className="relative z-10 inline-flex size-12 items-center justify-center border border-border bg-card text-primary shadow-sm">
                <Icon name={step.icon} aria-hidden className="size-5" />
              </span>
              <span className="tac-mono-label mt-5">STEP {step.step}</span>
              <h3 className="t-h3 mt-2">{step.title}</h3>
              <p className="t-body-sm text-muted-foreground mt-2 max-w-56">{step.text}</p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  )
}
