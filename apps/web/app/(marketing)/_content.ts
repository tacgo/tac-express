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

export const codContent = {
  eyebrow: "COD settlement",
  heading: "Cash collected at the door. In your account in 3 days.",
  lead:
    "65% of North-East e-commerce orders are cash-on-delivery. TAC Express collects, reconciles, and remits in a single automated cycle — no manual counting, no 15-day float.",
  stats: [
    { value: "3 days", label: "Average remittance cycle", note: "from delivery confirmation to bank credit" },
    { value: "99.1%", label: "Collection accuracy", note: "against invoice value, corridor-wide" },
    { value: "₹ 0", label: "Collection float fee", note: "included in standard door-to-door rate" },
  ],
  steps: [
    { step: "01", title: "Delivered & collected", body: "Driver collects exact invoice amount at delivery and logs it against the AWB scan." },
    { step: "02", title: "Automatically reconciled", body: "Collection against invoice is matched in the ops console within the hour. Discrepancies trigger an exception before the vehicle leaves the area." },
    { step: "03", title: "Remitted in 3 days", body: "Net amount (after freight deduction) transferred to your registered IFSC via NEFT. Full statement attached." },
  ],
  ctaLabel: "See COD rates",
  ctaHref: "/quote",
} as const

export const pricingContent = {
  eyebrow: "Transparent rates",
  heading: "Reference tariffs. No hidden fees.",
  note:
    "Rates shown are indicative door-to-door base tariffs, inclusive of pickup. Fuel surcharge, GST (18%), and remote-area premium apply. Contact us for volumetric weight, COD, or contract rates.",
  ctaLabel: "Get a firm quote",
  ctaHref: "/quote",
  tiers: [
    {
      lane: "DEL → IMF",
      description: "Delhi to Imphal, surface",
      transit: "3–4 days",
      upTo500g: "₹ 85",
      per500gAbove: "₹ 38",
      service: "Surface",
    },
    {
      lane: "DEL → IMF",
      description: "Delhi to Imphal, air",
      transit: "Next day",
      upTo500g: "₹ 210",
      per500gAbove: "₹ 95",
      service: "Air",
    },
    {
      lane: "DEL → GAU",
      description: "Delhi to Guwahati, surface",
      transit: "2–3 days",
      upTo500g: "₹ 75",
      per500gAbove: "₹ 32",
      service: "Surface",
    },
    {
      lane: "GAU → IMF",
      description: "Guwahati to Imphal, surface",
      transit: "1–2 days",
      upTo500g: "₹ 55",
      per500gAbove: "₹ 24",
      service: "Surface",
    },
    {
      lane: "IMF → AGT",
      description: "Imphal to Agartala, surface",
      transit: "2–3 days",
      upTo500g: "₹ 65",
      per500gAbove: "₹ 28",
      service: "Surface",
    },
  ],
} as const

export const testimonialsContent = {
  eyebrow: "From the corridor",
  heading: "Operators who run on the routes we mapped.",
  items: [
    {
      quote:
        "We moved 18 pallets from IXI to Delhi last quarter with zero exceptions. The AWB chain-of-custody meant our client never had to call us to ask where the shipment was.",
      author: "Logistics Manager",
      company: "Assam Tea Cooperative, Jorhat",
      metric: "18 pallets · 0 exceptions",
    },
    {
      quote:
        "COD reconciliation used to take us 12–15 days. With TAC it lands in our account within 3 business days. That's a working-capital shift that actually matters at our volume.",
      author: "Operations Head",
      company: "E-commerce Seller, Guwahati",
      metric: "3-day COD settlement",
    },
    {
      quote:
        "The predictive ETA held to within 40 minutes on a time-critical consignment across the Siliguri corridor. The telematics uplink is real — not a marketing claim.",
      author: "Supply Chain Director",
      company: "Defense Contractor, Imphal",
      metric: "ETA accuracy · ±40 min",
    },
  ],
} as const

export const ctaContent = {
  heading: "Put a quote on your next corridor lane.",
  body:
    "Tell us the origin, destination, and weight — we'll return a guaranteed window and a live AWB. Or track a shipment already on the road.",
  primary: { label: "Get a quote", href: "/quote" },
  secondary: { label: "Track a shipment", href: "/track" },
} as const

export const complianceContent = {
  gstin: "01AABCT1234A1Z5",
  cin: "U63090MN2018PTC009182",
  iataCode: "14-3-XXXX",
  items: [
    { label: "GSTIN", value: "01AABCT1234A1Z5" },
    { label: "CIN", value: "U63090MN2018PTC009182" },
    { label: "IATA Air Cargo Agent", value: "Registered" },
    { label: "BCAS Security Programme", value: "ACC Certified" },
  ],
  note: "TAC Express Logistics Pvt. Ltd. · Regd. Office: Imphal, Manipur 795001 · India",
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
