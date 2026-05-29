import Link from "next/link"
import { footerContent, complianceContent } from "../_content"

export function V2Footer() {
  return (
    <footer className="border-t border-border px-5 pb-12 pt-16 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="font-serif text-xl font-semibold tracking-tight text-foreground">
              {footerContent.brand.split(" ")[0]}
              <span className="text-primary"> {footerContent.brand.split(" ")[1]}</span>
            </div>
            <p className="mt-4 max-w-sm t-body-sm text-muted-foreground">
              {footerContent.blurb}
            </p>
          </div>

          {footerContent.columns.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <div className="tac-mono-label-base text-muted-foreground">
                {col.title}
              </div>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Compliance strip */}
        <div className="mt-14 border-t border-border pt-8">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {complianceContent.items.map((item) => (
              <div key={item.label} className="flex items-baseline gap-2">
                <span className="tac-mono-label-base text-muted-foreground">
                  {item.label}
                </span>
                <span className="t-mono-sm text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{complianceContent.note}</p>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{footerContent.legal}</span>
          <Link href="/track" className="transition-colors hover:text-foreground">
            Track a shipment →
          </Link>
        </div>
      </div>
    </footer>
  )
}
