"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

const fieldInputClass = cn(
  "w-full border border-paper-line bg-paper-card text-paper-fg-1",
  "px-3 py-2.5 font-paper-mono",
  "text-[length:var(--text-ui-13)]",
  "placeholder:text-paper-fg-4 placeholder:uppercase placeholder:tracking-[length:var(--tracking-crumb)] placeholder:text-[length:var(--text-ui-12)]",
  "focus-visible:outline-none focus-visible:tac-focus-premium focus-visible:border-paper-violet",
)

type OpsFieldInputProps = React.InputHTMLAttributes<HTMLInputElement>

const OpsFieldInput = React.forwardRef<HTMLInputElement, OpsFieldInputProps>(
  function OpsFieldInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        data-slot="ops-field-input"
        className={cn(fieldInputClass, className)}
        {...props}
      />
    )
  },
)

type OpsFieldSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

const OpsFieldSelect = React.forwardRef<HTMLSelectElement, OpsFieldSelectProps>(
  function OpsFieldSelect({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        data-slot="ops-field-select"
        className={cn(fieldInputClass, className)}
        {...props}
      >
        {children}
      </select>
    )
  },
)

type OpsFieldLabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

function OpsFieldLabel({ className, ...props }: OpsFieldLabelProps) {
  return (
    <label
      data-slot="ops-field-label"
      className={cn(
        "block mb-1.5 font-paper-mono font-medium uppercase",
        "text-[length:var(--text-ui-11)] tracking-[length:var(--tracking-badge)]",
        "text-paper-fg-3",
        className,
      )}
      {...props}
    />
  )
}

export { OpsFieldInput, OpsFieldSelect, OpsFieldLabel }
export type { OpsFieldInputProps, OpsFieldSelectProps, OpsFieldLabelProps }
