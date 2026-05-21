import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/site-url"

// PL-1 closeout. OD-P7 = both (organic + outreach-linked), so this surface
// MUST be reachable by crawlers — Allow everything except the operator
// auth + dashboard paths, which are noindex'd by their own page-level
// metadata blocks and which crawlers shouldn't waste budget on.
//
// The sitemap pointer below is what tells the crawler where the canonical
// URL list lives — without it, sitemap discovery becomes a guess.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/sign-in", "/sign-up", "/dashboard"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
