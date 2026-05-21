"use client"

import { motion } from "motion/react"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@workspace/ui/components/accordion"
import { faqContent } from "./landing-data"
import { revealUp } from "./motion"

/**
 * §9 — FAQ.
 *
 * Built on the shadcn-sourced <Accordion> primitive (Radix, re-themed to
 * Violet Grid) per the tac-shadcn sourcing law — no hand-rolled disclosure
 * widget. Single-open, first item expanded by default. The trigger/content
 * are sized up to the marketing rhythm via className overrides; the chevron,
 * ARIA wiring, and height animation come from the primitive.
 */
export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="text-center"
        >
          <p className="tac-mono-label text-primary">{faqContent.overline}</p>
          <h2 className="t-h1 mt-3">{faqContent.heading}</h2>
          <p className="t-body text-muted-foreground mt-3">{faqContent.subheading}</p>
        </motion.div>

        <Accordion
          type="single"
          collapsible
          defaultValue="faq-0"
          className="mt-12 border-t border-b border-border"
        >
          {faqContent.items.map((item, index) => (
            <AccordionItem key={item.question} value={`faq-${index}`}>
              <AccordionTrigger className="t-h4 py-5">{item.question}</AccordionTrigger>
              <AccordionContent className="t-body-sm text-muted-foreground pb-5 max-w-2xl">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
