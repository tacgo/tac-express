"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/primitives/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/primitives/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/primitives/dialog"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import { Switch } from "@workspace/ui/components/primitives/switch"
import {
  RiArrowDownSLine,
  RiPushpinLine,
  RiAddLine,
  RiDeleteBinLine,
} from "@workspace/ui/icons"
import type { SavedView, SavedViewInput } from "@workspace/types"

interface SavedViewSelectorProps {
  views: SavedView[]
  /** Filters that drive the *current* list — used to detect "dirty" state. */
  currentFilters?: Record<string, unknown>
  /** Currently active saved-view id, if any. */
  activeViewId?: string | null
  /** Apply a saved view (UI is responsible for translating `view.filters` to URL state). */
  onApply?: (view: SavedView) => void
  /** Save the *current* filters as a new view. */
  onCreate?: (input: SavedViewInput) => void | Promise<void>
  /** Delete a saved view. */
  onDelete?: (view: SavedView) => void
  /** Reset filters to their defaults. */
  onReset?: () => void
  className?: string
  /** Entity type — passed to onCreate when saving. */
  entityType: SavedViewInput["entityType"]
}

function isDirty(
  active: SavedView | undefined,
  current: Record<string, unknown> | undefined
): boolean {
  if (!current || Object.keys(current).length === 0) return false
  if (!active) return true
  return JSON.stringify(active.filters ?? {}) !== JSON.stringify(current)
}

export function SavedViewSelector({
  views,
  currentFilters,
  activeViewId,
  onApply,
  onCreate,
  onDelete,
  onReset,
  className,
  entityType,
}: SavedViewSelectorProps) {
  const [creating, setCreating] = React.useState(false)
  const [name, setName] = React.useState("")
  const [pinned, setPinned] = React.useState(false)
  const [shared, setShared] = React.useState(false)

  const active = views.find((v) => v.id === activeViewId)
  const dirty = isDirty(active, currentFilters)
  const pinnedViews = views.filter((v) => v.isPinned)
  const otherViews = views.filter((v) => !v.isPinned)

  const handleCreate = async () => {
    if (!name.trim() || !onCreate) return
    await onCreate({
      entityType,
      name: name.trim(),
      filters: currentFilters ?? {},
      isPinned: pinned,
      isShared: shared,
    })
    setName("")
    setPinned(false)
    setShared(false)
    setCreating(false)
  }

  return (
    <div
      data-slot="saved-view-selector"
      className={cn("flex items-center gap-2", className)}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <span className="font-mono text-ui-11 uppercase tracking-widest">
              {active ? active.name : "All shipments"}
            </span>
            {dirty && (
              <Badge variant="secondary" className="font-mono">
                modified
              </Badge>
            )}
            <RiArrowDownSLine className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56" align="start">
          {pinnedViews.length > 0 && (
            <>
              <DropdownMenuLabel>Pinned</DropdownMenuLabel>
              {pinnedViews.map((v) => (
                <DropdownMenuItem key={v.id} onSelect={() => onApply?.(v)}>
                  <RiPushpinLine className="size-3.5" />
                  <span className="truncate">{v.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          {otherViews.length > 0 && (
            <>
              <DropdownMenuLabel>All views</DropdownMenuLabel>
              {otherViews.map((v) => (
                <DropdownMenuItem key={v.id} onSelect={() => onApply?.(v)}>
                  <span className="truncate">{v.name}</span>
                  {onDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(v)
                      }}
                      aria-label={`Delete view ${v.name}`}
                      className="ml-auto h-5 w-5 opacity-0 hover:opacity-100 group-hover:opacity-100"
                    >
                      <RiDeleteBinLine className="size-3" />
                    </Button>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          {onReset && (
            <DropdownMenuItem onSelect={() => onReset()}>
              Reset filters
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <RiAddLine className="size-3.5" />
            Save current filters as new view…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save filter view</DialogTitle>
            <DialogDescription>
              Names this filter combination so you (or your team) can recall it
              quickly.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="saved-view-name">Name</Label>
              <Input
                id="saved-view-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Imphal · Pending pickup"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="saved-view-pinned" className="flex-1">
                Pin to top of list
              </Label>
              <Switch
                id="saved-view-pinned"
                checked={pinned}
                onCheckedChange={setPinned}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="saved-view-shared" className="flex-1">
                Share with team
              </Label>
              <Switch
                id="saved-view-shared"
                checked={shared}
                onCheckedChange={setShared}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim()}>
              Save view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
