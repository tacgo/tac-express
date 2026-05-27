import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Fraunces, Manrope } from "next/font/google"
import "./v2.css"
import { siteUrl } from "@/lib/site-url"
import { V2Nav } from "./_components/nav"
import { V2Footer } from "./_components/footer"

// Landing v2 loads its OWN fonts (editorial serif + modern sans), scoped to
// this route. It does not use the Violet Grid trio. See docs/LANDING-V2-POLICY.md.
const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--v2-font-display",
  display: "swap",
})

const body = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--v2-font-body",
  display: "swap",
})

// Canonical landing SEO (carried over from the retired V1 `/` so social shares
// + SERP results keep their preview — see docs/launch/product-launch-readiness
// § C.1). metadataBase resolves the relative OG image to an absolute URL.
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

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <div className={`landing-v2 ${display.variable} ${body.variable}`}>
      <V2Nav />
      <main>{children}</main>
      <V2Footer />
    </div>
  )
}
