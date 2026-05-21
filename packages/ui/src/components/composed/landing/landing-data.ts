import type { IconName } from "@workspace/ui/icons"

/**
 * Landing content model — single source of truth for the public landing page.
 *
 * All copy / stats / FAQ live here as typed data (mirrors the section-data
 * pattern the page is composed from). Components read from this module; they
 * never inline copy. Keeping content out of the JSX keeps the section
 * components purely presentational and makes the data contract testable
 * (see landing-data.test.ts).
 *
 * Voice: TAC Express — North-East India logistics. Mission-control, precise,
 * built for tea growers, handicraft cooperatives, defense contractors, and
 * e-commerce sellers across the eight North-East states.
 */

// ── Hero ──────────────────────────────────────────────────────────────────

export interface HeroStat {
  label: string
  value: string
  /** "success" tints the value with the success gradient; omit for neutral. */
  tone?: "success"
}

export const heroContent = {
  eyebrow: "TAC LOGISTICS FRAMEWORK · NE CORRIDOR",
  title: "Cargo through the corridor nobody else maps.",
  subtitle:
    "Real-time telematics, predictive routing, and high-security freight forwarding across the eight North-East states — the network behind tea growers, cooperatives, and e-commerce sellers.",
  primaryCta: { label: "Get a quote", href: "/quote" },
  secondaryCta: { label: "Track a shipment", href: "/track" },
  image: {
    src: "/images/tac-truck-hero.webp",
    alt: "TAC Express logistics truck on a North-East India route",
  },
  stats: [
    { label: "On-time rate", value: "98.7%", tone: "success" },
    { label: "Lanes active", value: "47" },
    { label: "Avg transit", value: "2.4 days" },
    { label: "Operating hubs", value: "12" },
  ] satisfies HeroStat[],
} as const

// ── Partner / sector strip (social proof marquee) ───────────────────────────

export interface PartnerSector {
  icon: IconName
  name: string
}

export const partnerStripContent = {
  label: "Moving the North-East corridor",
  sectors: [
    { icon: "truck", name: "Surface Freight" },
    { icon: "plane", name: "Air Cargo" },
    { icon: "warehouse", name: "E-commerce" },
    { icon: "package", name: "Handicraft Co-ops" },
    { icon: "money", name: "COD Settlement" },
    { icon: "customer", name: "24/7 Ops Desk" },
  ] satisfies PartnerSector[],
} as const

// ── §2 Why TAC (feature trio) ───────────────────────────────────────────────

export interface WhyFeature {
  icon: IconName
  title: string
  text: string
}

export const whyContent = {
  overlineLead: "Why",
  overlineAccent: "TAC Express",
  heading: "Engineered for the routes other carriers treat as a footnote.",
  features: [
    {
      icon: "scan",
      title: "Real-time telematics",
      text: "Every vehicle reports position, speed, and ETA on a 10-second uplink — no dark legs across the corridor.",
    },
    {
      icon: "map",
      title: "Predictive routing",
      text: "Weather, road, and checkpoint data reroute cargo before a delay on one leg compounds into a missed SLA.",
    },
    {
      icon: "shield",
      title: "High-security freight",
      text: "Chain-of-custody scanning from pickup to delivery, built for defense contractors and high-value cargo.",
    },
  ] satisfies WhyFeature[],
} as const

// ── §3 Network reach (animated counters) ────────────────────────────────────

export interface ReachStat {
  /** Numeric target the counter animates to. */
  value: number
  /** Decimal places to render (0 for integers). */
  decimals: number
  prefix?: string
  suffix?: string
  label: string
}

export const reachContent = {
  heading: "A corridor network, instrumented end to end.",
  stats: [
    { value: 12, decimals: 0, label: "Operating hubs" },
    { value: 8, decimals: 0, label: "North-East states" },
    { value: 47, decimals: 0, label: "Active lanes" },
    { value: 98.7, decimals: 1, suffix: "%", label: "On-time delivery" },
  ] satisfies ReachStat[],
} as const

// ── §4 Ops pipeline (how it works) ──────────────────────────────────────────

export interface PipelineStep {
  step: string
  icon: IconName
  title: string
  text: string
}

export const pipelineContent = {
  overlineLead: "How it",
  overlineAccent: "works",
  heading: "One booking. Full custody. Proof at every hop.",
  steps: [
    {
      step: "01",
      icon: "calculator",
      title: "Book",
      text: "Get an instant rate and an AWB for any corridor lane in seconds.",
    },
    {
      step: "02",
      icon: "package",
      title: "Pickup",
      text: "Doorstep collection with barcode chain-of-custody from the first scan.",
    },
    {
      step: "03",
      icon: "truck",
      title: "In transit",
      text: "Live telematics and predictive ETA on every leg, hub to hub.",
    },
    {
      step: "04",
      icon: "checkCircle",
      title: "Delivered",
      text: "Electronic proof of delivery and instant reconciliation on arrival.",
    },
  ] satisfies PipelineStep[],
} as const

// ── §5 Platform CTA band ────────────────────────────────────────────────────

export const platformContent = {
  heading: "Built on a logistics-grade control plane.",
  text: "The same telematics, exception ledger, and SLA engine that runs our corridor are the surface you book and track on.",
  ctaLabel: "Get a quote",
  ctaHref: "/quote",
} as const

// ── §6 Control tower (telemetry + feature list) ─────────────────────────────

export interface ControlFeature {
  icon: IconName
  title: string
}

export const controlTowerContent = {
  overlineLead: "Control",
  overlineAccent: "tower",
  heading: "Every shipment, on one screen.",
  text: "Stop stitching together calls, spreadsheets, and screenshots. The control tower puts custody, location, and money in a single live view.",
  features: [
    { icon: "listCheck", title: "Centralized exception ledger" },
    { icon: "barChart", title: "Lane-level SLA monitoring" },
    { icon: "invoice", title: "e-POD and invoice in one view" },
  ] satisfies ControlFeature[],
  /** Live readouts rendered in the telemetry panel (right column). */
  telemetry: [
    { label: "LANE", value: "DEL → IMF" },
    { label: "SPEED", value: "62 km/h" },
    { label: "ETA", value: "04:12:38" },
    { label: "CUSTODY", value: "SEALED" },
  ],
} as const

// ── §7 Capabilities checklist ───────────────────────────────────────────────

export const capabilitiesContent = {
  overlineLead: "Full-stack",
  overlineAccent: "logistics",
  heading: "Everything the corridor demands, in one operator.",
  text: "From first-mile pickup to cash reconciliation — no handoffs to third parties who don't know the terrain.",
  items: [
    "Real-time GPS telematics",
    "Predictive ETA on every leg",
    "Chain-of-custody scanning",
    "Cash-on-delivery reconciliation",
    "Road · air · surface multi-modal",
    "Defense-grade security protocols",
    "API & webhook integration",
    "Dedicated North-East corridor desk",
  ],
} as const

// ── §8 Support & resources ──────────────────────────────────────────────────

export interface SupportCard {
  icon: IconName
  title: string
  text: string
}

export const supportContent = {
  overlineLead: "Always by",
  overlineAccent: "your side",
  heading: "Operators, partners, and an API — wherever your cargo is.",
  cards: [
    {
      icon: "customer",
      title: "24/7 Ops Desk",
      text: "Talk to a corridor controller any hour, on any lane — not a script-reading call centre.",
    },
    {
      icon: "team",
      title: "Partner network",
      text: "1,200+ vetted pickup and last-mile partners across the eight North-East states.",
    },
    {
      icon: "terminal",
      title: "Developer API",
      text: "Integrate tracking, rate quotes, and label generation in a single working day.",
    },
  ] satisfies SupportCard[],
} as const

// ── §9 FAQ ──────────────────────────────────────────────────────────────────

export interface FaqItem {
  question: string
  answer: string
}

export const faqContent = {
  overline: "Popular questions",
  heading: "Everything you need before the first pickup.",
  subheading: "Straight answers on coverage, custody, and settlement across the corridor.",
  items: [
    {
      question: "Which areas does TAC Express cover?",
      answer:
        "All eight North-East states — Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, and Tripura — plus the New Delhi feeder corridor, through 12 operating hubs.",
    },
    {
      question: "How do I track a shipment?",
      answer:
        "Enter your AWB or cargo ID in the tracker at the top of this page. You'll see live location, current custody status, and a predictive ETA for every remaining leg.",
    },
    {
      question: "Do you handle cash-on-delivery?",
      answer:
        "Yes. COD is collected at the doorstep and reconciled automatically against your invoices, with settlement reporting available through the dashboard and API.",
    },
    {
      question: "Is my cargo secure in transit?",
      answer:
        "Every shipment is scanned at each custody hop and tracked on a 10-second telematics uplink. Defense-grade protocols and sealed-custody handling are available for high-value freight.",
    },
    {
      question: "Can I integrate TAC Express with my systems?",
      answer:
        "Our API and webhooks expose tracking, rate quotes, and label generation. Most e-commerce and ERP integrations are live within a single working day.",
    },
    {
      question: "How fast is delivery across the corridor?",
      answer:
        "Average corridor transit is 2.4 days with a 98.7% on-time rate. Exact transit depends on the lane — request a quote for a guaranteed window on your route.",
    },
  ] satisfies FaqItem[],
} as const
