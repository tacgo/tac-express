"use client"

import { motion } from "motion/react"
import { Icon } from "@workspace/ui/icons"
import { faqContent } from "./landing-data"
import { revealUp, staggerParent, staggerItem } from "./motion"

/**
 * §9 — FAQ. Ports the template's centered heading + divided 6-cell grid into
 * Violet Grid. The Q&A content is preserved (question = heading, answer =
 * body) so nothing is lost moving off the accordion; surfaces use the
 * paper-line divider rhythm and semantic tokens.
 */
export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-12 md:py-20">
      <div className="container mx-auto max-w-5xl space-y-8 px-6 md:space-y-16">
        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="relative z-10 mx-auto max-w-xl space-y-4 text-center"
        >
          <p className="tac-mono-label text-primary">{faqContent.overline}</p>
          <h2 className="t-h1 text-balance">{faqContent.heading}</h2>
          <p className="t-body text-muted-foreground">{faqContent.subheading}</p>
        </motion.div>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="relative mx-auto grid max-w-4xl divide-x divide-y divide-border border border-border sm:grid-cols-2 lg:grid-cols-3"
        >
          {faqContent.items.map((item) => (
            <motion.div key={item.question} variants={staggerItem} className="space-y-3 p-8">
              <div className="flex items-center gap-2">
                <Icon name="info" aria-hidden className="size-4 text-primary" />
                <h3 className="t-h4">{item.question}</h3>
              </div>
              <p className="t-body-sm text-muted-foreground">{item.answer}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
