"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { OpsButton } from "./ops-button"

interface OpsTabsProps {
  items: string[]
  value: string
  onChange: (v: string) => void
  className?: string
}

function OpsTabs({ items, value, onChange, className }: OpsTabsProps) {
  return (
    <div
      data-slot="ops-tabs"
      role="tablist"
      className={cn("flex gap-2 mb-4 flex-wrap", className)}
    >
      {items.map((it) => (
        <OpsButton
          key={it}
          variant="tab"
          size="default"
          role="tab"
          aria-selected={value === it}
          data-state={value === it ? "on" : "off"}
          onClick={() => onChange(it)}
        >
          {it}
        </OpsButton>
      ))}
    </div>
  )
}

export { OpsTabs }
export type { OpsTabsProps }
