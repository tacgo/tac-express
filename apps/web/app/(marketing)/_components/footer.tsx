import Link from "next/link"
import { footerContent } from "../_content"

export function V2Footer() {
  return (
    <footer className="px-5 pb-12 pt-16 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="v2-divider" />
        <div className="grid gap-10 pt-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="v2-display text-xl tracking-tight">
              {footerContent.brand.split(" ")[0]}
              <span className="v2-accent"> {footerContent.brand.split(" ")[1]}</span>
            </div>
            <p className="v2-muted mt-4 max-w-sm text-sm leading-relaxed">{footerContent.blurb}</p>
          </div>

          {footerContent.columns.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <div className="v2-eyebrow">{col.title}</div>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="v2-navlink text-sm">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="v2-divider mt-14" />
        <div className="v2-faint flex flex-col gap-3 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span>{footerContent.legal}</span>
          <Link href="/track" className="v2-navlink">
            Track a shipment →
          </Link>
        </div>
      </div>
    </footer>
  )
}
