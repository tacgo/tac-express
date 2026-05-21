"use client"

import * as React from "react"
import { animate, motion, useInView, useReducedMotion } from "motion/react"
import { reachContent, type ReachStat } from "./landing-data"
import { EASE_SMOOTH, revealUp, staggerParent, staggerItem } from "./motion"

/**
 * Animated counter. Counts from 0 → target once the stat scrolls into view.
 * Honors `prefers-reduced-motion` by rendering the final value immediately.
 */
function Counter({ stat }: { stat: ReachStat }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduced = useReducedMotion()
  const [value, setValue] = React.useState(0)

  React.useEffect(() => {
    if (!inView) return
    if (reduced) {
      setValue(stat.value)
      return
    }
    const controls = animate(0, stat.value, {
      duration: 2,
      ease: EASE_SMOOTH,
      onUpdate: (v) => setValue(v),
    })
    return () => controls.stop()
  }, [inView, reduced, stat.value])

  return (
    <span ref={ref} className="t-data t-gradient-primary tabular-nums">
      {stat.prefix}
      {value.toFixed(stat.decimals)}
      {stat.suffix}
    </span>
  )
}

/**
 * §3 — Network reach. Four counters that animate on scroll. Replaces the
 * template's react-countup + react-intersection-observer with motion/react
 * (LAW 3) and the brutalist FUI panel instead of soft cards.
 */
export function NetworkReach() {
  return (
    <section className="py-16 lg:py-20 border-y border-border bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          variants={revealUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="t-h2 text-center max-w-2xl mx-auto"
        >
          {reachContent.heading}
        </motion.h2>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border"
        >
          {reachContent.stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={staggerItem}
              className="bg-card flex flex-col items-center text-center gap-3 px-5 py-10"
            >
              <Counter stat={stat} />
              <span className="t-overline text-muted-foreground">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
