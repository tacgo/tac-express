"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/primitives/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/primitives/popover"
import { RiArrowDownSLine, RiCheckLine } from "@workspace/ui/icons"

export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
  /** Optional metadata shown in muted style on the right of an option row. */
  meta?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
  /**
   * Accessible name fallback for the trigger button. Set this when the
   * Combobox isn't visually associated with a `<Label>` — without it,
   * axe's `button-name` rule can flag the trigger if the placeholder
   * text fails to render (briefly empty options array, etc.). Always
   * passed via `aria-label` even when `selectedLabel` resolves, so
   * screen-reader users get a stable role/name pair across state changes.
   */
  "aria-label"?: string
}

function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  disabled,
  className,
  triggerClassName,
  contentClassName,
  "aria-label": ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedLabel = React.useMemo(() => {
    return options.find((o) => o.value === value)?.label
  }, [options, value])

  return (
    <div className={cn("inline-flex w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel ?? placeholder}
            disabled={disabled}
            className={cn(
              "w-full justify-between gap-2 font-mono text-xs uppercase tracking-wide",
              !value && "text-muted-foreground",
              triggerClassName
            )}
            data-slot="combobox-trigger"
          >
            <span className="truncate">{selectedLabel ?? placeholder}</span>
            <RiArrowDownSLine className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn("w-(--radix-popover-trigger-width) p-0", contentClassName)}
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    disabled={option.disabled}
                    onSelect={() => {
                      onChange?.(option.value)
                      setOpen(false)
                    }}
                  >
                    <RiCheckLine
                      className={cn(
                        "size-4 shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                    {option.meta && (
                      <span className="ml-auto font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
                        {option.meta}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { Combobox }
