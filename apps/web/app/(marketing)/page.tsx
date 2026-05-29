import { siteUrl } from "@/lib/site-url"
import { V2Hero } from "./_components/hero"
import { V2Stats, V2Services, V2Cod, V2Network, V2Pricing, V2Workflow, V2Testimonials, V2Cta } from "./_components/sections"

/**
 * Canonical public landing (`/`) — the editorial-minimal marketing experience,
 * isolated from the operational design system (own `--v2-*` tokens / fonts /
 * motion, scoped under `.landing-v2`; see docs/LANDING-V2-POLICY.md). Promoted
 * from the former `/v2` route; replaces the retired Violet Grid V1 landing.
 */

// schema.org/Organization JSON-LD — carried over from the retired V1 `/` so the
// logistics-search SERP result keeps its region anchor (the eight NE states).
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TAC Express",
  url: siteUrl,
  logo: `${siteUrl}/images/tac-truck-hero.webp`,
  description:
    "TAC Express moves cargo through the corridor most logistics companies treat as a footnote — the North-East of India. The network behind tea growers, handicraft cooperatives, defense contractors, and e-commerce sellers.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Imphal",
    addressRegion: "Manipur",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91 385 244 6500",
    email: "hello@tacexpress.in",
    contactType: "customer service",
    availableLanguage: ["en"],
  },
  areaServed: [
    { "@type": "State", name: "Assam" },
    { "@type": "State", name: "Arunachal Pradesh" },
    { "@type": "State", name: "Manipur" },
    { "@type": "State", name: "Meghalaya" },
    { "@type": "State", name: "Mizoram" },
    { "@type": "State", name: "Nagaland" },
    { "@type": "State", name: "Sikkim" },
    { "@type": "State", name: "Tripura" },
  ],
} as const

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Build-time constant, no user input — XSS surface closed.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <V2Hero />
      <V2Stats />
      <V2Services />
      <V2Cod />
      <V2Network />
      <V2Pricing />
      <V2Workflow />
      <V2Testimonials />
      <V2Cta />
    </>
  )
}
