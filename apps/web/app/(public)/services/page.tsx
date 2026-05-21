import type { Metadata } from "next"
import Link from "next/link"
import {
  RiPlaneLine,
  RiShipLine,
  RiTruckLine,
  RiBuildingLine,
  RiPassportLine,
  RiArrowRightSLine,
} from "@workspace/ui/icons"

export const metadata: Metadata = {
  title: "Services — TAC Express",
  description:
    "Air freight, surface freight, warehousing, and customs clearance — engineered for the North-East corridor.",
}

const SERVICES = [
  {
    slug: "air",
    name: "Air freight",
    icon: RiPlaneLine,
    blurb:
      "Same-day and next-flight-out across 8 metros. Dedicated belly-cargo allocations on IMP, GAU, AGT, IXA legs.",
    bullets: ["Cut-off as late as 21:00", "Live tracking from acceptance to belly", "Customs-bonded handling on demand"],
  },
  {
    slug: "road",
    name: "Surface freight",
    icon: RiTruckLine,
    blurb:
      "FTL and part-load with GPS-tracked vehicles. Tier-1 to Tier-3 reach without contractor handoff.",
    bullets: ["Sealed FTL with epad signatures", "Live ETA powered by route telemetry", "POD photo + e-signature"],
  },
  {
    slug: "ocean",
    name: "Ocean freight",
    icon: RiShipLine,
    blurb: "FCL and LCL through Kolkata, Chennai, and Nhava Sheva. Reefer-ready for perishables.",
    bullets: ["Carrier-agnostic booking", "Pre-shipment customs prep", "End-to-end visibility per container"],
  },
  {
    slug: "warehousing",
    name: "Warehousing & 3PL",
    icon: RiBuildingLine,
    blurb: "Inventory hosted at TAC hubs with bin-level scanning and per-SKU SLAs.",
    bullets: ["WMS with API + webhooks", "Daily cycle counts", "Pick-pack-ship with photo audit"],
  },
  {
    slug: "customs",
    name: "Customs & compliance",
    icon: RiPassportLine,
    blurb:
      "Licensed brokerage for AEO clients, hazmat, DGFT certification handling. Paper-light, zero last-mile surprises.",
    bullets: ["AEO-T1 broker network", "E-Way Bill automation", "Document vault per shipment"],
  },
]

export default function ServicesPage() {
  return (
    <div className="bg-background">
      <section className="border-b border-border bg-card px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <p className="tac-mono-label">03 / Services</p>
          <h1 className="mt-3 text-balance text-4xl font-bold md:text-6xl">
            One platform. Five service tracks. Zero handoff drama.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Mix any combination — air for the urgent leg, surface for the bulk, ocean for the cost. Every
            shipment lives in the same control tower.
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {SERVICES.map((svc) => (
            <Link
              key={svc.slug}
              href={`/services/${svc.slug}`}
              className="tac-fui-panel group flex flex-col p-6 tac-fui-hover"
            >
              <div className="flex items-start justify-between">
                <svc.icon className="size-8 text-primary" aria-hidden="true" />
                <RiArrowRightSLine className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-2xl font-bold">{svc.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{svc.blurb}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {svc.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    <span aria-hidden className="inline-block size-1.5 bg-primary" />
                    {b}
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
