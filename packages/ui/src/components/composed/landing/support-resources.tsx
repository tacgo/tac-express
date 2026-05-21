"use client"

import { motion } from "motion/react"
import { Icon } from "@workspace/ui/icons"
import { supportContent } from "./landing-data"
import { revealUp, staggerParent, staggerItem } from "./motion"

/**
 * §8 — Support & resources. Three-card grid. The template's translucent /
 * backdrop-blur "perks" cards become solid brutalist panels with a top-accent
 * marker and a hover lift, per the Violet Grid signal-panel pattern.
 */
export function SupportResources() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
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
          <h2 className="t-h1 mt-3">{supportContent.heading}</h2>
        </motion.div>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {supportContent.cards.map((card) => (
            <motion.article
              key={card.title}
              variants={staggerItem}
              className="tac-fui-panel border-t-2 border-t-primary p-6 flex flex-col gap-4 transition-transform duration-fast ease-linear hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              <span className="inline-flex size-12 items-center justify-center border border-border bg-muted text-primary">
                <Icon name={card.icon} aria-hidden className="size-6" />
              </span>
              <h3 className="t-h3">{card.title}</h3>
              <p className="t-body-sm text-muted-foreground">{card.text}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
