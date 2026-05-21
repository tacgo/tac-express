"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Icon } from "@workspace/ui/icons"
import { cn } from "@workspace/ui/lib/utils"
import { faqContent } from "./landing-data"
import { EASE_SMOOTH, revealUp } from "./motion"

/**
 * §9 — FAQ accordion.
 *
 * A self-contained single-open disclosure list. Built directly on a native
 * <button> + region with full ARIA wiring (aria-expanded / aria-controls /
 * role=region + aria-labelledby) rather than pulling in a new Radix
 * dependency for one marketing surface. The plus-marker rotates to a cross on
 * open; the panel height animation is motion-reduce safe.
 */
export function Faq() {
  const [open, setOpen] = React.useState<number | null>(0)

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

        <div className="mt-12 divide-y divide-border border-y border-border">
          {faqContent.items.map((item, index) => {
            const isOpen = open === index
            const triggerId = `faq-trigger-${index}`
            const panelId = `faq-panel-${index}`
            return (
              <div key={item.question}>
                <h3>
                  <button
                    id={triggerId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left transition-colors duration-fast ease-linear hover:text-primary focus-visible:outline-none focus-visible:tac-focus-premium"
                  >
                    <span className="t-h4">{item.question}</span>
                    <Icon
                      name="add"
                      aria-hidden
                      className={cn(
                        "size-5 shrink-0 text-primary transition-transform duration-base ease-[var(--ease-smooth)] motion-reduce:transition-none",
                        isOpen && "rotate-45",
                      )}
                    />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={triggerId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE_SMOOTH }}
                      className="overflow-hidden"
                    >
                      <p className="t-body-sm text-muted-foreground pb-5 max-w-2xl">{item.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
