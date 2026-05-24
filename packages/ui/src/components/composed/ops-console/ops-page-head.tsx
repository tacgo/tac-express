import * as React from "react"

interface OpsPageHeadProps {
  eyebrow: string
  title: string
  sub?: string
  actions?: React.ReactNode
}

function OpsPageHead({ eyebrow, title, sub, actions }: OpsPageHeadProps) {
  return (
    <div
      data-slot="ops-page-head"
      className="flex items-end justify-between gap-4 mb-5"
    >
      <div>
        {/* Premium v7 page-header voice, consistent with SurfaceCard:
            mono overline → Noto Serif display title → muted caption sub.
            Replaces the legacy paper-* (Outfit-800) header type that read
            "basic". */}
        <div className="tac-mono-label text-muted-foreground">{eyebrow}</div>
        <h1 className="t-h1 text-foreground mt-1.5">{title}</h1>
        {sub && <p className="t-caption text-muted-foreground mt-2">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

export { OpsPageHead }
export type { OpsPageHeadProps }
