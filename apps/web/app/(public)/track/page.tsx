import type { Metadata } from "next"
import Link from "next/link"
import { TrackEntry } from "./track-entry"

export const metadata: Metadata = {
  title: "Track a shipment — TAC Express",
  description:
    "Enter your AWB or cargo ID to see real-time location, custody status, and a predictive ETA across the North-East corridor.",
  alternates: { canonical: "/track" },
}

// Layout mirrors the other public sub-pages (see quote/about/contact): a
// bg-card header band (max-w-5xl) with the numbered mono eyebrow, then a
// max-w-3xl content section. Keeps the left content edge aligned with the
// rest of the site instead of floating a narrow centered column.
export default function TrackIndexPage() {
  return (
    <div className="bg-background">
      <section className="border-b border-border bg-card px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="tac-mono-label">04 / Tracking</p>
          <h1 className="mt-3 text-balance text-4xl font-bold md:text-5xl">Track a shipment.</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Enter your AWB or cargo ID to see real-time location, custody status, and a
            predictive ETA on every remaining leg of the North-East corridor.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <TrackEntry />
          <p className="t-body-sm text-muted-foreground mt-8">
            Don&apos;t have an AWB yet?{" "}
            <Link
              href="/quote"
              className="text-primary hover:underline focus-visible:outline-none focus-visible:tac-focus-premium"
            >
              Get a quote
            </Link>{" "}
            to book your first shipment.
          </p>
        </div>
      </section>
    </div>
  )
}
