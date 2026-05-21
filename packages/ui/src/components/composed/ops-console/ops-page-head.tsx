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
        <div className="paper-eyebrow">{eyebrow}</div>
        <h1 className="paper-h1 mt-1">{title}</h1>
        {sub && (
          <div className="font-paper-display font-normal text-paper-13 text-paper-fg-3 mt-1">
            {sub}
          </div>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

export { OpsPageHead }
export type { OpsPageHeadProps }
