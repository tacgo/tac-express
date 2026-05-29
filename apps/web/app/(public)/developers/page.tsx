import type { Metadata } from "next"
import { RiTerminalBoxLine, RiPlugLine, RiKey2Line, RiCpuLine } from "@workspace/ui/icons"

export const metadata: Metadata = {
  title: "Developers — TAC Express",
  description: "REST API, webhooks, and SDKs for the TAC Express platform.",
}

export default function DevelopersPage() {
  return (
    <div className="bg-background">
      <section className="border-b border-border bg-card px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <p className="tac-mono-label">07 / Developers</p>
          <h1 className="mt-3 text-balance text-4xl font-bold md:text-6xl">
            Build on the same API our dashboard runs on.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            REST + JSON, webhook signatures, idempotency keys, and an SDK for Node, Python, and Go. No magic
            URLs. No undocumented endpoints. No surprise rate limits.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <Card icon={RiTerminalBoxLine} title="REST endpoints">
            Every dashboard read is mirrored on a public endpoint. Every write maps to a documented mutation.
          </Card>
          <Card icon={RiPlugLine} title="Webhooks">
            13 event types, HMAC SHA-256 signed. Replay history is queryable for 30 days.
          </Card>
          <Card icon={RiKey2Line} title="API keys">
            Issued from the dashboard. Three scopes (read-only, read-write, admin). Rotate without downtime.
          </Card>
          <Card icon={RiCpuLine} title="SDKs">
            <code>@tac-express/node</code>, <code>tac-express-py</code>, <code>tac-express-go</code>. All open source.
          </Card>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="tac-mono-label">Quick start</p>
          <h2 className="mt-2 text-3xl font-bold">Create a shipment in 8 lines.</h2>
          <pre className="mt-6 overflow-x-auto border border-border bg-code-bg p-5 font-mono text-sm">
            <code>{`curl https://api.tacexpress.in/v1/shipments \\
  -H "Authorization: Bearer tac_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "sender": { "name": "Acme", "phone": "9876543210", "pincode": "795001" },
    "receiver": { "name": "Delta", "phone": "9876512340", "pincode": "110037" },
    "origin_hub": "IMP",
    "dest_hub": "DEL",
    "pieces": 2,
    "dead_weight": 12.5,
    "service_level": "express"
  }'`}</code>
          </pre>
          <p className="mt-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Full reference at <span className="text-primary">/api-reference</span> · OpenAPI spec at <span className="text-primary">/api/openapi.json</span>
          </p>
        </div>
      </section>
    </div>
  )
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof RiTerminalBoxLine
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="tac-fui-panel p-6">
      <Icon className="size-7 text-primary" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  )
}
