import type { Metadata } from "next"
import { LandingPage } from "@workspace/ui/components/composed/landing"
import { siteUrl } from "@/lib/site-url"

// PL-1 (docs/launch/product-launch-readiness.md § C.1) — the landing is the
// most-shared and most-search-indexed URL. Without these tags every social
// share and SERP result rendered as "Home" with no preview, which actively
// undermines credibility. Per § C.1's testable-done criterion: title /
// description / openGraph / twitter are all non-empty here.
//
// PL-1 closeout (OD-P7 = both): JSON-LD structured data rendered below +
// app/sitemap.ts + app/robots.ts complete the depth requirement on top of
// the metadata floor shipped in PR #164.
//
// `metadataBase` resolves relative `/images/...` URLs into absolute URLs
// in the OG/Twitter payload. The shared `siteUrl` helper validates
// NEXT_PUBLIC_SITE_URL at the env-var boundary (see lib/site-url.ts) so all
// three SEO surfaces (metadata · sitemap · robots) build their absolute
// URLs from the same source.

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "TAC Express — North-East India logistics, built for the routes nobody else maps",
  description:
    "TAC Express moves cargo through the corridor most logistics companies treat as a footnote. The network behind tea growers, handicraft cooperatives, defense contractors, and e-commerce sellers across the North-East.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "TAC Express",
    url: "/",
    title: "TAC Express — North-East India logistics",
    description:
      "Cargo through the corridor most logistics companies treat as a footnote. Built for tea growers, handicraft cooperatives, defense contractors, and e-commerce sellers across the North-East.",
    images: [
      {
        url: "/images/tac-truck-hero.webp",
        width: 1200,
        height: 630,
        alt: "TAC Express logistics truck on a North-East India route",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TAC Express — North-East India logistics",
    description:
      "Cargo through the corridor most logistics companies treat as a footnote. Built for the routes nobody else maps.",
    images: ["/images/tac-truck-hero.webp"],
  },
}

// schema.org/Organization JSON-LD. Floor depth: name / url / logo /
// description / contactPoint / areaServed. The `areaServed` array names the
// eight North-East India states the about page lists as the corridor —
// this is what gives a logistics-search SERP result a region anchor.
//
// Real contact + HQ address are mirrored from apps/web/app/(public)/contact
// so the structured data and the rendered Contact page never disagree.
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
    email: "hello@tacexpress.com",
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

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // Next.js recommends inline JSON-LD via dangerouslySetInnerHTML
        // for App Router; the payload is a build-time constant — no
        // user-controlled input — so the XSS surface is closed.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <LandingPage />
    </>
  )
}
