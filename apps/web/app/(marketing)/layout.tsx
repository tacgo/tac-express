import type { Metadata } from "next"
import type { ReactNode } from "react"
import { siteUrl } from "@/lib/site-url"
import { V2Nav } from "./_components/nav"
import { V2Footer } from "./_components/footer"

// All three fonts (Outfit · IBM Plex Mono · Noto Serif) are loaded by the
// root layout via next/font and set on <html>. No additional font load needed.

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
    <>
      <V2Nav />
      <main>{children}</main>
      <V2Footer />
    </>
  )
}
