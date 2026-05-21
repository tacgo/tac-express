"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Dialog as DialogPrimitive } from "radix-ui"
import { cn } from "@workspace/ui/lib/utils"
import {
  RiSearchLine,
  RiDashboardLine,
  RiBox3Line,
  RiFileList3Line,
  RiScanLine,
  RiBuilding4Line,
  RiAlertLine,
  RiExchangeFundsLine,
  RiTeamLine,
  RiBarChart2Line,
  RiSettingsLine,
  RiCalculatorLine,
  RiShieldCheckLine,
  RiAddLine,
  type RemixiconComponentType,
} from "@workspace/ui/icons"

interface CommandItem {
  id: string
  label: string
  description?: string
  href: string
  icon: RemixiconComponentType
  keywords?: string[]
  group: "Navigate" | "Create" | "Actions"
}

const COMMANDS: CommandItem[] = [
  // Navigate
  { id: "nav-home", label: "Dashboard", href: "/home", icon: RiDashboardLine, group: "Navigate", keywords: ["overview", "kpi"] },
  { id: "nav-shipments", label: "Shipments", href: "/shipments", icon: RiBox3Line, group: "Navigate", keywords: ["awb", "package"] },
  { id: "nav-manifests", label: "Manifests", href: "/manifests", icon: RiFileList3Line, group: "Navigate" },
  { id: "nav-scanning", label: "Scanning", href: "/scanning", icon: RiScanLine, group: "Navigate", keywords: ["barcode"] },
  { id: "nav-inventory", label: "Inventory", href: "/inventory", icon: RiBuilding4Line, group: "Navigate", keywords: ["hub"] },
  { id: "nav-exceptions", label: "Exceptions", href: "/exceptions", icon: RiAlertLine, group: "Navigate", keywords: ["issues", "problems"] },
  { id: "nav-finance", label: "Finance & Invoices", href: "/finance", icon: RiExchangeFundsLine, group: "Navigate", keywords: ["billing"] },
  { id: "nav-rate-cards", label: "Rate Cards", href: "/rate-cards", icon: RiCalculatorLine, group: "Navigate", keywords: ["pricing"] },
  { id: "nav-customers", label: "Customers", href: "/customers", icon: RiTeamLine, group: "Navigate" },
  { id: "nav-analytics", label: "Analytics", href: "/analytics", icon: RiBarChart2Line, group: "Navigate", keywords: ["charts", "reports"] },
  { id: "nav-management", label: "Staff Management", href: "/management", icon: RiShieldCheckLine, group: "Navigate", keywords: ["users", "roles"] },
  { id: "nav-settings", label: "Settings", href: "/settings", icon: RiSettingsLine, group: "Navigate" },

  // Create
  { id: "create-shipment", label: "New Shipment", description: "Create a new AWB", href: "/shipments/create", icon: RiAddLine, group: "Create", keywords: ["awb", "book"] },
  { id: "create-manifest", label: "New Manifest", description: "Build a manifest", href: "/manifests/create", icon: RiAddLine, group: "Create" },
  { id: "create-invoice", label: "New Invoice", description: "Create invoice from AWB", href: "/finance/create", icon: RiAddLine, group: "Create", keywords: ["billing"] },
]

function fuzzyMatch(query: string, item: CommandItem): boolean {
  if (!query) return true
  const q = query.toLowerCase().trim()
  const haystack = [item.label, item.description, ...(item.keywords ?? []), item.group]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return q.split(/\s+/).every((token) => haystack.includes(token))
}

interface CommandPaletteProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps = {}) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = typeof controlledOpen === "boolean"
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  const [query, setQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Global ⌘K / Ctrl+K trigger
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, setOpen])

  // Reset state on close
  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setActiveIndex(0)
    } else {
      // Focus input on open
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const filtered = React.useMemo(
    () => COMMANDS.filter((c) => fuzzyMatch(query, c)),
    [query]
  )

  const grouped = React.useMemo(() => {
    const groups = new Map<string, CommandItem[]>()
    for (const item of filtered) {
      if (!groups.has(item.group)) groups.set(item.group, [])
      groups.get(item.group)!.push(item)
    }
    return Array.from(groups.entries())
  }, [filtered])

  const handleSelect = React.useCallback(
    (item: CommandItem) => {
      setOpen(false)
      router.push(item.href)
    },
    [router, setOpen]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const item = filtered[activeIndex]
      if (item) handleSelect(item)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-background/80",
            "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          )}
        />
        <DialogPrimitive.Content
          data-slot="command-palette"
          className={cn(
            "fixed left-1/2 top-[20%] z-50 w-[92vw] max-w-xl -translate-x-1/2",
            "border border-border bg-card shadow-brutal",
            "data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-4",
            "data-closed:animate-out data-closed:fade-out-0"
          )}
          onKeyDown={handleKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">Command Palette</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Navigate or perform actions quickly
          </DialogPrimitive.Description>

          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <RiSearchLine className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent font-sans text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
            <kbd className="font-mono text-2xs text-muted-foreground border border-border px-1.5 py-0.5">
              ESC
            </kbd>
          </div>

          <div
            className="max-h-80 overflow-y-auto py-1"
            role="listbox"
            aria-label="Commands"
          >
            {filtered.length === 0 ? (
              <div className="py-8 text-center">
                <p className="font-sans text-sm text-muted-foreground">
                  No commands found
                </p>
                <p className="font-sans text-xs text-muted-foreground/60 mt-1">
                  Try a different search term
                </p>
              </div>
            ) : (
              grouped.map(([groupName, items]) => (
                <div key={groupName} className="px-1 pb-1">
                  <p className="px-3 pt-3 pb-1 font-mono text-2xs uppercase tracking-widest text-muted-foreground/70">
                    {groupName}
                  </p>
                  <ul>
                    {items.map((item) => {
                      const flatIdx = filtered.indexOf(item)
                      const isActive = flatIdx === activeIndex
                      const Icon = item.icon
                      return (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            onClick={(e) => {
                              e.preventDefault()
                              handleSelect(item)
                            }}
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 font-sans text-sm transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-accent/50"
                            )}
                            role="option"
                            aria-selected={isActive}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isActive ? "text-primary" : "text-muted-foreground"
                              )}
                              aria-hidden="true"
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="truncate">{item.label}</span>
                              {item.description && (
                                <span className="font-sans text-xs text-muted-foreground truncate">
                                  {item.description}
                                </span>
                              )}
                            </div>
                            {isActive && (
                              <kbd className="font-mono text-2xs text-muted-foreground border border-border px-1.5 py-0.5">
                                ⏎
                              </kbd>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-2 bg-muted/30">
            <div className="flex items-center gap-3 text-2xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <kbd className="border border-border px-1 py-0.5">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="border border-border px-1 py-0.5">⏎</kbd>
                Open
              </span>
            </div>
            <span className="font-mono text-2xs text-muted-foreground">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export { CommandPalette }
