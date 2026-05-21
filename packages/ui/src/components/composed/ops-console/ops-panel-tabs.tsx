"use client"

import * as React from "react"
import {
  Tabs as RadixTabs,
  TabsList as RadixTabsList,
  TabsTrigger as RadixTabsTrigger,
  TabsContent as RadixTabsContent,
} from "@workspace/ui/components/primitives/tabs"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Paper-aesthetic Radix Tabs wrapper. Same API as v6 `Tabs` / `TabsList` /
 * `TabsTrigger` / `TabsContent` but styled with paper tokens so detail pages
 * keep Radix's keyboard + ARIA semantics while looking paper.
 */

const OpsPanelTabs = RadixTabs

function OpsPanelTabsList({
  className,
  ...props
}: React.ComponentProps<typeof RadixTabsList>) {
  return (
    <RadixTabsList
      className={cn(
        "inline-flex h-9 items-stretch border-b border-paper-line w-full bg-transparent rounded-none p-0 gap-0",
        className,
      )}
      {...props}
    />
  )
}

function OpsPanelTabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof RadixTabsTrigger>) {
  return (
    <RadixTabsTrigger
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 h-9 -mb-px",
        "font-paper-mono font-medium uppercase tracking-[length:var(--tracking-paper-10)] text-[length:var(--text-paper-11)]",
        "text-paper-fg-3 hover:text-paper-fg-1 transition-colors duration-fast ease-linear",
        "border-b-2 border-transparent rounded-none bg-transparent shadow-none",
        "focus-visible:outline-none focus-visible:tac-focus-premium",
        "data-[state=active]:text-paper-violet data-[state=active]:border-b-paper-violet data-[state=active]:bg-transparent",
        "[&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  )
}

function OpsPanelTabsContent({
  className,
  ...props
}: React.ComponentProps<typeof RadixTabsContent>) {
  return (
    <RadixTabsContent
      className={cn("pt-5 focus-visible:outline-none", className)}
      {...props}
    />
  )
}

export {
  OpsPanelTabs,
  OpsPanelTabsList,
  OpsPanelTabsTrigger,
  OpsPanelTabsContent,
}
