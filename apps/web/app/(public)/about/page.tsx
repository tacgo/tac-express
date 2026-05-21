import type { Metadata } from "next"
import {
  RiBuilding4Line,
  RiPlaneLine,
  RiTruckLine,
  RiTeamLine,
  RiShieldCheckLine,
  RiLeafLine,
} from "@workspace/ui/icons"

export const metadata: Metadata = {
  title: "About — TAC Express",
  description:
    "TAC Express is a North-East India anchored logistics platform. Mission, leadership, and the principles that govern our network.",
}

export default function AboutPage() {
  return (
    <div className="bg-background">
      <section className="relative border-b border-border bg-card px-6 py-24 md:py-32">
        <div className="absolute inset-0 tac-fui-grid opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-5xl">
          <p className="tac-mono-label">02 / Company</p>
          <h1 className="mt-3 max-w-3xl text-balance text-4xl font-bold leading-tight md:text-6xl">
            Built for the routes nobody else maps.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            TAC Express moves cargo through the corridor most logistics companies treat as a footnote — the
            North-East. We&apos;re the network behind tea growers, handicraft cooperatives, defense
            contractors, and the e-commerce sellers who refused to accept a 14-day delivery promise.
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {[
            { label: "Hubs operated", value: "10" },
            { label: "Avg. transit IMP→DEL", value: "2.4d" },
            { label: "On-time delivery", value: "97.1%" },
          ].map((stat) => (
            <div key={stat.label} className="tac-fui-panel p-6">
              <p className="tac-mono-label">{stat.label}</p>
              <p className="mt-2 font-mono text-4xl text-primary">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="tac-mono-label">Principles</p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">What we refuse to compromise on</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="tac-fui-panel border-l-2 border-l-primary p-6">
                <p.icon className="size-6 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

const PRINCIPLES = [
  {
    icon: RiShieldCheckLine,
    title: "Custody chain over coverage map",
    body: "We&apos;d rather refuse a route than fake one. Every shipment lives in our hubs — never on a contractor&apos;s back office.",
  },
  {
    icon: RiTruckLine,
    title: "Telemetry first, paperwork last",
    body: "Real-time scans drive every status. No clipboards reconciled at 11 PM. Drivers see what dispatch sees.",
  },
  {
    icon: RiBuilding4Line,
    title: "Hubs are physical platforms",
    body: "Each hub publishes capacity, dock-door status, and SLA in real time. If a route can&apos;t make the cut, the system says so before a quote goes out.",
  },
  {
    icon: RiPlaneLine,
    title: "Multimodal by default",
    body: "Air, road, rail — selected by SLA, not by sales preference. The rate engine routes the cheapest viable path automatically.",
  },
  {
    icon: RiTeamLine,
    title: "Local hires, regional command",
    body: "Each hub is staffed and managed by people who live in the city it serves. No Bangalore-based ops team running Imphal by Slack message.",
  },
  {
    icon: RiLeafLine,
    title: "Carbon-honest reporting",
    body: "Every shipment&apos;s emissions are logged from declared distance and mode. We don&apos;t buy offsets to claim neutrality we haven&apos;t earned.",
  },
]
