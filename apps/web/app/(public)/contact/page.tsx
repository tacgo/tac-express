import type { Metadata } from "next"
import { ContactForm } from "./contact-form"
import { RiPhoneLine, RiMailLine, RiMapPinLine } from "@workspace/ui/icons"

export const metadata: Metadata = {
  title: "Contact — TAC Express",
  description: "Reach our sales, support, and operations teams. Response within one business day.",
}

export default function ContactPage() {
  return (
    <div className="bg-background">
      <section className="border-b border-border bg-card px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <p className="tac-mono-label">06 / Contact</p>
          <h1 className="mt-3 text-balance text-4xl font-bold md:text-5xl">
            Talk to a human in under 24 hours.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Sales, support, and ops route through one inbox. Pick the right thread and a real person will
            reply.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[1fr_2fr]">
          <aside className="space-y-4">
            <ContactRow icon={RiPhoneLine} label="Phone" value="+91 385 244 6500" />
            <ContactRow icon={RiMailLine} label="Email" value="hello@tacexpress.in" />
            <ContactRow icon={RiMapPinLine} label="HQ" value="Imphal, Manipur, India" />
          </aside>
          <ContactForm />
        </div>
      </section>
    </div>
  )
}

function ContactRow({ icon: Icon, label, value }: { icon: typeof RiPhoneLine; label: string; value: string }) {
  return (
    <div className="tac-fui-panel border-l-2 border-l-primary p-4">
      <Icon className="size-5 text-primary" aria-hidden="true" />
      <p className="mt-2 tac-mono-label">{label}</p>
      <p className="mt-1 font-mono text-sm">{value}</p>
    </div>
  )
}
