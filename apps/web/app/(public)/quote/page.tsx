import type { Metadata } from "next"
import { RateCalculator } from "./rate-calculator"

export const metadata: Metadata = {
  title: "Rate Calculator — TAC Express",
  description: "Get a live freight rate quote for any TAC Express route. No sign-in required.",
}

export default function QuotePage() {
  return (
    <div className="bg-background">
      <section className="border-b border-border bg-card px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="tac-mono-label">05 / Rate calculator</p>
          <h1 className="mt-3 text-balance text-4xl font-bold md:text-5xl">
            Live freight rates. Zero login required.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Pulls from the same rate engine that bills your shipments. Results include base, fuel
            surcharge, handling, and statutory levies.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <RateCalculator />
        </div>
      </section>
    </div>
  )
}
