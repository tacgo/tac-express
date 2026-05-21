import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

interface MarqueeProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Reverse animation direction */
  reverse?: boolean
  /** Pause animation on hover */
  pauseOnHover?: boolean
  /** Number of duplications for seamless loop (default: 4) */
  repeat?: number
  /** Animation duration in seconds (default: 40) */
  duration?: number
  /** Vertical scroll instead of horizontal */
  vertical?: boolean
  children: React.ReactNode
}

/**
 * Marquee — CSS-only infinite scroll ticker.
 * Global @keyframes live in globals.css. No framer-motion.
 * Uses CSS variable --duration for speed control.
 */
export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  duration = 40,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      data-slot="marquee"
      className={cn(
        "group flex gap-(--gap) overflow-hidden p-2 [--gap:1rem]",
        vertical ? "flex-col" : "flex-row",
        pauseOnHover && "pause-on-hover",
        className
      )}
      style={{
        ["--duration" as string]: `${duration}s`,
        ["--gap" as string]: `1rem`,
      } as React.CSSProperties}
    >
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            data-slot="marquee-content"
            className={cn("flex shrink-0 justify-around gap-(--gap)", {
              "animate-marquee-x flex-row": !vertical,
              "animate-marquee-y flex-col": vertical,
              "animate-reverse": reverse,
            })}
          >
            {children}
          </div>
        ))}
    </div>
  )
}
