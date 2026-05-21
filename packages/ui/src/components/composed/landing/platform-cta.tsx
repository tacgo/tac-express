"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { Button } from "@workspace/ui/components/button"
import { Icon } from "@workspace/ui/icons"
import { platformContent } from "./landing-data"
import { revealUp } from "./motion"

/**
 * §5 — Platform CTA band. A single full-width panel with the corridor message
 * and a primary action. The template's decorative SVG backdrop is replaced
 * with a hazard-stripe accent column (Violet Grid signature) carrying the
 * brutalist offset shadow.
 */
export function PlatformCta() {
  return (
    <section className="py-12 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={revealUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="relative bg-card border border-border border-l-2 border-l-primary shadow-md grid grid-cols-12 items-center gap-6 px-8 py-12 lg:px-14 overflow-hidden"
        >
          <div aria-hidden className="tac-hazard-stripes absolute right-0 top-0 bottom-0 w-24 opacity-20 pointer-events-none" />

          <div className="col-span-12 lg:col-span-8 relative">
            <h2 className="t-h1">{platformContent.heading}</h2>
            <p className="t-body text-muted-foreground mt-4 max-w-xl">{platformContent.text}</p>
          </div>

          <div className="col-span-12 lg:col-span-4 relative flex lg:justify-end">
            <Button
              asChild
              variant="default"
              className="h-12 rounded-none font-mono font-bold text-sm tracking-wordmark uppercase px-8 shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:tac-focus-premium"
            >
              <Link href={platformContent.ctaHref}>
                {platformContent.ctaLabel}
                <Icon name="arrowRight" aria-hidden className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
