import type { Metadata } from "next"
import Link from "next/link"
import { RiArrowRightLine } from "@workspace/ui/icons"

export const metadata: Metadata = {
  title: "Careers — TAC Express",
  description: "Join the team building India's most respected regional logistics network.",
}

const ROLES = [
  { title: "Hub Operations Lead — Imphal", team: "Operations", location: "Imphal, IN", type: "Full-time" },
  { title: "Senior Frontend Engineer", team: "Engineering", location: "Remote (India)", type: "Full-time" },
  { title: "Backend Engineer (Postgres)", team: "Engineering", location: "Remote (India)", type: "Full-time" },
  { title: "Customer Success Lead", team: "Customer", location: "Bengaluru, IN", type: "Full-time" },
  { title: "Brokerage & Customs Specialist", team: "Compliance", location: "New Delhi, IN", type: "Full-time" },
  { title: "Field Driver — IMP→GAU corridor", team: "Operations", location: "Imphal, IN", type: "Full-time" },
]

export default function CareersPage() {
  return (
    <div className="bg-background">
      <section className="border-b border-border bg-card px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <p className="tac-mono-label">10 / Careers</p>
          <h1 className="mt-3 text-balance text-4xl font-bold md:text-6xl">
            Build the corridor that moves the rest of the country.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            We hire local. We pay above market. We train every operator on the same dashboard the CEO
            uses. If you ship cargo or ship code, we&apos;ve probably got a job for you.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="tac-mono-label">Open roles</p>
          <h2 className="mt-2 text-3xl font-bold">{ROLES.length} positions across {new Set(ROLES.map((r) => r.team)).size} teams</h2>
          <ul className="mt-8 divide-y divide-border border border-border">
            {ROLES.map((r) => (
              <li key={r.title}>
                <Link
                  href={`/careers/${slugify(r.title)}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{r.title}</p>
                    <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {r.team} · {r.location} · {r.type}
                    </p>
                  </div>
                  <RiArrowRightLine className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}
