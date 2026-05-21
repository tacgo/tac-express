"use client"

import { motion } from "motion/react"
import { Card, CardContent } from "@workspace/ui/components/primitives/card"
import { Icon } from "@workspace/ui/icons"
import { pipelineContent } from "./landing-data"
import { revealUp, staggerParent, staggerItem } from "./motion"

/**
 * §4 — Ops pipeline ("how it works"). Ports the template's bento into Violet
 * Grid: @tac Card cells with token-only surfaces and straight-line
 * decorations (the template's curved hero SVGs are replaced — LAW 13). The
 * four-step lifecycle is preserved as the wide square-node rail card.
 */
export function OpsPipeline() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-card border-y border-border py-16 md:py-32">
      <div className="container mx-auto max-w-5xl px-6">
        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="t-overline text-muted-foreground">
            {pipelineContent.overlineLead}{" "}
            <span className="text-primary">{pipelineContent.overlineAccent}</span>
          </p>
          <h2 className="t-h1 mt-3 text-balance">{pipelineContent.heading}</h2>
        </motion.div>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="relative z-10 mt-12 grid grid-cols-6 gap-3 md:mt-16"
        >
          {/* 100% custody */}
          <motion.div variants={staggerItem} className="col-span-full lg:col-span-2">
            <Card variant="outline" className="h-full">
              <CardContent className="flex h-full flex-col items-center justify-center gap-2 pt-6 text-center">
                <span className="t-display tabular-nums">100%</span>
                <span className="tac-mono-label">Chain of custody</span>
              </CardContent>
            </Card>
          </motion.div>

          {/* On-time */}
          <motion.div variants={staggerItem} className="col-span-full sm:col-span-3 lg:col-span-2">
            <Card variant="outline" className="h-full">
              <CardContent className="flex h-full flex-col justify-center gap-3 pt-6 text-center">
                <span className="t-data tabular-nums t-gradient-primary">98.7%</span>
                <span className="tac-mono-label">On-time delivery</span>
                <svg aria-hidden viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-1 h-10 w-full">
                  {[40, 55, 35, 70, 50, 65, 45, 80, 60, 75].map((h, i) => (
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
              </CardContent>
            </Card>
          </motion.div>

          {/* Proof at every hop */}
          <motion.div variants={staggerItem} className="col-span-full sm:col-span-3 lg:col-span-2">
            <Card variant="outline" className="h-full">
              <CardContent className="flex h-full flex-col justify-center gap-3 pt-6">
                <span className="tac-mono-label">Proof at every hop</span>
                <ul className="space-y-2">
                  {["Barcode scan on pickup", "Custody scan per hub", "e-POD on delivery"].map((t) => (
                    <li key={t} className="flex items-center gap-2 t-body-sm">
                      <Icon name="checkCircle" aria-hidden className="size-4 text-primary shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Wide: 4-step lifecycle rail */}
          <motion.div variants={staggerItem} className="col-span-full">
            <Card variant="outline">
              <CardContent className="pt-6">
                <ol className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
                  <div aria-hidden className="hidden lg:block absolute left-0 right-0 top-5 h-px bg-border" />
                  {pipelineContent.steps.map((step) => (
                    <li key={step.step} className="relative flex flex-col items-center text-center lg:px-4">
                      <span className="relative z-10 inline-flex size-10 items-center justify-center border border-border bg-card text-primary">
                        <Icon name={step.icon} aria-hidden className="size-5" />
                      </span>
                      <span className="tac-mono-label mt-4">STEP {step.step}</span>
                      <h3 className="t-h4 mt-1">{step.title}</h3>
                      <p className="t-body-sm text-muted-foreground mt-1 max-w-56">{step.text}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
