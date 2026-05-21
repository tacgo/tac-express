import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import {
  RiPlaneLine,
  RiShipLine,
  RiTruckLine,
  RiBuildingLine,
  RiPassportLine,
  RiArrowRightLine,
} from "@workspace/ui/icons"

const SERVICES = {
  air: {
    icon: RiPlaneLine,
    title: "Air Freight",
    tagline: "Belly-cargo on every metro flight, plus dedicated freighters on the North-East corridor.",
    description:
      "TAC Express runs daily belly-cargo allocations on the IMP-DEL-BOM and GAU-CCU-MAA spokes. Cut-off as late as 21:00 for next-day delivery. Customs-bonded handling on request.",
    sla: "Same-day delivery on metro pairs · Next-flight-out for time-critical cargo",
    cutoff: "21:00 IST domestic / 18:00 IST international",
  },
  road: {
    icon: RiTruckLine,
    title: "Surface Freight",
    tagline: "FTL and part-load across 14 states. Sealed vehicles. Live GPS. Photo POD on every drop.",
    description:
      "Our surface fleet bridges the Tier-1 to Tier-3 reach gap with GPS-tracked vehicles, sealed compartments, and electronic POD on every consignment. No contractor handoff — every truck is on our manifest.",
    sla: "1.5 days metro-to-metro · 2.5 days metro-to-Tier-2 · 4 days remote",
    cutoff: "Daily 17:00 IST",
  },
  ocean: {
    icon: RiShipLine,
    title: "Ocean Freight",
    tagline: "FCL and LCL through three gateway ports. Reefer-ready. Carrier-agnostic.",
    description:
      "Containerised exports through Kolkata, Chennai, and Nhava Sheva. Reefer-ready for perishables. Carrier-agnostic booking — we route by transit time and rate, not by carrier loyalty.",
    sla: "12-day Kolkata → Singapore · 28-day Mumbai → Rotterdam (FCL)",
    cutoff: "Per sailing schedule — published weekly",
  },
  warehousing: {
    icon: RiBuildingLine,
    title: "Warehousing & 3PL",
    tagline: "Inventory hosted at TAC hubs. Bin-level scanning. WMS with first-class API.",
    description:
      "10 hubs across India act as your fulfillment infrastructure. Bin-level inventory, WMS with API + webhooks, daily cycle counts, pick-pack-ship with photo audit on every order.",
    sla: "Same-day pick-pack-ship · 99.95% inventory accuracy",
    cutoff: "Order cut-off configurable per SKU",
  },
  customs: {
    icon: RiPassportLine,
    title: "Customs & Compliance",
    tagline: "Licensed brokerage. AEO-T1 capable. Document vault per shipment.",
    description:
      "Customs clearance with AEO-T1 broker network across major ICDs. E-Way Bill automation, hazmat handling, DGFT certification, and a per-shipment document vault that survives auditors and audits.",
    sla: "Standard clearance: 36 hrs · Express: 8 hrs (where AEO eligible)",
    cutoff: "Document submission 24 hrs before vessel/flight",
  },
} as const

type Slug = keyof typeof SERVICES

export function generateStaticParams() {
  return Object.keys(SERVICES).map((slug) => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const svc = SERVICES[params.slug as Slug]
  if (!svc) return { title: "Service not found" }
  return {
    title: `${svc.title} — TAC Express`,
    description: svc.tagline,
  }
}

export default function ServicePage({ params }: { params: { slug: string } }) {
  const svc = SERVICES[params.slug as Slug]
  if (!svc) notFound()
  const Icon = svc.icon

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-card px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <p className="tac-mono-label">Services / {params.slug}</p>
          <div className="mt-4 flex items-start gap-6">
            <div className="flex size-16 shrink-0 items-center justify-center border-2 border-primary bg-primary/10">
              <Icon className="size-8 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-balance text-4xl font-bold md:text-6xl">{svc.title}</h1>
              <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{svc.tagline}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6 text-base leading-relaxed text-foreground">
            <p>{svc.description}</p>
          </div>
          <aside className="space-y-4">
            <div className="tac-fui-panel border-l-2 border-l-primary p-4">
              <p className="tac-mono-label">SLA</p>
              <p className="mt-1 text-sm text-foreground">{svc.sla}</p>
            </div>
            <div className="tac-fui-panel border-l-2 border-l-accent-warning p-4">
              <p className="tac-mono-label">Cut-off</p>
              <p className="mt-1 text-sm text-foreground">{svc.cutoff}</p>
            </div>
            <Link
              href="/quote"
              className="inline-flex items-center gap-2 border-2 border-primary bg-primary px-4 py-2 font-medium text-primary-foreground tac-fui-hover"
            >
              Get a rate
              <RiArrowRightLine className="size-4" aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </section>
    </div>
  )
}
