"use client"

import * as React from "react"
import DottedMap from "dotted-map"
import { motion } from "motion/react"
import { cn } from "@workspace/ui/lib/utils"

export interface MapDot {
  start: {
    lat: number
    lng: number
    label?: string
  }
  end: {
    lat: number
    lng: number
    label?: string
  }
}

interface WorldMapProps {
  dots?: MapDot[]
  className?: string
}

// ---------------------------------------------------------------------------
// Regional dotted base map — computed ONCE at module load (deterministic, no
// props), so the country geometry is parsed a single time and shared by every
// render. The corridor TAC Express actually runs is New Delhi -> Imphal, so the
// frame is cropped to the India / South-Asia region rather than the whole globe
// (where a ~1,600 km lane would be an invisible speck). `dotted-map` projects
// land into the same `0 0 W H` SVG space that `getPin` returns coordinates in,
// so the overlay vectors below align to the dot grid exactly.
// ---------------------------------------------------------------------------
const REGION = {
  lat: { min: 6, max: 36 },
  lng: { min: 60, max: 104 },
} as const

const BASE_MAP = new DottedMap({
  height: 56,
  region: REGION,
  projection: { name: "mercator" },
})

const MAP_W = BASE_MAP.image.width
const MAP_H = BASE_MAP.image.height
const LAND_POINTS = BASE_MAP.getPoints().map((p) => ({ x: p.x, y: p.y }))

// Marker sizing in viewBox units (W≈76). Kept proportional so the map scales
// cleanly from mobile to the full-width hero panel.
const DOT = 0.32 // land-dot square half-extent reads as ~3px at hero width
const LINE_W = 0.5
const DIAMOND = 1.3 // hub node half-diagonal

function projectLatLng(lat: number, lng: number) {
  const pin = BASE_MAP.getPin({ lat, lng })
  return pin ? { x: pin.x, y: pin.y } : null
}

export default function WorldMap({ dots = [], className }: WorldMapProps) {
  // Project every consumer-supplied lane + collect the unique hubs it touches.
  const { segments, hubs } = React.useMemo(() => {
    const unique = new Map<
      string,
      { x: number; y: number; lat: number; lng: number; label?: string }
    >()
    const segs: { x1: number; y1: number; x2: number; y2: number }[] = []

    for (const dot of dots) {
      const a = projectLatLng(dot.start.lat, dot.start.lng)
      const b = projectLatLng(dot.end.lat, dot.end.lng)
      if (!a || !b) continue
      segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
      unique.set(`${dot.start.lat},${dot.start.lng}`, {
        ...a,
        lat: dot.start.lat,
        lng: dot.start.lng,
        label: dot.start.label,
      })
      unique.set(`${dot.end.lat},${dot.end.lng}`, {
        ...b,
        lat: dot.end.lat,
        lng: dot.end.lng,
        label: dot.end.label,
      })
    }
    return { segments: segs, hubs: Array.from(unique.values()) }
  }, [dots])

  const corridorLabel = hubs.map((h) => h.label?.split(" (")[0] ?? "").join(" → ")

  return (
    <div
      role="img"
      aria-label={corridorLabel ? `Active corridor map: ${corridorLabel}` : "Active corridor map"}
      style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}
      className={cn(
        "relative w-full bg-card border border-border overflow-hidden select-none tac-scanline",
        className
      )}
    >
      {/* Brutalist telemetry corner brackets */}
      <div aria-hidden className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary z-20 m-2 pointer-events-none" />
      <div aria-hidden className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary z-20 m-2 pointer-events-none" />
      <div aria-hidden className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary z-20 m-2 pointer-events-none" />
      <div aria-hidden className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary z-20 m-2 pointer-events-none" />

      {/* Sector labelling overlays */}
      <div aria-hidden className="absolute top-3 left-4 tac-mono-label text-paper-9 text-primary/75 z-30">
        SYS_SECTOR: EAST_NORTH_EAST // TACTICAL_GRID
      </div>
      <div aria-hidden className="absolute bottom-3 left-4 tac-mono-label text-paper-9 text-muted-foreground/60 z-30">
        SCALE: 1:3,500,000 // PROJ: MERCATOR
      </div>
      <div aria-hidden className="absolute bottom-3 right-4 bg-background border border-primary-strong px-2 py-0.5 z-30 tac-mono-label text-primary text-glow-primary">
        LINK: NOMINAL // CORRIDOR_ACTIVE
      </div>

      {/* Map + corridor vectors */}
      <svg
        aria-hidden
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        className="absolute inset-0 z-10 w-full h-full overflow-visible"
      >
        {/* Recognizable land mass — sharp squares (LAW 13), decorative */}
        <g className="text-muted-foreground opacity-30" fill="currentColor">
          {LAND_POINTS.map((p, i) => (
            <rect key={`land-${i}`} x={p.x - DOT} y={p.y - DOT} width={DOT * 2} height={DOT * 2} />
          ))}
        </g>

        {/* Corridor lanes — straight vectors only (LAW 13) */}
        {segments.map((s, idx) => (
          <g key={`lane-${idx}`}>
            {/* Static background track */}
            <line
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke="var(--border)"
              strokeWidth={LINE_W * 0.6}
              strokeDasharray="1 1.4"
              className="opacity-60"
            />
            {/* Animated active signal */}
            <motion.line
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke="var(--primary)"
              strokeWidth={LINE_W}
              strokeDasharray="2.5 2.5"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: -10 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              className="motion-reduce:hidden"
            />
            {/* Travelling cargo packet (sharp square) */}
            <motion.g
              initial={{ x: s.x1, y: s.y1 }}
              animate={{ x: s.x2, y: s.y2 }}
              transition={{
                duration: 2.6,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
              className="motion-reduce:hidden"
            >
              <rect x={-DOT * 1.6} y={-DOT * 1.6} width={DOT * 3.2} height={DOT * 3.2} fill="var(--primary)" />
            </motion.g>
          </g>
        ))}

        {/* Hub nodes — brutalist diamonds, no circles (LAW 13) */}
        {hubs.map((hub, idx) => {
          const inner = `${hub.x},${hub.y - DIAMOND} ${hub.x + DIAMOND},${hub.y} ${hub.x},${hub.y + DIAMOND} ${hub.x - DIAMOND},${hub.y}`
          return (
            <g key={`hub-${idx}`}>
              {/* Expanding pulse ring */}
              <motion.polygon
                points={inner}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={LINE_W * 0.8}
                initial={{ scale: 1, opacity: 0.9 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: idx * 0.5 }}
                style={{ transformOrigin: `${hub.x}px ${hub.y}px` }}
                className="motion-reduce:hidden"
              />
              {/* Solid core diamond */}
              <polygon points={inner} fill="var(--primary)" stroke="var(--background)" strokeWidth={LINE_W * 0.8} />
            </g>
          )
        })}
      </svg>

      {/* Hub labels — HTML overlay so type stays crisp and never clips the
          frame (right-edge hubs anchor their card leftward). */}
      {hubs.map((hub, idx) => {
        const fx = hub.x / MAP_W
        const fy = hub.y / MAP_H
        const leftSide = fx > 0.6
        return (
          <div
            key={`label-${idx}`}
            className="absolute z-30 pointer-events-none"
            style={{ left: `${fx * 100}%`, top: `${fy * 100}%` }}
          >
            <div
              className={cn(
                "absolute -translate-y-1/2 whitespace-nowrap border border-border bg-background/90 px-1.5 py-1 shadow-sm",
                leftSide ? "right-3 text-right" : "left-3"
              )}
            >
              <span className="block tac-mono-label text-primary leading-none">
                {(hub.label ?? `NODE_0${idx + 1}`).toUpperCase()}
              </span>
              <span className="mt-0.5 block font-mono text-3xs text-muted-foreground leading-none">
                LAT {hub.lat.toFixed(4)}N / LNG {hub.lng.toFixed(4)}E
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
