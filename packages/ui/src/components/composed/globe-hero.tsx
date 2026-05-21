"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "motion/react"
import dynamic from "next/dynamic"
import { Button } from "@workspace/ui/components/button"
import { AwbInput } from "@workspace/ui/components/composed/awb-input"
import { TrackingResultDialog } from "@workspace/ui/components/composed/tracking-result-dialog"
import { Icon } from "@workspace/ui/icons"
import type { GlobeConfig, Position } from "@workspace/ui/components/primitives/globe"

// Globe is client-only WebGL — never SSR
const World = dynamic(
  () => import("@workspace/ui/components/primitives/globe").then((m) => m.World),
  { ssr: false, loading: () => <div className="w-full h-full bg-background" /> }
)

// v6 motion bezier — mirrors --ease-smooth in globals.css
const EASE_SMOOTH = [0.4, 0, 0.2, 1] as const

// TAC Express Violet Grid globe config.
// These are THREE.js material hex values, not CSS/Tailwind — LAW 1/10 apply to className only.
const GLOBE_CONFIG: GlobeConfig = {
  pointSize: 1,
  globeColor: "#0a050f",
  showAtmosphere: true,
  atmosphereColor: "#4c1d95",
  atmosphereAltitude: 0.1,
  emissive: "#030308",
  emissiveIntensity: 0.3,
  shininess: 0.9,
  polygonColor: "rgba(124,58,237,0.35)",
  ambientLight: "#7c3aed",
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#7c3aed",
  arcTime: 1000,
  arcLength: 0.9,
  rings: 1,
  maxRings: 3,
  initialPosition: { lat: 20, lng: 80 },
  autoRotate: true,
  autoRotateSpeed: 0.5,
}

// Northeast India corridor arcs — the active lanes TAC Express operates
const CORRIDOR_ARCS: Position[] = [
  { order: 1, startLat: 28.6139, startLng: 77.209,  endLat: 24.817,  endLng: 93.9368, arcAlt: 0.1,  color: "#7c3aed" },
  { order: 2, startLat: 24.817,  startLng: 93.9368, endLat: 28.6139, endLng: 77.209,  arcAlt: 0.12, color: "#6d28d9" },
  { order: 3, startLat: 28.6139, startLng: 77.209,  endLat: 26.1445, endLng: 91.7362, arcAlt: 0.08, color: "#5b21b6" },
  { order: 4, startLat: 26.1445, startLng: 91.7362, endLat: 24.817,  endLng: 93.9368, arcAlt: 0.04, color: "#7c3aed" },
  { order: 5, startLat: 22.5726, startLng: 88.3639, endLat: 24.817,  endLng: 93.9368, arcAlt: 0.07, color: "#6d28d9" },
  { order: 6, startLat: 19.076,  startLng: 72.8777, endLat: 28.6139, endLng: 77.209,  arcAlt: 0.15, color: "#5b21b6" },
]

function HudOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.5, ease: EASE_SMOOTH }}
        className="absolute left-4 top-1/2 -translate-y-1/2 rotate-[-90deg] tac-mono-label text-primary/80 hidden md:block"
      >
        V.5.0.12 // TAC_LOGISTICS_FRAMEWORK // SYS.NOMINAL
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.6, ease: EASE_SMOOTH }}
        className="absolute right-4 top-1/2 -translate-y-1/2 rotate-[90deg] tac-mono-label text-primary/80 hidden md:block"
      >
        LAT_28.6139_N // LON_77.2090_E // UPLINK_STABLE
      </motion.div>
    </div>
  )
}

export function GlobeHero() {
  const [awbInput, setAwbInput] = React.useState("")
  const [trackError, setTrackError] = React.useState<string | null>(null)
  const [trackingOpen, setTrackingOpen] = React.useState(false)
  const [trackingAwb, setTrackingAwb] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const openTracking = React.useCallback((value: string) => {
    setTrackingAwb(value)
    setTrackingOpen(true)
    const url = new URL(window.location.href)
    url.searchParams.set("track", value)
    window.history.replaceState(window.history.state, "", url)
  }, [])

  function onTrack(value: string) {
    if (!value) { setTrackError("Enter an AWB or cargo ID."); return }
    setTrackError(null)
    setLoading(true)
    setTimeout(() => { setLoading(false); openTracking(value.toUpperCase()) }, 1200)
  }

  function handleTrackingOpenChange(next: boolean) {
    setTrackingOpen(next)
    if (!next) {
      const url = new URL(window.location.href)
      url.searchParams.delete("track")
      window.history.replaceState(window.history.state, "", url)
    }
  }

  React.useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("track")
    if (param) { setTrackingAwb(param.toUpperCase()); setTrackingOpen(true) }
  }, [])

  const titleWords = "Northeast Corridor Command.".split(" ")

  return (
    <section
      id="tracking"
      className="relative flex flex-col items-center bg-background border-b border-border overflow-hidden scroll-mt-20 min-h-screen"
    >
      <HudOverlay />

      {/* Running light grid lines */}
      <div className="absolute inset-y-0 left-4 md:left-12 w-px bg-border/20 pointer-events-none z-20">
        <motion.div
          className="absolute top-0 w-px h-40 bg-gradient-to-b from-transparent via-primary to-transparent"
          animate={{ top: ["-160px", "100%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div className="absolute inset-y-0 right-4 md:right-12 w-px bg-border/20 pointer-events-none z-20">
        <motion.div
          className="absolute top-0 w-px h-40 bg-gradient-to-b from-transparent via-primary to-transparent"
          animate={{ top: ["100%", "-160px"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Hero text — overlaid above the globe */}
      <div className="relative z-10 container mx-auto max-w-5xl px-4 pt-32 pb-0 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE_SMOOTH }}
          className="inline-flex items-center mb-6"
        >
          <span className="tac-mono-label text-primary">TAC LOGISTICS FRAMEWORK · NE CORRIDOR</span>
        </motion.div>

        <h1 className="relative z-10 mx-auto max-w-4xl text-center t-display uppercase mb-6 dark:text-glow-primary text-foreground leading-[1.05]">
          {titleWords.map((word, idx) => (
            <motion.span
              key={idx}
              initial={{ opacity: 0, filter: "blur(8px)", y: 15 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + idx * 0.08, ease: EASE_SMOOTH }}
              className="inline-block mr-3"
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: EASE_SMOOTH }}
          className="relative z-10 mx-auto max-w-2xl text-center t-body text-muted-foreground mb-8"
        >
          Centralized telematics, predictive routing, and high-security freight forwarding across the New Delhi–Imphal transport corridor.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: EASE_SMOOTH }}
          className="relative z-10 w-full max-w-2xl mb-4 flex justify-center"
        >
          <AwbInput
            id="awb-locate"
            size="hero"
            value={awbInput}
            onChange={setAwbInput}
            onSubmit={onTrack}
            error={trackError}
            loading={loading}
          />
        </motion.div>
      </div>

      {/* Globe — full-width, bleeds below hero text */}
      <div className="relative w-full flex-1 min-h-[480px] md:min-h-[600px]">
        {/* Radial gradient fades the globe edge into the page background */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 45%, var(--background) 82%)",
          }}
        />
        {/* Top fade so globe blends into the text section above */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none z-10"
        />
        <div className="absolute inset-0">
          <World globeConfig={GLOBE_CONFIG} data={CORRIDOR_ARCS} />
        </div>
      </div>

      {/* CTA buttons — below the globe */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8, ease: EASE_SMOOTH }}
        className="relative z-10 flex flex-col items-center gap-4 pb-20 -mt-12"
      >
        <span className="tac-mono-label text-muted-foreground text-center">
          NOT TRACKING A SHIPMENT?
        </span>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            asChild
            variant="default"
            className="h-11 rounded-none font-mono font-bold text-xs tracking-wordmark uppercase px-8 focus-visible:outline-none focus-visible:tac-focus-premium shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <Link href="/quote">
              <Icon name="calculator" className="mr-2 w-4 h-4" />
              GET A QUOTE
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-none font-mono font-bold text-xs tracking-wordmark uppercase px-8 focus-visible:outline-none focus-visible:tac-focus-premium transition-transform hover:-translate-y-0.5"
          >
            <Link href="/contact">
              <Icon name="mail" className="mr-2 w-4 h-4" />
              CONTACT TAC
            </Link>
          </Button>
        </div>
      </motion.div>

      <TrackingResultDialog
        open={trackingOpen}
        onOpenChange={handleTrackingOpenChange}
        awb={trackingAwb}
        onRetryAwb={openTracking}
      />
    </section>
  )
}
