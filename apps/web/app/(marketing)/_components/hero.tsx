"use client"

import { motion, useReducedMotion } from "motion/react"
import { Icon, Reveal, V2Button } from "./primitives"
import { heroContent } from "../_content"

export function V2Hero() {
  const reduced = useReducedMotion()

  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-32 sm:px-8 lg:pb-28 lg:pt-40">
      <div aria-hidden className="v2-grid-faint pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-12 lg:gap-10">
        {/* Message — wider column (asymmetric 7/5) */}
        <div className="lg:col-span-7">
          <Reveal>
            <span className="v2-chip">
              <span aria-hidden className="v2-accent">●</span>
              {heroContent.eyebrow}
            </span>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="v2-display v2-size-hero mt-7">
              {heroContent.titleLead}{" "}
              <span className="v2-serif-italic v2-accent">{heroContent.titleEmphasis}</span>{" "}
              {heroContent.titleTail}
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="v2-lead mt-7 max-w-xl">{heroContent.body}</p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <V2Button href={heroContent.primary.href}>
                {heroContent.primary.label}
                <Icon name="arrow" size={17} />
              </V2Button>
              <V2Button href={heroContent.secondary.href} variant="ghost">
                <Icon name="pin" size={17} />
                {heroContent.secondary.label}
              </V2Button>
            </div>
          </Reveal>
        </div>

        {/* Cinematic footage — offset column */}
        <motion.div
          className="lg:col-span-5"
          initial={reduced ? false : { opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="v2-frame relative aspect-[4/5] w-full">
            <video
              autoPlay={!reduced}
              muted
              loop
              playsInline
              preload="auto"
              poster={heroContent.videoPoster}
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source src={heroContent.videoSrc} type="video/mp4" />
            </video>
            <div aria-hidden className="v2-media-scrim absolute inset-x-0 bottom-0 h-1/2" />
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 p-5">
              <span aria-hidden className="v2-pulse" />
              <span className="v2-mono v2-on-media text-xs uppercase tracking-wide">
                {heroContent.caption}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
