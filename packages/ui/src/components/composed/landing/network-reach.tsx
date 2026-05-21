"use client"

import { motion } from "motion/react"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/primitives/card"
import { Icon, type IconName } from "@workspace/ui/icons"
import { reachContent } from "./landing-data"
import { revealUp, staggerParent, staggerItem } from "./motion"
import { CardDecorator } from "./card-decorator"

interface ReachCard {
  icon: IconName
  stat: string
  title: string
  text: string
}

// Derived from reachContent (the 4 figures) into the template's 3-card layout.
const cards: ReachCard[] = [
  {
    icon: "hub",
    stat: `${reachContent.stats[0]!.value} hubs · ${reachContent.stats[1]!.value} states`,
    title: "Corridor coverage",
    text: "Operating hubs across every North-East state, plus the New Delhi feeder corridor.",
  },
  {
    icon: "truck",
    stat: `${reachContent.stats[2]!.value} active lanes`,
    title: "Lane density",
    text: "Live hub-to-hub lanes, instrumented end to end on a 10-second telematics uplink.",
  },
  {
    icon: "checkCircle",
    stat: `${reachContent.stats[3]!.value}% on-time`,
    title: "Reliability",
    text: "Predictive routing holds the corridor on schedule, lane by lane, hop by hop.",
  },
]

/**
 * §3 — Network reach. Ports the template's centered heading + 3 decorator
 * cards into Violet Grid: @tac Card (outline), the shared grid-mask
 * CardDecorator, remix icons, and semantic tokens. Content reshaped from the
 * corridor figures in landing-data.
 */
export function NetworkReach() {
  return (
    <section className="py-16 md:py-28 bg-card border-y border-border">
      <div className="container mx-auto px-6">
        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="t-h1 text-balance">{reachContent.heading}</h2>
          <p className="t-body text-muted-foreground mt-4">
            Twelve hubs, eight states, forty-seven lanes — one instrumented network.
          </p>
        </motion.div>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mx-auto mt-12 grid max-w-sm gap-6 md:mt-16 md:max-w-full md:grid-cols-3"
        >
          {cards.map((card) => (
            <motion.div key={card.title} variants={staggerItem}>
              <Card variant="outline" className="group text-center h-full">
                <CardHeader className="pb-3">
                  <CardDecorator>
                    <Icon name={card.icon} aria-hidden className="size-6" />
                  </CardDecorator>
                  <span className="t-data-sm mt-6 tabular-nums">{card.stat}</span>
                  <h3 className="t-h4 mt-2">{card.title}</h3>
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
