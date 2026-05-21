"use client"

import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import { cn } from "@workspace/ui/lib/utils"
import { RadioGroup } from "@workspace/ui/components/primitives/radio-group"
import type { Density } from "@workspace/ui/lib/density"

interface DensityToggleProps {
  value: Density
  onChange: (value: Density) => void
  className?: string
}

const OPTIONS: { value: Density; label: string; description: string }[] = [
  { value: "compact", label: "C", description: "Compact density" },
  { value: "comfortable", label: "M", description: "Comfortable density" },
  { value: "spacious", label: "S", description: "Spacious density" },
]

function DensityToggle({ value, onChange, className }: DensityToggleProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      data-slot="density-toggle"
      className={cn("inline-flex items-center border border-border bg-card gap-0", className)}
    >
      {OPTIONS.map((opt) => (
        <RadioGroupPrimitive.Item
          key={opt.value}
          value={opt.value}
          aria-label={opt.description}
          className={cn(
            "flex size-7 items-center justify-center t-mono-sm tac-fui-hover",
            "focus-visible:outline-none focus-visible:tac-focus-premium",
            "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
          )}
        >
          {opt.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroup>
  )
}

export { DensityToggle }
