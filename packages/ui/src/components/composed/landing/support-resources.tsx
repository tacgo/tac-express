"use client"

import { motion } from "motion/react"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/primitives/card"
import { Icon } from "@workspace/ui/icons"
import { supportContent } from "./landing-data"
import { revealUp, staggerParent, staggerItem } from "./motion"
import { CardDecorator } from "./card-decorator"

/**
 * §8 — Support & resources. Ports the template's centered 3-card grid into
 * Violet Grid: @tac Card + the shared grid-mask decorator, remix icons,
 * semantic tokens (no `bg-zinc-50`, no `shadow-none` soft cards). Content is
 * the existing support trio from landing-data.
 */
export function SupportResources() {
  return (
    <section className="py-16 md:py-32">
      <div className="container mx-auto px-6">
        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="text-center max-w-2xl mx-auto"
        >
          <p className="t-overline text-muted-foreground">
            {supportContent.overlineLead}{" "}
            <span className="text-primary">{supportContent.overlineAccent}</span>
          </p>
          <h2 className="t-h1 mt-3 text-balance">{supportContent.heading}</h2>
        </motion.div>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mx-auto mt-12 grid max-w-sm gap-6 md:mt-16 md:max-w-full md:grid-cols-3"
        >
          {supportContent.cards.map((card) => (
            <motion.div key={card.title} variants={staggerItem}>
              <Card variant="outline" className="group text-center h-full">
                <CardHeader className="pb-3">
                  <CardDecorator>
                    <Icon name={card.icon} aria-hidden className="size-6" />
                  </CardDecorator>
                  <h3 className="t-h4 mt-6">{card.title}</h3>
                </CardHeader>
                <CardContent>
                  <p className="t-body-sm text-muted-foreground">{card.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
