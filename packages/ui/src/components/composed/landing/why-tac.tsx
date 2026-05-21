"use client"

import { motion } from "motion/react"
import { Icon } from "@workspace/ui/icons"
import { whyContent } from "./landing-data"
import { revealUp } from "./motion"

/** Square-node "map" (LAW 13: no circles/curves) — a grid of dots with a few
 *  primary nodes tracing a rough corridor. Decorative. */
function CorridorDots() {
  const cols = 24
  const rows = 11
  const lit = new Set(["3-7", "6-6", "9-5", "12-5", "15-4", "18-3", "20-3"])
  const cells: { x: number; y: number; on: boolean }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ x: c, y: r, on: lit.has(`${c}-${r}`) })
    }
  }
  return (
    <svg viewBox="0 0 120 56" aria-hidden className="w-full">
      {cells.map((cell) => (
        <rect
          key={`${cell.x}-${cell.y}`}
          x={cell.x * 5 + 1}
          y={cell.y * 5 + 1}
          width={1.4}
          height={1.4}
          className={cell.on ? "fill-chart-primary" : "fill-chart-grid"}
          opacity={cell.on ? 1 : 0.4}
        />
      ))}
    </svg>
  )
}

/** Straight-segment step chart (no curves) for the activity feed. */
function ActivityChart() {
  const pts = [8, 30, 22, 48, 40, 64, 52, 88, 70, 96, 84]
  const max = 100
  const stepW = 120 / (pts.length - 1)
  let d = `M 0 ${56 - (pts[0]! / max) * 50}`
  pts.forEach((p, i) => {
    if (i === 0) return
    const x = i * stepW
    const y = 56 - (p / max) * 50
    d += ` H ${x} V ${y}`
  })
  return (
    <svg viewBox="0 0 120 56" aria-hidden className="w-full h-32 md:h-44">
      <path d={`${d} V 56 H 0 Z`} className="fill-chart-primary" opacity={0.12} />
      <path d={d} className="stroke-chart-primary" fill="none" strokeWidth={1} />
    </svg>
  )
}

/**
 * §2 — Why TAC Express. Ports the template's bento (tracking map / support /
 * uptime / activity feed) into Violet Grid: square-node map + straight-segment
 * chart (no dotted-map, no recharts, no curves), token surfaces, remix icons,
 * logistics copy. The "uptime" band becomes the on-time figure.
 */
export function WhyTac() {
  return (
    <section id="features" className="scroll-mt-20 px-4 py-16 md:py-32">
      <motion.div
        variants={revealUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto grid max-w-5xl border border-border md:grid-cols-2"
      >
        {/* Tracking */}
        <div>
          <div className="p-6 sm:p-12">
            <span className="tac-mono-label flex items-center gap-2">
              <Icon name="map" aria-hidden className="size-4" />
              Real-time location tracking
            </span>
            <p className="t-h3 mt-8">{whyContent.features[0]!.title}: instantly locate every shipment.</p>
          </div>
          <div aria-hidden className="relative">
            <div className="absolute inset-0 z-10 m-auto size-fit">
              <div className="relative flex w-fit items-center gap-2 border border-border bg-card px-3 py-1 font-mono text-xs shadow-sm">
                <span className="size-2 bg-accent-success tac-blink motion-reduce:animate-none" /> Last scan · Imphal 14:48
              </div>
            </div>
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 z-1 bg-gradient-to-b from-transparent to-background to-75%" />
              <CorridorDots />
            </div>
          </div>
        </div>

        {/* Ops desk */}
        <div className="overflow-hidden border-t border-border bg-muted p-6 sm:p-12 md:border-0 md:border-l">
          <span className="tac-mono-label flex items-center gap-2">
            <Icon name="customer" aria-hidden className="size-4" />
            Corridor ops desk
          </span>
          <p className="t-h3 my-8">Reach a corridor controller any hour, on any lane.</p>
          <div aria-hidden className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center border border-border">
                  <Icon name="customer" className="size-3 text-primary" />
                </span>
                <span className="text-muted-foreground font-mono text-xs">Sat 14:46</span>
              </div>
              <div className="mt-1.5 w-3/5 border border-border bg-card p-3 text-xs">
                My AWB hasn&apos;t updated since Guwahati — can you check?
              </div>
            </div>
            <div>
              <div className="mb-1 ml-auto w-3/5 bg-primary p-3 text-xs text-primary-foreground">
                On it — vehicle&apos;s on NH-27, ETA Delhi 04:12. Sending live link.
              </div>
              <span className="text-muted-foreground block text-right font-mono text-xs">Now</span>
            </div>
          </div>
        </div>

        {/* On-time band */}
        <div className="col-span-full border-y border-border p-12">
          <p className="t-display text-center">
            98.7% <span className="text-muted-foreground">on-time</span>
          </p>
        </div>

        {/* Activity feed */}
        <div className="relative col-span-full">
          <div className="max-w-lg px-6 pr-12 pt-6 md:px-12 md:pt-12">
            <span className="tac-mono-label flex items-center gap-2">
              <Icon name="barChart" aria-hidden className="size-4" />
              Activity feed
            </span>
            <p className="t-h3 my-8">
              Monitor every shipment in real time.{" "}
              <span className="text-muted-foreground">Spot and resolve exceptions instantly.</span>
            </p>
          </div>
          <ActivityChart />
        </div>
      </motion.div>
    </section>
  )
}
