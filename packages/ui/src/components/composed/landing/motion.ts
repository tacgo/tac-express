import type { Variants } from "motion/react"

/**
 * Shared motion vocabulary for the landing sections.
 *
 * `EASE_SMOOTH` mirrors --ease-smooth in globals.css (the branded marketing
 * cadence). The reveal variants replace the template's framer-motion
 * slide-ins with motion/react `whileInView` choreography (LAW 3). Every
 * consumer pairs these with `viewport={{ once: true }}` so a section animates
 * in once on scroll — and `prefers-reduced-motion` is honored globally by
 * globals.css plus motion's own reduced-motion handling.
 */
export const EASE_SMOOTH = [0.4, 0, 0.2, 1] as const

/** Rise + fade — the default section-entrance reveal. */
export const revealUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_SMOOTH } },
}

/** Enter from the left — paired with `revealRight` for two-column splits. */
export const revealLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE_SMOOTH } },
}

/** Enter from the right. */
export const revealRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE_SMOOTH } },
}

/** Parent container that staggers its children's reveal. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}

/** Child item for use under `staggerParent`. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_SMOOTH } },
}
