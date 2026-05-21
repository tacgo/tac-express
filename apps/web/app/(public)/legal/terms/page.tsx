import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service — TAC Express",
  description: "Standard service terms for the TAC Express platform.",
}

export default function TermsPage() {
  return (
    <article className="bg-background px-6 py-24">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="tac-mono-label">Legal / Terms</p>
          <h1 className="mt-2 text-balance text-4xl font-bold">Terms of Service</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Effective 30 April 2026
          </p>
        </header>

        <section className="space-y-4 leading-relaxed text-foreground">
          <p>
            These terms govern access to TAC Express. By creating an account or using the public API
            you agree to be bound by them. The full agreement, signed master service agreement, and
            data processing addendum supersede the summary below for enterprise contracts.
          </p>

          <h2 className="text-xl font-bold">Service availability</h2>
          <p>
            TAC Express targets 99.9% monthly uptime for the public API and 99.5% for the operations
            dashboard. Scheduled maintenance windows are published 72 hours in advance.
          </p>

          <h2 className="text-xl font-bold">Acceptable use</h2>
          <p>
            You may not ship hazardous materials outside declared categories, prohibited goods under
            Indian customs law, or content that infringes a third party&apos;s intellectual property.
          </p>

          <h2 className="text-xl font-bold">Liability</h2>
          <p>
            Carrier liability is capped per Indian Carriage by Road Act, 2007 unless higher coverage
            is purchased through TAC Insure. Consequential damages are excluded except as required
            by law.
          </p>

          <h2 className="text-xl font-bold">Termination</h2>
          <p>
            Either party may terminate for convenience with 30 days written notice. Outstanding
            shipments are dispatched and final invoices issued before account closure.
          </p>
        </section>
      </div>
    </article>
  )
}
