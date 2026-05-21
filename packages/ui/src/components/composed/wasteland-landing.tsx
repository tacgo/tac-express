"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { Icon } from "@workspace/ui/icons"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { GlobeHero } from "@workspace/ui/components/composed/globe-hero"

// v6 motion bezier — mirrors --ease-smooth in globals.css.
const EASE_SMOOTH = [0.4, 0, 0.2, 1] as const

// ── Section 2: Metrics / Benefits ────────────────────────────────────────────

function BusinessUtility() {
  return (
    <section
      id="how-it-works"
      className="py-20 bg-card border-b border-border relative scroll-mt-20"
    >
      <div className="container mx-auto max-w-6xl px-6 relative z-10">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="t-h1 md:t-display uppercase text-foreground mb-4">
            Operational Telemetry.
          </h2>
          <p className="tac-mono-label text-muted-foreground max-w-xl mx-auto">
            Three measured deltas · 6-month rolling average · fleet-wide
          </p>
        </motion.div>

        {/* Connected Border Grid Mesh */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.15 } },
            hidden: {}
          }}
          className="grid grid-cols-1 md:grid-cols-12 border border-border bg-card"
        >
          <MetricCard
            id="M-01"
            title="Time Saving"
            metric="20%"
            subtitle="Less Mundanity"
            desc="Process automation frees up logistical units to focus on core tasks."
            className="md:col-span-5 border-b md:border-b-0 md:border-r border-border"
          />
          <MetricCard
            id="M-02"
            title="Safety Protocols"
            metric="50%"
            subtitle="Fewer Accidents"
            desc="Analyzing driving behavior improves transit road safety dramatically."
            className="md:col-span-4 border-b md:border-b-0 md:border-r border-border"
          />
          <MetricCard
            id="M-03"
            title="Fuel Optimization"
            metric="30%"
            subtitle="Reduction in Burn"
            desc="Algorithmic route optimization saves up to a third on fossil fuel expenditure."
            className="md:col-span-3"
          />
        </motion.div>

      </div>
    </section>
  )
}

function MetricCard({
  id,
  title,
  metric,
  subtitle,
  desc,
  className,
}: {
  id: string
  title: string
  metric: string
  subtitle: string
  desc: string
  className?: string
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_SMOOTH } }
      }}
      className={cn(
        "bg-card p-8 relative flex flex-col group transition-colors duration-200 overflow-hidden",
        className
      )}
    >
      {/* Premium violet bottom-glow overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary-soft to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* FUI Ticks on Hover */}
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-primary/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-primary/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

      <div className="absolute -top-3 left-6 bg-primary text-primary-foreground px-2 py-0.5 tac-mono-label-base">{id}</div>
      <div className="tac-mono-label text-muted-foreground mb-8 border-b border-border pb-2 z-10">{title}</div>
      <div className="t-data text-foreground mb-2 z-10 transition-colors group-hover:text-primary">{metric}</div>
      <div className="tac-mono-label text-primary mb-4 normal-case z-10">{subtitle}</div>
      <p className="t-mono-sm text-muted-foreground leading-relaxed mt-auto z-10">
        {desc}
      </p>
    </motion.div>
  )
}

// ── Section 3: Results & Chart ───────────────────────────────────────────────

function ResultsChart() {
  const [telemetry, setTelemetry] = React.useState({
    lat: 28.6139,
    lon: 77.2090,
    speed: 78.4,
    altitude: 218,
    heading: 142
  })

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry(prev => ({
        lat: Number((prev.lat + (Math.random() - 0.5) * 0.0002).toFixed(5)),
        lon: Number((prev.lon + (Math.random() - 0.5) * 0.0002).toFixed(5)),
        speed: Number((prev.speed + (Math.random() - 0.5) * 1.5).toFixed(1)),
        altitude: prev.altitude + Math.floor((Math.random() - 0.5) * 2),
        heading: (prev.heading + Math.floor((Math.random() - 0.5) * 3) + 360) % 360
      }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="py-20 bg-background border-b border-border relative overflow-hidden">
      {/* Vertical grid lines with running light pulses */}
      <div className="absolute inset-y-0 left-4 md:left-12 w-px bg-border/20 pointer-events-none z-20">
        <motion.div
          className="absolute top-0 w-px h-40 bg-gradient-to-b from-transparent via-primary to-transparent"
          animate={{ top: ["-160px", "100%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear", delay: 1 }}
        />
      </div>
      <div className="absolute inset-y-0 right-4 md:right-12 w-px bg-border/20 pointer-events-none z-20">
        <motion.div
          className="absolute top-0 w-px h-40 bg-gradient-to-b from-transparent via-primary to-transparent"
          animate={{ top: ["100%", "-160px"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear", delay: 1 }}
        />
      </div>

      <div className="container mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left side — Case Study narrative */}
          <div className="lg:col-span-5 flex flex-col items-start text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              className="mb-4"
            >
              <span className="tac-mono-label text-primary">
                CASE STUDY · NORTH-EAST CORRIDOR FLEET
              </span>
            </motion.div>

            <h2 className="t-h1 md:t-display uppercase text-foreground mb-6 text-left leading-[1.03]">
              <span className="block">
                {["Cost", "Delta"].map((word, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ opacity: 0, filter: "blur(6px)", y: 10 }}
                    whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.4, delay: idx * 0.06, ease: EASE_SMOOTH }}
                    className="inline-block mr-2"
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
              <span className="block text-primary">
                {["27%", "·", "6", "Months."].map((word, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ opacity: 0, filter: "blur(6px)", y: 10 }}
                    whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.4, delay: 0.12 + idx * 0.06, ease: EASE_SMOOTH }}
                    className="inline-block mr-2"
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
            </h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="t-body text-muted-foreground leading-relaxed text-left"
            >
              Across a six-month telematics pilot, the North-East Corridor Fleet reduced operating costs by <span className="font-bold text-foreground">27%</span> through route optimization, behavior monitoring, and centralized telemetry.
            </motion.p>
          </div>

          {/* Right side — High density SVG Telemetry Scan Dashboard */}
          <div className="lg:col-span-7 w-full">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, ease: EASE_SMOOTH }}
              className="bg-surface-elevated border-2 border-border p-8 relative shadow-brutal w-full tac-fui-panel rounded-none"
            >
               <div className="absolute top-4 right-4 flex gap-2">
                 <span aria-hidden className="w-2 h-2 bg-accent-success animate-pulse motion-reduce:animate-none"></span>
                 <span aria-hidden className="w-2 h-2 bg-primary"></span>
               </div>

               <p className="tac-mono-label text-muted-foreground mb-6">
                 RESULT · 6-MONTH TELEMETRY PILOT
               </p>

               <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  {/* Radar grid (SVG) */}
                  <div className="md:col-span-7 flex items-center justify-center bg-background border border-border p-4 relative overflow-hidden rounded-none h-60">
                    <div className="absolute top-2 left-2 tac-mono-label text-ui-9 text-primary/75">
                      RADAR_SCAN_UPLINK
                    </div>

                    <svg className="w-full h-full max-h-48 overflow-visible" viewBox="0 0 200 200">
                      {/* Concentric square range markers (LAW 13: straight lines only) */}
                      <rect x="10" y="10" width="180" height="180" fill="none" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-30" />
                      <rect x="30" y="30" width="140" height="140" fill="none" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-30" />
                      <rect x="50" y="50" width="100" height="100" fill="none" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-30" />
                      <rect x="70" y="70" width="60" height="60" fill="none" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-30" />

                      {/* Diagonal and center crosshairs */}
                      <line x1="10" y1="10" x2="190" y2="190" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-25" />
                      <line x1="190" y1="10" x2="10" y2="190" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-25" />
                      <line x1="100" y1="10" x2="100" y2="190" stroke="var(--border)" strokeWidth="0.5" className="opacity-40" />
                      <line x1="10" y1="100" x2="190" y2="100" stroke="var(--border)" strokeWidth="0.5" className="opacity-40" />

                      {/* Cargo Transit Routes (dashed polylines) */}
                      <polyline points="30,150 70,120 100,100 130,70 170,40" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" className="opacity-50" />
                      <polyline points="170,40 130,70 90,160 50,50" fill="none" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" className="opacity-30" />

                      {/* Sweep Trails (simulated radar sweeps using rotated lines) */}
                      <motion.line
                        x1="100" y1="100" x2="100" y2="10"
                        stroke="var(--primary)" strokeWidth="1.5"
                        style={{ transformOrigin: "100px 100px" }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                      />
                      <motion.line
                        x1="100" y1="100" x2="100" y2="10"
                        stroke="var(--primary)" strokeWidth="1"
                        className="opacity-50"
                        style={{ transformOrigin: "100px 100px" }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: -0.06 }}
                      />
                      <motion.line
                        x1="100" y1="100" x2="100" y2="10"
                        stroke="var(--primary)" strokeWidth="0.8"
                        className="opacity-25"
                        style={{ transformOrigin: "100px 100px" }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: -0.12 }}
                      />

                      {/* Active Cargo Tracking nodes (pulses) */}
                      <g>
                        <polygon points="50,47 53,50 50,53 47,50" className="fill-accent-success" />
                        <motion.polygon
                          points="50,47 53,50 50,53 47,50"
                          className="stroke-accent-success fill-none"
                          strokeWidth="1"
                          initial={{ scale: 1, opacity: 1 }}
                          animate={{ scale: 3, opacity: 0 }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                          style={{ transformOrigin: "50px 50px" }}
                        />
                        <text x="56" y="52" fontSize={6} className="font-mono fill-accent-success/90 select-none pointer-events-none font-bold">TRK_N01 // ACTIVE</text>
                      </g>

                      <g>
                        <polygon points="130,67 133,70 130,73 127,70" className="fill-primary" />
                        <motion.polygon
                          points="130,67 133,70 130,73 127,70"
                          className="stroke-primary fill-none"
                          strokeWidth="1"
                          initial={{ scale: 1, opacity: 1 }}
                          animate={{ scale: 3, opacity: 0 }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
                          style={{ transformOrigin: "130px 70px" }}
                        />
                        <text x="136" y="72" fontSize={6} className="font-mono fill-primary/95 select-none pointer-events-none font-bold">TRK_N02 // TRANSIT</text>
                      </g>

                      <g>
                        <polygon points="90,157 93,160 90,163 87,160" className="fill-accent-danger" />
                        <motion.polygon
                          points="90,157 93,160 90,163 87,160"
                          className="stroke-accent-danger fill-none"
                          strokeWidth="1"
                          initial={{ scale: 1, opacity: 1 }}
                          animate={{ scale: 3, opacity: 0 }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 1.6 }}
                          style={{ transformOrigin: "90px 160px" }}
                        />
                        <text x="96" y="162" fontSize={6} className="font-mono fill-accent-danger/95 select-none pointer-events-none font-bold">TRK_N03 // ALERT</text>
                      </g>
                    </svg>
                  </div>

                  {/* Telemetry log readings */}
                  <div className="md:col-span-5 flex flex-col justify-between bg-background border border-border p-4 font-mono text-ui-10 text-muted-foreground h-60 rounded-none overflow-hidden">
                    <div className="border-b border-border pb-1.5 flex justify-between items-center text-ui-10">
                      <span className="text-primary font-bold">SYS_TELEMETRY</span>
                      <span className="animate-pulse text-accent-success">SYNCED</span>
                    </div>

                    <div className="flex-grow py-3 flex flex-col gap-2.5">
                      <div className="flex justify-between border-b border-border/30 pb-1">
                        <span>LATITUDE:</span>
                        <span className="text-foreground font-bold font-mono">{telemetry.lat.toFixed(5)} N</span>
                      </div>
                      <div className="flex justify-between border-b border-border/30 pb-1">
                        <span>LONGITUDE:</span>
                        <span className="text-foreground font-bold font-mono">{telemetry.lon.toFixed(5)} E</span>
                      </div>
                      <div className="flex justify-between border-b border-border/30 pb-1">
                        <span>VELOCITY:</span>
                        <span className="text-foreground font-bold font-mono">{telemetry.speed.toFixed(1)} KM/H</span>
                      </div>
                      <div className="flex justify-between border-b border-border/30 pb-1">
                        <span>ALTITUDE:</span>
                        <span className="text-foreground font-bold font-mono">{telemetry.altitude} M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>HEADING:</span>
                        <span className="text-foreground font-bold font-mono">{telemetry.heading}° SE</span>
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-2 text-ui-9 text-muted-foreground/60 leading-none">
                      FRAME_SYS // LINK: ONLINE // DATA_DRIVE_OK
                    </div>
                  </div>
               </div>

            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Section 4: Architecture Compatibility ────────────────────────────────────

function SystemCompatibility() {
  return (
    <section
      id="features"
      className="py-20 bg-card border-b border-border overflow-hidden scroll-mt-20"
    >
      <div className="container mx-auto max-w-6xl px-6">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          <div className="lg:col-span-7">
            <h2 className="t-h1 md:t-display uppercase text-foreground mb-8">
              {["Integration", "Layer", "·", "OPEN."].map((word, idx) => (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, filter: "blur(6px)", y: 10 }}
                  whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: idx * 0.08, ease: EASE_SMOOTH }}
                  className={cn("inline-block mr-2", word === "·" && "text-primary")}
                >
                  {word}
                </motion.span>
              ))}
            </h2>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={{
                visible: { transition: { staggerChildren: 0.1 } },
                hidden: {}
              }}
              className="border border-border divide-y divide-border bg-card"
            >
              <FeatureItem 
                index="01"
                icon="plug"
                title="Wide range of integrations."
                desc="Our systems support integration with leading software solutions for fleet management and accounting."
              />
              <FeatureItem 
                index="02"
                icon="cpu"
                title="Hardware compatibility."
                desc="We work with GPS trackers, fuel sensors, driver monitoring devices, and other standard telematics hardware."
              />
              <FeatureItem 
                index="03"
                icon="terminal"
                title="API for custom solutions."
                desc="Leverage our flexible API to create a tailored solution that fits your business specific needs."
              />
              <FeatureItem 
                index="04"
                icon="rocket"
                title="Fast setup."
                desc="Integration takes just a few hours, allowing you to immediately start optimizing your processes."
              />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE_SMOOTH }}
            className="relative aspect-[3/4] border-2 border-primary-medium bg-muted shadow-brutal p-2 group lg:col-span-5 rounded-none"
          >
             <div className="w-full h-full relative overflow-hidden border border-border rounded-none">
               <div className="absolute inset-0 z-10 bg-primary-subtle mix-blend-overlay pointer-events-none" />
               <img
                 src="/images/tac-dock-illustration.jpg"
                 alt="TAC Logistics Operations"
                 className="w-full h-full object-cover filter grayscale contrast-125"
               />
               <div className="absolute top-4 left-4 bg-background border border-primary-strong px-3 py-1 z-20 tac-mono-label text-primary">
                  DOCK_04 // ACTIVE
               </div>
             </div>
          </motion.div>

        </div>

      </div>
    </section>
  )
}

function FeatureItem({ 
  index, 
  icon, 
  title, 
  desc 
}: { 
  index: string
  icon: React.ComponentProps<typeof Icon>['name']
  title: string
  desc: string 
}) {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_SMOOTH } }
      }}
      className="flex gap-6 p-6 group relative overflow-hidden transition-colors hover:bg-primary-soft/30"
    >
      <div className="absolute top-3 right-4 tac-mono-label text-muted-foreground/30 font-bold font-mono">
        SYS_INT_{index}
      </div>
      <div className="flex-shrink-0 w-12 h-12 bg-background border border-border flex items-center justify-center group-hover:border-primary group-hover:bg-primary-soft transition-all duration-200">
        <Icon name={icon} className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
      </div>
      <div>
        <h4 className="tac-mono-label text-foreground mb-2 group-hover:text-primary transition-colors">{title}</h4>
        <p className="t-mono-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  )
}

// ── Section 5: Features Grid ──────────────────────────────────────────────────

function SkeletonOne() {
  return (
    <div className="relative flex h-full gap-6 px-2 py-4 flex-col">
      <div className="mx-auto h-48 w-full bg-background border border-border p-3 shadow-brutal relative overflow-hidden group">
        <div className="absolute top-2 right-2 tac-mono-label text-accent-danger animate-pulse flex items-center gap-1.5 text-3xs">
          <span className="w-1.5 h-1.5 bg-accent-danger rounded-none" />
          EXCEPTION_RAISED
        </div>
        <div className="flex h-full w-full flex-col space-y-3 font-mono text-3xs text-muted-foreground">
          <div className="border-b border-border/50 pb-1 text-foreground font-bold">
            LOG_ID: EX_90823 // HUB_SEC_N1
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>AWB_REF:</span>
              <span className="text-foreground">AWB-8902-8821</span>
            </div>
            <div className="flex justify-between">
              <span>LATENCY:</span>
              <span className="text-foreground">+14.2 hrs (DELAYED)</span>
            </div>
            <div className="flex justify-between">
              <span>ROUTE:</span>
              <span className="text-foreground">DEL -{'>'}  GAU -{'>'}  IMF</span>
            </div>
          </div>
          <div className="w-full bg-accent-danger-soft border border-accent-danger/30 p-1.5 text-accent-danger leading-tight uppercase font-bold">
            ACTION REQUIRED: RE-ROUTE DEPOT_02
          </div>
        </div>
      </div>
    </div>
  )
}

function SkeletonTwo() {
  const images = [
    "https://images.unsplash.com/photo-1573790387438-4da905039392?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555400038-63f5ba517a47?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1554931670-4ebfabf6e7a9?q=80&w=600&auto=format&fit=crop",
  ];

  const imageVariants = {
    whileHover: {
      scale: 1.05,
      y: -5,
      zIndex: 50,
      transition: { duration: 0.2, ease: EASE_SMOOTH }
    },
  };

  return (
    <div className="relative flex h-48 items-center justify-center gap-4 overflow-hidden py-4">
      <div className="flex flex-row -space-x-8">
        {images.map((image, idx) => (
          <motion.div
            variants={imageVariants}
            key={idx}
            style={{
              rotate: (idx - 1) * 8,
            }}
            whileHover="whileHover"
            className="shrink-0 overflow-hidden rounded-none border border-border bg-card p-1 shadow-brutal"
          >
            <div className="relative">
              <img
                src={image}
                alt="cargo verification"
                width="140"
                height="140"
                className="h-24 w-24 object-cover filter grayscale contrast-125 rounded-none"
              />
              <div className="absolute bottom-1 left-1 bg-background/90 text-3xs font-mono px-1 py-0.5 border border-border/50">
                CAM_{idx + 1}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SkeletonThree() {
  return (
    <a
      href="https://www.youtube.com/watch?v=RPa3_AD1_Vs"
      target="__blank"
      className="group/image relative block w-full h-48 overflow-hidden border border-border bg-background rounded-none mt-2"
    >
      <div className="absolute inset-0 z-10 bg-primary-subtle mix-blend-overlay pointer-events-none" />
      <Icon name="youtube" className="absolute inset-0 z-20 m-auto h-12 w-12 text-accent-danger transition-transform group-hover/image:scale-110" />
      <img
        src="https://assets.aceternity.com/fireship.jpg"
        alt="TAC Express terminal operations video"
        className="w-full h-full object-cover filter grayscale contrast-125 brightness-75 transition-all duration-300 group-hover/image:blur-sm"
      />
      <div className="absolute bottom-2 left-2 bg-background border border-border px-2 py-0.5 z-20 text-3xs font-mono text-primary">
        VIDEO_FEED // PLAY
      </div>
    </a>
  );
}

function SkeletonFour() {
  const [angleX, setAngleX] = React.useState(0.5);
  const [angleY, setAngleY] = React.useState(0.8);

  React.useEffect(() => {
    let frameId: number;
    const update = () => {
      setAngleX((a) => a + 0.006);
      setAngleY((a) => a + 0.009);
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const vertices: [number, number, number][] = [
    [-30, -30, -30],
    [30, -30, -30],
    [30, 30, -30],
    [-30, 30, -30],
    [-30, -30, 30],
    [30, -30, 30],
    [30, 30, 30],
    [-30, 30, 30],
  ];

  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  const rotateY = (x: number, z: number, angle: number): [number, number] => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [x * cos - z * sin, x * sin + z * cos];
  };

  const rotateX = (y: number, z: number, angle: number): [number, number] => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [y * cos - z * sin, y * sin + z * cos];
  };

  const project = (x: number, y: number, z: number, w: number, h: number): [number, number] => {
    const scale = 140 / (140 + z);
    const px = x * scale + w / 2;
    const py = y * scale + h / 2;
    return [px, py];
  };

  const w = 240;
  const h = 180;

  const projected: [number, number][] = vertices.map(([x, y, z]) => {
    const [x1, z1] = rotateY(x, z, angleY);
    const [y2, z2] = rotateX(y, z1, angleX);
    return project(x1, y2, z2, w, h);
  });

  return (
    <div className="relative flex h-48 w-full items-center justify-center bg-background/50 border border-border/40 overflow-hidden rounded-none p-2 mt-2">
      <div className="absolute top-2 left-2 text-3xs font-mono text-muted-foreground/60">
        SYS_TEL // ROT_MATRIX_3D
      </div>
      <svg width={w} height={h} className="text-primary">
        {/* Draw edges */}
        {edges.map(([p1, p2], idx) => {
          const pt1 = projected[p1];
          const pt2 = projected[p2];
          if (!pt1 || !pt2) return null;
          return (
            <line
              key={idx}
              x1={pt1[0]}
              y1={pt1[1]}
              x2={pt2[0]}
              y2={pt2[1]}
              stroke="currentColor"
              strokeWidth="1"
              strokeOpacity="0.8"
            />
          );
        })}
        {/* Draw vertices */}
        {projected.map((pt, idx) => (
          <rect
            key={idx}
            x={pt[0] - 2}
            y={pt[1] - 2}
            width="4"
            height="4"
            className="fill-background stroke-primary stroke-[1]"
          />
        ))}
      </svg>
    </div>
  );
}

function FeaturesSection() {
  const features = [
    {
      title: "Centralized Exception Ledger",
      description:
        "Logistics exceptions are captured, tracked, and reconciled in real-time.",
      skeleton: <SkeletonOne />,
      className:
        "col-span-1 lg:col-span-4 border-b lg:border-r border-border",
    },
    {
      title: "Optical Cargo Inspection",
      description:
        "Verify cargo visual state and automatically extract manifest details on mobile hubs.",
      skeleton: <SkeletonTwo />,
      className: "border-b col-span-1 lg:col-span-2 border-border",
    },
    {
      title: "Watch Terminal Operations",
      description:
        "See the TAC Express Violet Grid mission control terminal in action.",
      skeleton: <SkeletonThree />,
      className:
        "col-span-1 lg:col-span-3 lg:border-r border-b lg:border-b-0 border-border",
    },
    {
      title: "Global Routing Optimization",
      description:
        "Our low-latency telemetry core routes and tracks cargo globally across hubs.",
      skeleton: <SkeletonFour />,
      className: "col-span-1 lg:col-span-3",
    },
  ];

  return (
    <section id="features" className="py-20 bg-background border-b border-border overflow-hidden scroll-mt-20">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h2 className="t-h1 md:t-display uppercase text-foreground mb-4 dark:text-glow-primary">
            {["Engineered", "for", "Complete", "Control"].map((word, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, filter: "blur(6px)", y: 10 }}
                whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: idx * 0.08, ease: EASE_SMOOTH }}
                className="inline-block mr-3"
              >
                {word}
              </motion.span>
            ))}
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4, ease: EASE_SMOOTH }}
            className="mx-auto max-w-2xl t-body text-muted-foreground"
          >
            Every parcel, every route, and every transaction fully instrumented and automated.
          </motion.p>
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 rounded-none lg:grid-cols-6 border border-border bg-card">
            {features.map((feature) => (
              <FeatureCard key={feature.title} className={feature.className}>
                <FeatureTitle>{feature.title}</FeatureTitle>
                <FeatureDescription>{feature.description}</FeatureDescription>
                <div className="w-full mt-auto">{feature.skeleton}</div>
              </FeatureCard>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden p-6 sm:p-8 flex flex-col justify-between rounded-none transition-colors hover:bg-primary-soft/30 group", className)}>
      <div className="flex flex-col h-full w-full">
        {children}
      </div>
    </div>
  );
}

function FeatureTitle({ children }: { children?: React.ReactNode }) {
  return (
    <h3 className="tac-mono-label text-foreground text-lg mb-2">
      {children}
    </h3>
  );
}

function FeatureDescription({ children }: { children?: React.ReactNode }) {
  return (
    <p className="t-mono-sm text-muted-foreground leading-relaxed mb-6">
      {children}
    </p>
  );
}

// ── Main Export ──────────────────────────────────────────────────────────────

export function WastelandLanding() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-secondary selection:text-secondary-foreground">
      <GlobeHero />
      <BusinessUtility />
      <ResultsChart />
      <FeaturesSection />
      <SystemCompatibility />
    </main>
  )
}

