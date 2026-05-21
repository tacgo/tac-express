"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@workspace/ui/lib/utils"

/* ─────────────────────────────────────────────────────────────────────────
   AnimatedText — entrance animation wrapper for premium text moments.
   Uses motion/react (LAW 3 compliant). Respects prefers-reduced-motion.
   ───────────────────────────────────────────────────────────────────────── */

const SPRING_EASE = [0.16, 1, 0.3, 1] as const

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
type TextTag = "p" | "span" | "div" | "li"
type Tag = HeadingTag | TextTag

interface AnimatedTextProps {
  children: React.ReactNode
  as?: Tag
  /** Entrance direction — vertical (default) or horizontal */
  direction?: "up" | "down" | "left" | "right" | "fade"
  /** Offset in px for the slide distance (default: 12) */
  distance?: number
  /** Delay in seconds before entrance begins */
  delay?: number
  /** Duration in seconds (default: 0.5) */
  duration?: number
  className?: string
}

function AnimatedText({
  children,
  as: Tag = "div",
  direction = "up",
  distance = 12,
  delay = 0,
  duration = 0.5,
  className,
}: AnimatedTextProps) {
  const shouldReduceMotion = useReducedMotion()

  const initialOffset = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    fade: {},
  }[direction]

  const initial = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, ...initialOffset }

  const animate = shouldReduceMotion
    ? { opacity: 1 }
    : { opacity: 1, x: 0, y: 0 }

  const MotionTag = motion[Tag as keyof typeof motion] as typeof motion.div

  return (
    <MotionTag
      data-slot="animated-text"
      className={cn(className)}
      initial={initial}
      animate={animate}
      transition={{
        duration: shouldReduceMotion ? 0.2 : duration,
        delay,
        ease: SPRING_EASE,
      }}
    >
      {children}
    </MotionTag>
  )
}

/**
 * AnimatedGroup — stagger children with sequential delays.
 * Wrap sibling AnimatedText elements that should enter together.
 */
function AnimatedGroup({
  children,
  stagger = 0.08,
  className,
}: {
  children: React.ReactNode
  stagger?: number
  className?: string
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      data-slot="animated-group"
      className={cn(className)}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: shouldReduceMotion ? 0 : stagger,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

/**
 * AnimatedGroupItem — child of AnimatedGroup. Inherits stagger timing.
 */
function AnimatedGroupItem({
  children,
  className,
  distance = 12,
  duration = 0.5,
}: {
  children: React.ReactNode
  className?: string
  distance?: number
  duration?: number
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      data-slot="animated-group-item"
      className={cn(className)}
      variants={{
        hidden: { opacity: 0, y: shouldReduceMotion ? 0 : distance },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration, ease: SPRING_EASE },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export { AnimatedText, AnimatedGroup, AnimatedGroupItem }
