import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy — TAC Express",
  description: "How TAC Express collects, processes, and protects your data.",
}

export default function PrivacyPage() {
  return (
    <article className="bg-background px-6 py-24">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="tac-mono-label">Legal / Privacy</p>
          <h1 className="mt-2 text-balance text-4xl font-bold">Privacy Policy</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Effective 30 April 2026
          </p>
        </header>

        <section className="space-y-4 leading-relaxed text-foreground">
          <h2 className="text-xl font-bold">1. Data we collect</h2>
          <p>
            We collect identifiers necessary to fulfill shipments — names, phone numbers, addresses,
            and GST numbers — plus operational telemetry (scans, timestamps, device IDs) and account
            authentication data.
          </p>

          <h2 className="text-xl font-bold">2. How we use it</h2>
          <p>
            We use shipment data to plan routes, calculate billing, dispatch notifications, and
            satisfy regulatory reporting obligations. We do not sell personal data.
          </p>

          <h2 className="text-xl font-bold">3. How long we keep it</h2>
          <p>
            Active shipment data is retained for the duration of the customer relationship plus 7
            years to satisfy GST and customs audit requirements. Tracking telemetry is retained for
            18 months.
          </p>

          <h2 className="text-xl font-bold">4. Sub-processors</h2>
          <p>
            We use Supabase for our primary database, Cloudflare for edge delivery, and Resend for
            transactional email. A current list lives at /legal/sub-processors.
          </p>

          <h2 className="text-xl font-bold">5. Your rights</h2>
          <p>
            You may request export or deletion of your personal data by emailing
            privacy@tacexpress.com. We respond within 30 days as required by the DPDP Act, 2023.
          </p>
        </section>
      </div>
    </article>
  )
}
