"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"
import { Button } from "@workspace/ui/components/button"
import { RiArrowRightLine, RiMapPinLine } from "@workspace/ui/icons"
import { Reveal } from "./primitives"
import { V2TrackingWidget } from "./tracking-widget"
import { heroContent } from "../_content"

export function V2Hero() {
  const reduced = useReducedMotion()

  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-32 sm:px-8 lg:pb-28 lg:pt-40">
      {/* Dot-grid background texture — uses border token, adapts to dark/light */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle, var(--border) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />
      {/* Top edge accent line */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-primary/40" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-12 lg:gap-10">
        {/* Copy — 7 cols */}
        <div className="lg:col-span-7">
          <Reveal>
            <div className="inline-flex items-center gap-2 border border-border bg-background/60 px-3 py-1.5 tac-mono-label-base text-muted-foreground">
              <span className="size-1.5 animate-pulse bg-primary" aria-hidden="true" />
              {heroContent.eyebrow}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mt-7 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
              {heroContent.titleLead}{" "}
              <em className="font-serif font-semibold not-italic text-primary">
                {heroContent.titleEmphasis}
              </em>{" "}
              {heroContent.titleTail}
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-7 max-w-xl t-body text-muted-foreground">
              {heroContent.body}
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild>
                <Link href={heroContent.primary.href}>
                  {heroContent.primary.label}
                  <RiArrowRightLine className="ml-1.5 size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href={heroContent.secondary.href}>
                  <RiMapPinLine className="mr-1.5 size-4" aria-hidden="true" />
                  {heroContent.secondary.label}
                </Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.34}>
            <V2TrackingWidget />
          </Reveal>
        </div>

        {/* Video — 5 cols */}
        <motion.div
          className="lg:col-span-5"
          initial={reduced ? false : { opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative aspect-[4/5] w-full border border-border shadow">
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
            {/* Scrim */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background/90 to-transparent"
            />
            {/* Caption */}
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 p-5">
              <span className="size-1.5 animate-pulse bg-primary" aria-hidden="true" />
              <span className="font-mono text-xs uppercase tracking-widest text-foreground/70">
                {heroContent.caption}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
