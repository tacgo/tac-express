import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Status — TAC Express",
  description: "Live operational health for every TAC Express subsystem.",
}

const SERVICES = [
  { name: "Public API", status: "operational" },
  { name: "Dashboard", status: "operational" },
  { name: "Webhooks", status: "operational" },
  { name: "Tracking events ingest", status: "operational" },
  { name: "Public tracking page", status: "operational" },
  { name: "PDF rendering (invoices, AWBs)", status: "operational" },
  { name: "Hub: Imphal (IMP)", status: "operational" },
  { name: "Hub: Delhi (DEL)", status: "operational" },
  { name: "Hub: Bengaluru (BLR)", status: "degraded" },
  { name: "Hub: Mumbai (BOM)", status: "operational" },
] as const

const TONE: Record<string, { label: string; cls: string; dot: string }> = {
  operational: { label: "Operational", cls: "text-accent-success border-accent-success", dot: "bg-accent-success" },
  degraded:    { label: "Degraded",    cls: "text-accent-warning border-accent-warning", dot: "bg-accent-warning tac-blink" },
  outage:      { label: "Outage",      cls: "text-accent-danger border-accent-danger",   dot: "bg-accent-danger tac-blink" },
  maintenance: { label: "Maintenance", cls: "text-accent-info border-accent-info",       dot: "bg-accent-info" },
}

export default function StatusPage() {
  const allOperational = SERVICES.every((s) => s.status === "operational")

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-card px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="tac-mono-label">08 / Status</p>
          <h1 className="mt-3 text-balance text-4xl font-bold md:text-5xl">
            {allOperational ? "All systems operational." : "Some systems degraded."}
          </h1>
          <p className="mt-3 text-muted-foreground">
            Last refreshed {new Date().toUTCString()}.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl space-y-2">
          {SERVICES.map((svc) => {
            const tone = TONE[svc.status] ?? TONE.operational!
            return (
              <div key={svc.name} className="tac-fui-panel flex items-center justify-between p-4">
                <p className="font-medium">{svc.name}</p>
                <span className={"inline-flex items-center gap-2 border px-2 py-0.5 font-mono text-2xs uppercase tracking-wider " + tone.cls}>
                  <span aria-hidden className={"inline-block size-1.5 " + tone.dot} />
                  {tone.label}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
