"use client"

import * as React from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"

/* ── Inline icon set (no lucide — LAW 2 stays satisfied; v2 owns its icons) ── */
const PATHS: Record<string, React.ReactNode> = {
  arrow: <path d="M5 12h13M13 6l6 6-6 6" />,
  arrowUpRight: <path d="M7 17 17 7M8 7h9v9" />,
  truck: (
    <>
      <path d="M3 6h11v9H3zM14 9h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17.5" cy="18" r="1.6" />
    </>
  ),
  plane: <path d="M10.5 13.5 3 11l1-2 7 1 4-6 2 1-2 7 4 4-1 2-5-3-2 5-2-1z" />,
  box: <path d="M12 3 4 7v10l8 4 8-4V7zM4 7l8 4 8-4M12 11v10" />,
  shield: <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6zM9.5 12l2 2 3.5-4" />,
  coins: (
    <>
      <ellipse cx="9" cy="7" rx="6" ry="3" />
      <path d="M3 7v5c0 1.7 2.7 3 6 3M15 11.5c3.3 0 6 1.3 6 3s-2.7 3-6 3-6-1.3-6-3" />
      <path d="M9 12v5" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
      <path d="M8 6h6a4 4 0 0 1 0 8H10a4 4 0 0 0 0 8" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  play: <path d="M8 5v14l11-7z" />,
  check: <path d="M5 12.5 10 17l9-10" />,
  pin: <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />,
}

export type V2IconName = keyof typeof PATHS

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: V2IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name]}
    </svg>
  )
}

/* ── Scroll reveal (standalone motion system) ── */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* ── Button (Link or button), v2 styles only ── */
type V2ButtonProps = {
  href?: string
  variant?: "accent" | "ghost"
  className?: string
  children: React.ReactNode
  onClick?: () => void
}

export function V2Button({ href, variant = "accent", className, children, onClick }: V2ButtonProps) {
  const cls = `v2-btn ${variant === "accent" ? "v2-btn-accent" : "v2-btn-ghost"}${className ? ` ${className}` : ""}`
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  )
}
