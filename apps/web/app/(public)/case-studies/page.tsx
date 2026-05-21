import type { Metadata } from "next"
import { RiArrowRightLine } from "@workspace/ui/icons"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Case Studies — TAC Express",
  description: "How leading shippers cut transit time and reclaim margin with the TAC network.",
}

const STUDIES = [
  {
    slug: "manipur-tea",
    customer: "Manipur Tea Cooperative",
    metric: "−42%",
    metricLabel: "transit time",
    summary:
      "Bypassed Guwahati handoffs; same-day belly-cargo to Mumbai gave the cooperative direct access to spot-rate buyers.",
  },
  {
    slug: "northeast-handicrafts",
    customer: "North-East Handicrafts Council",
    metric: "+18%",
    metricLabel: "GMV YoY",
    summary:
      "Bulk import + COD reconciliation cut order-to-payout from 21 days to 6, freeing working capital across 230 artisans.",
  },
  {
    slug: "regional-3pl",
    customer: "ZetaShip 3PL",
    metric: "99.7%",
    metricLabel: "on-time SLA",
    summary:
      "Webhook-driven WMS sync replaced nightly batch jobs. Exceptions now surface in real time across 4 hubs.",
  },
]

export default function CaseStudiesPage() {
  return (
    <div className="bg-background">
      <section className="border-b border-border bg-card px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <p className="tac-mono-label">11 / Case studies</p>
          <h1 className="mt-3 text-balance text-4xl font-bold md:text-5xl">
            Numbers, not testimonials.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Three customers. Three different problems. Same network.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {STUDIES.map((s) => (
            <Link
              key={s.slug}
              href={`/case-studies/${s.slug}`}
              className="tac-fui-panel flex flex-col p-6 tac-fui-hover"
            >
              <p className="tac-mono-label">{s.customer}</p>
              <p className="mt-4 font-mono text-5xl text-primary">{s.metric}</p>
              <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {s.metricLabel}
              </p>
              <p className="mt-4 flex-1 text-sm text-foreground">{s.summary}</p>
              <span className="mt-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-primary">
                Read full study <RiArrowRightLine className="size-3" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
