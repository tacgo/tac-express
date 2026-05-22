/**
 * Landing v2 — content model. All copy is hand-written for TAC Express:
 * North-East corridor logistics, custody, tracking, settlement. No placeholder,
 * no lorem, no invented metrics — the figures mirror the canonical numbers used
 * across the site (about page, JSON-LD, the v1 landing).
 */

export const navContent = {
  brand: "TAC EXPRESS",
  links: [
    { label: "Network", href: "#network" },
    { label: "Operations", href: "#operations" },
    { label: "Tracking", href: "#tracking" },
    { label: "Company", href: "/about" },
  ],
  primary: { label: "Get a quote", href: "/quote" },
  secondary: { label: "Track shipment", href: "/track" },
} as const

export const heroContent = {
  eyebrow: "North-East corridor · freight forwarding",
  titleLead: "Cargo moves the way",
  titleEmphasis: "the corridor",
  titleTail: "actually works.",
  body:
    "TAC Express runs the lanes most carriers treat as a footnote — eight North-East states and the New Delhi feeder, instrumented end to end. Booking, custody, and settlement on one operational spine.",
  primary: { label: "Get a quote", href: "/quote" },
  secondary: { label: "Track a shipment", href: "/track" },
  videoSrc: "/video/hero-bg.mp4",
  videoPoster: "/images/tac-truck-hero.webp",
  caption: "Live corridor telematics · DEL → IMF",
} as const

export const statsContent = {
  eyebrow: "Measured, not promised",
  items: [
    { value: "98.7%", label: "On-time delivery", note: "rolling 90-day corridor average" },
    { value: "47", label: "Active lanes", note: "hub-to-hub, instrumented" },
    { value: "12", label: "Operating hubs", note: "across the North-East + Delhi" },
    { value: "2.4d", label: "Average transit", note: "door to door, corridor-wide" },
  ],
} as const

export const servicesContent = {
  id: "operations",
  eyebrow: "What we move",
  heading: "One operator, every leg of the corridor.",
  lead:
    "From first-mile pickup to cash reconciliation — no handoffs to third parties who don't know the terrain.",
  items: [
    {
      icon: "truck",
      title: "Surface freight",
      body: "Full- and part-load road movement across the eight North-East states, scheduled on instrumented lanes.",
    },
    {
      icon: "plane",
      title: "Air cargo",
      body: "Expedited corridor air-freight for time-critical and high-value consignments, sealed custody throughout.",
    },
    {
      icon: "box",
      title: "E-commerce fulfilment",
      body: "Doorstep pickup, barcode chain-of-custody, and last-mile delivery built for marketplace volumes.",
    },
    {
      icon: "shield",
      title: "High-security freight",
      body: "Defense-grade handling with sealed-custody protocols and a 10-second telematics uplink on every vehicle.",
    },
    {
      icon: "coins",
      title: "COD settlement",
      body: "Cash-on-delivery collected at the door and reconciled automatically against your invoices.",
    },
    {
      icon: "route",
      title: "Predictive routing",
      body: "Weather, road, and checkpoint data reroute cargo before one delayed leg compounds into a missed SLA.",
    },
  ],
} as const

export const workflowContent = {
  id: "tracking",
  eyebrow: "How a shipment runs",
  heading: "Book once. Full custody. Proof at every hop.",
  steps: [
    { step: "01", title: "Book", body: "Instant rate and an AWB for any corridor lane in seconds." },
    { step: "02", title: "Pickup", body: "Doorstep collection with barcode chain-of-custody from the first scan." },
    { step: "03", title: "In transit", body: "Live telematics and a predictive ETA on every leg, hub to hub." },
    { step: "04", title: "Delivered", body: "Electronic proof of delivery and instant reconciliation on arrival." },
  ],
} as const

export const networkContent = {
  id: "network",
  eyebrow: "The corridor",
  heading: "A network instrumented end to end.",
  lead:
    "Twelve hubs, eight North-East states, and the New Delhi feeder — every lane carrying live position, custody status, and a predictive arrival window.",
  regions: [
    "Assam",
    "Arunachal Pradesh",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Sikkim",
    "Tripura",
    "New Delhi feeder",
  ],
} as const

export const ctaContent = {
  heading: "Put a quote on your next corridor lane.",
  body:
    "Tell us the origin, destination, and weight — we'll return a guaranteed window and a live AWB. Or track a shipment already on the road.",
  primary: { label: "Get a quote", href: "/quote" },
  secondary: { label: "Track a shipment", href: "/track" },
} as const

export const footerContent = {
  brand: "TAC EXPRESS",
  blurb: "North-East India corridor logistics — engineered for the routes nobody else maps.",
  columns: [
    {
      title: "Services",
      links: [
        { label: "Surface freight", href: "/services" },
        { label: "Air cargo", href: "/services" },
        { label: "E-commerce", href: "/services" },
        { label: "COD settlement", href: "/services" },
      ],
    },
    {
      title: "Platform",
      links: [
        { label: "Track a shipment", href: "/track" },
        { label: "Get a quote", href: "/quote" },
        { label: "Service status", href: "/status" },
        { label: "Developers", href: "/developers" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Case studies", href: "/case-studies" },
        { label: "Careers", href: "/careers" },
        { label: "Contact", href: "/contact" },
      ],
    },
  ],
  legal: "© 2026 TAC Express. Imphal · Manipur · India.",
} as const
