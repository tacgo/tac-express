"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/primitives/badge"
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
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
} from "@workspace/ui/icons"
import type { ComboboxOption } from "@workspace/ui/components/primitives/combobox"

interface MultiSelectProps {
  options: ComboboxOption[]
  value?: string[]
  onChange?: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  /** Maximum number of badges to render before collapsing to a count. */
  maxBadges?: number
}

function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Select options",
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  disabled,
  className,
  maxBadges = 3,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selected = React.useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value]
  )

  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange?.(value.filter((v) => v !== val))
    } else {
      onChange?.([...value, val])
    }
  }

  return (
    <div className={cn("inline-flex w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-auto min-h-9 w-full justify-between gap-2 px-2 py-1.5 font-mono text-paper-11 uppercase tracking-wide",
              selected.length === 0 && "text-muted-foreground"
            )}
            data-slot="multi-select-trigger"
          >
            <span className="flex flex-wrap items-center gap-1">
              {selected.length === 0 ? (
                <span>{placeholder}</span>
              ) : selected.length > maxBadges ? (
                <Badge variant="secondary" className="font-mono">
                  {selected.length} selected
                </Badge>
              ) : (
                selected.map((s) => (
                  <Badge
                    key={s.value}
                    variant="secondary"
                    className="gap-1 font-mono"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(s.value)
                    }}
                  >
                    {s.label}
                    <RiCloseLine className="size-3" />
                  </Badge>
                ))
              )}
            </span>
            <RiArrowDownSLine className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = value.includes(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      disabled={option.disabled}
                      onSelect={() => toggle(option.value)}
                    >
                      <RiCheckLine
                        className={cn(
                          "size-4 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{option.label}</span>
                      {option.meta && (
                        <span className="ml-auto font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
                          {option.meta}
                        </span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { MultiSelect }
