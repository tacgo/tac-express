"use client"

import Link from "next/link"
import Image from "next/image"
import { motion, useReducedMotion } from "motion/react"
import { Button } from "@workspace/ui/components/button"
import { Icon } from "@workspace/ui/icons"
import { heroContent, partnerStripContent, type PartnerSector } from "./landing-data"
import { EASE_SMOOTH } from "./motion"

/**
 * <SectorMarquee> — social-proof strip.
 *
 * Replaces the source template's brand-logo InfiniteSlider (which relied on
 * third-party trademarks + a backdrop-blur ProgressiveBlur, both off-limits
 * here) with a seamless marquee of the sectors TAC Express serves, rendered
 * as mono chips. The track is duplicated so an x: 0 → -50% loop is seamless;
 * `prefers-reduced-motion` renders it static. Edge gradients fade into the
 * page background (no glass).
 */
function SectorMarquee({ sectors }: { sectors: readonly PartnerSector[] }) {
  const reduced = useReducedMotion()
  const track = [...sectors, ...sectors]

  return (
    <div className="relative overflow-hidden">
      <motion.ul
        className="flex w-max items-center gap-16"
        animate={reduced ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 32, ease: "linear", repeat: Infinity }}
      >
        {track.map((sector, i) => (
          <li key={`${sector.name}-${i}`} className="flex items-center gap-2.5 shrink-0">
            <Icon name={sector.icon} aria-hidden className="size-5 text-primary" />
            <span className="font-mono text-sm uppercase tracking-wordmark text-muted-foreground whitespace-nowrap">
              {sector.name}
            </span>
          </li>
        ))}
      </motion.ul>

      <div aria-hidden className="bg-gradient-to-r from-background pointer-events-none absolute inset-y-0 left-0 w-20" />
      <div aria-hidden className="bg-gradient-to-l from-background pointer-events-none absolute inset-y-0 right-0 w-20" />
    </div>
  )
}

/**
 * <CorridorHero> — landing hero.
 *
 * Two-column structure ported from the source template: message + CTAs on the
 * left, a full-bleed corridor photograph on the right (grayscale, with a
 * gradient seam that fades the image into the page so the headline stays
 * readable). A served-sector marquee sits beneath as social proof. Rendered
 * entirely in Violet Grid tokens — sharp corners, brutalist offset on the
 * primary CTA, mono labels, no glass. The page nav/footer come from
 * apps/web/app/(public)/layout.tsx; this section adds no header of its own.
 */
export function CorridorHero() {
  return (
    <>
      <section id="tracking" className="relative bg-background overflow-x-hidden scroll-mt-20">
        <div className="pb-24 pt-32 md:pb-32 lg:pb-44 lg:pt-44">
          <div className="relative mx-auto flex max-w-6xl flex-col px-6 lg:block">
            {/* Left — message */}
            <div className="mx-auto max-w-lg text-center lg:ml-0 lg:w-1/2 lg:text-left">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: EASE_SMOOTH }}
                className="tac-mono-label text-primary"
              >
                {heroContent.eyebrow}
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: EASE_SMOOTH }}
                className="t-display t-gradient-hero dark:text-glow-primary mt-6 max-w-2xl text-balance leading-[1.05]"
              >
                {heroContent.title}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35, ease: EASE_SMOOTH }}
                className="t-body text-muted-foreground mt-8 max-w-xl text-pretty"
              >
                {heroContent.subtitle}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5, ease: EASE_SMOOTH }}
                className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
              >
                <Button
                  asChild
                  size="lg"
                  className="rounded-none font-mono font-bold text-xs tracking-wordmark uppercase px-8 shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:tac-focus-premium"
                >
                  <Link href={heroContent.primaryCta.href}>
                    <Icon name="calculator" aria-hidden className="mr-2 w-4 h-4" />
                    {heroContent.primaryCta.label}
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="rounded-none font-mono font-bold text-xs tracking-wordmark uppercase px-8 focus-visible:outline-none focus-visible:tac-focus-premium"
                >
                  <Link href={heroContent.secondaryCta.href}>
                    <Icon name="scan" aria-hidden className="mr-2 w-4 h-4" />
                    {heroContent.secondaryCta.label}
                  </Link>
                </Button>
              </motion.div>
            </div>

            {/* Right — corridor photograph */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: EASE_SMOOTH }}
              className="relative mt-4 h-72 w-full border border-border max-lg:order-first max-lg:mb-10 sm:h-96 lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:h-full lg:w-1/2 lg:border-0 lg:border-l"
            >
              {/* Seam — fades the image into the page on the headline side */}
              <div
                aria-hidden
                className="absolute inset-0 z-10 bg-gradient-to-r from-background via-background/40 to-transparent lg:via-background/20"
              />
              <div aria-hidden className="absolute inset-0 z-10 bg-primary/10 mix-blend-overlay" />
              <Image
                src={heroContent.image.src}
                alt={heroContent.image.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center grayscale"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Served-sector marquee — social proof */}
      <section className="bg-background border-y border-border pb-16 pt-4 md:pb-24">
        <div className="relative m-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-6 md:flex-row">
            <div className="shrink-0 md:w-44 md:self-center md:border-r md:border-border md:pr-6">
              <p className="t-body-sm text-muted-foreground text-balance text-center md:text-end">
                {partnerStripContent.label}
              </p>
            </div>
            <div className="relative w-full min-w-0 py-6 md:flex-1">
              <SectorMarquee sectors={partnerStripContent.sectors} />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
