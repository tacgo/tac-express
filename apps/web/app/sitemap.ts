import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/site-url"

// PL-1 closeout (docs/launch/product-launch-readiness.md § C.1 + OD-P7 = both).
// The MVP-carve set per OD-P5: landing + about + pricing + contact + quote +
// legal × 3. `/track` is dynamic-only (`/track/[awb]`) — no static index
// route exists, so it is intentionally omitted from the sitemap. The set
// matches the index that PublicNav advertises to a real visitor.
//
// Stale dates would actively mislead crawlers, so each entry uses the build
// date (lastModified is bound at request time inside the function body,
// keeping the value fresh per deploy without committing a timestamp).

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const url = (path: string) => `${siteUrl}${path}`

  return [
    { url: url("/"),               lastModified, changeFrequency: "weekly",  priority: 1.0 },
    { url: url("/about"),          lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: url("/pricing"),        lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: url("/contact"),        lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: url("/quote"),          lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: url("/legal/privacy"),  lastModified, changeFrequency: "yearly",  priority: 0.3 },
    { url: url("/legal/terms"),    lastModified, changeFrequency: "yearly",  priority: 0.3 },
    { url: url("/legal/cookies"),  lastModified, changeFrequency: "yearly",  priority: 0.3 },
  ]
}
