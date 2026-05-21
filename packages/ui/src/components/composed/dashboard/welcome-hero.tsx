"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import { RiShieldCheckLine, RiUserLine } from "@workspace/ui/icons"
import { AnimatedGroup, AnimatedGroupItem } from "@workspace/ui/components/primitives/animated-text"

interface WelcomeHeroProps {
  name?: string
  role?: string | null
  isSuperAdmin?: boolean
  className?: string
}

function greetingFromHour(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function formatDateTime(): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    hour12: false,
  }).format(new Date())
}

function WelcomeHero({ name, role, isSuperAdmin, className }: WelcomeHeroProps) {
  const greeting = greetingFromHour()
  const displayName = name?.split(" ")[0] || "Operator"
  const [dateTime, setDateTime] = React.useState("")

  React.useEffect(() => {
    setDateTime(formatDateTime())
  }, [])

  return (
    <div
      data-slot="welcome-hero"
      // v6: container queries — adapts to the dashboard-content container width
      // rather than the viewport. md:flex-row → @md:flex-row.
      className={cn(
        "relative flex flex-col gap-1 @md:flex-row @md:items-end @md:justify-between",
        "bg-foreground text-background tac-scanline overflow-hidden pt-12 pb-24 px-6 @md:px-10 border-b-2 border-border",
        "-mx-5 @sm:-mx-8 @lg:-mx-10 -mt-6 @lg:-mt-8",
        className
      )}
    >
      {/* v6: tokenized violet gradient (was inline from-primary/20) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, var(--overlay-primary-medium) 0%, transparent 60%)",
        }}
      />
      {/* v6: subtle top-edge highlight for premium inner-border feel */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--overlay-primary-strong), transparent)",
        }}
      />

      <AnimatedGroup stagger={0.07} className="relative z-10 flex flex-col gap-0.5">
        {/* Mission control greeting */}
        <AnimatedGroupItem distance={8} duration={0.45}>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-1.5 h-1.5 bg-accent-success tac-blink" aria-hidden="true" />
            <p className="t-mono-sm text-accent-success uppercase tracking-widest">
              {greeting}
            </p>
          </div>
        </AnimatedGroupItem>

        {/* Hero headline — v6: text-glow-primary on dark mode for premium hero treatment */}
        <AnimatedGroupItem distance={14} duration={0.5}>
          <h1 className={cn("t-display tracking-tighter text-background dark:text-glow-primary")}>
            {displayName}
          </h1>
        </AnimatedGroupItem>

        {/* Caption */}
        {dateTime && (
          <AnimatedGroupItem distance={6} duration={0.4}>
            <p className="t-caption text-muted mt-0.5">{dateTime}</p>
          </AnimatedGroupItem>
        )}
      </AnimatedGroup>

      {/* Role badge */}
      <AnimatedGroup stagger={0} className="relative z-10 hidden @md:flex items-center gap-2 shrink-0 pb-1">
        <AnimatedGroupItem distance={0} duration={0.4}>
          {/* v6: tac-hover-lift on the role badge (multi-axis hover signal) */}
          <div className="flex items-center gap-1.5 border border-muted/30 bg-background/40 px-3 py-1.5 tac-hover-lift">
            {isSuperAdmin ? (
              <RiShieldCheckLine className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            ) : (
               <RiUserLine className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            )}
            <span className="t-mono-sm text-muted uppercase tracking-wider">
              {role ?? "GUEST"}
            </span>
          </div>
        </AnimatedGroupItem>
      </AnimatedGroup>
    </div>
  )
}

export { WelcomeHero }
