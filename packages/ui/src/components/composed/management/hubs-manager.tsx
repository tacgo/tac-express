"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/primitives/table"
import { Switch } from "@workspace/ui/components/primitives/switch"
import { Badge } from "@workspace/ui/components/primitives/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/primitives/dialog"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import {
  RiAddLine,
  RiBuilding4Line,
  RiEditLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
} from "@workspace/ui/icons"
import type { Hub, HubInput } from "@workspace/types"

interface HubsManagerProps {
  hubs: Hub[]
  loading?: boolean
  /** Create a new hub. */
  onCreate?: (input: HubInput) => Promise<void> | void
  /** Patch an existing hub. */
  onUpdate?: (id: string, patch: Partial<HubInput>) => Promise<void> | void
  /** Toggle a hub's active flag. */
  onToggleActive?: (id: string, isActive: boolean) => void
  className?: string
}

const EMPTY_FORM: HubInput = {
  code: "",
  name: "",
  city: "",
  state: "",
  country: "IN",
  pincode: "",
  address: "",
  isOrigin: true,
  isDestination: true,
  isActive: true,
}

export function HubsManager({
  hubs,
  loading,
  onCreate,
  onUpdate,
  onToggleActive,
  className,
}: HubsManagerProps) {
  const [editing, setEditing] = React.useState<Hub | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [form, setForm] = React.useState<HubInput>(EMPTY_FORM)
  const [submitting, setSubmitting] = React.useState(false)

  const open = creating || editing !== null

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setCreating(true)
  }
  const openEdit = (h: Hub) => {
    setForm({
      code: h.code,
      name: h.name,
      city: h.city,
      state: h.state,
      country: h.country,
      pincode: h.pincode,
      address: h.address,
      managerId: h.managerId,
      isOrigin: h.isOrigin,
      isDestination: h.isDestination,
      isActive: h.isActive,
    })
    setCreating(false)
    setEditing(h)
  }

  const close = () => {
    setEditing(null)
    setCreating(false)
  }

  const update = <K extends keyof HubInput>(key: K, value: HubInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const valid =
    form.code.trim().length === 3 &&
    form.name.trim().length > 1 &&
    form.city.trim().length > 1 &&
    form.state.trim().length > 1 &&
    /^\d{6}$/.test(form.pincode) &&
    form.address.trim().length > 4

  const handleSubmit = async () => {
    if (!valid) return
    setSubmitting(true)
    try {
      if (creating && onCreate) {
        await onCreate({
          ...form,
          code: form.code.toUpperCase(),
        })
      } else if (editing && onUpdate) {
        await onUpdate(editing.id, {
          ...form,
          code: form.code.toUpperCase(),
        })
      }
      close()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      data-slot="hubs-manager"
      className={cn("space-y-4", className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">
            Hub Network
          </h2>
          <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            {hubs.length} hub{hubs.length === 1 ? "" : "s"} · {hubs.filter((h) => h.isActive).length} active
          </p>
        </div>
        <Button type="button" onClick={openCreate} size="sm">
          <RiAddLine />
          New Hub
        </Button>
      </header>

      {loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : hubs.length === 0 ? (
        <EmptyState
          icon={<RiBuilding4Line />}
          title="No hubs configured"
          description="Add the first hub to enable shipment routing across the network."
          action={
            <Button type="button" onClick={openCreate}>
              <RiAddLine />
              New Hub
            </Button>
          }
        />
      ) : (
        <div className="border border-border bg-background">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-muted/30 text-left font-mono text-2xs uppercase tracking-widest text-muted-foreground hover:bg-muted/30">
                <TableHead className="h-auto px-3 py-2 text-muted-foreground">Code</TableHead>
                <TableHead className="h-auto px-3 py-2 text-muted-foreground">Name</TableHead>
                <TableHead className="h-auto px-3 py-2 text-muted-foreground">City</TableHead>
                <TableHead className="h-auto px-3 py-2 text-muted-foreground">State</TableHead>
                <TableHead className="h-auto px-3 py-2 text-muted-foreground">Pincode</TableHead>
                <TableHead className="h-auto px-3 py-2 text-muted-foreground">Flow</TableHead>
                <TableHead className="h-auto px-3 py-2 text-muted-foreground">Status</TableHead>
                <TableHead className="h-auto w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {hubs.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="px-3 py-2 font-mono text-xs font-semibold tracking-widest">
                    {h.code}
                  </TableCell>
                  <TableCell className="px-3 py-2">{h.name}</TableCell>
                  <TableCell className="px-3 py-2 font-mono text-xs uppercase tracking-wide">
                    {h.city}
                  </TableCell>
                  <TableCell className="px-3 py-2 font-mono text-xs uppercase tracking-wide">
                    {h.state}
                  </TableCell>
                  <TableCell className="px-3 py-2 font-mono text-xs">{h.pincode}</TableCell>
                  <TableCell className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {h.isOrigin && (
                        <Badge variant="secondary" className="font-mono">
                          Origin
                        </Badge>
                      )}
                      {h.isDestination && (
                        <Badge variant="secondary" className="font-mono">
                          Dest
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onToggleActive?.(h.id, !h.isActive)}
                      className={cn(
                        "h-auto gap-1 px-1 py-0.5 font-mono text-2xs uppercase tracking-widest hover:bg-transparent hover:opacity-70",
                        h.isActive ? "text-status-success" : "text-muted-foreground"
                      )}
                      aria-label={h.isActive ? "Deactivate hub" : "Activate hub"}
                    >
                      {h.isActive ? (
                        <RiCheckboxCircleLine className="size-3" />
                      ) : (
                        <RiCloseCircleLine className="size-3" />
                      )}
                      {h.isActive ? "Active" : "Inactive"}
                    </Button>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(h)}
                      aria-label={`Edit hub ${h.id}`}
                      className="size-7"
                    >
                      <RiEditLine className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{creating ? "New hub" : "Edit hub"}</DialogTitle>
            <DialogDescription>
              Hubs are the physical sort centers that anchor every shipment route. Codes are 3-letter uppercase.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
              <div className="grid gap-1.5">
                <Label htmlFor="hub-code">Code</Label>
                <Input
                  id="hub-code"
                  value={form.code}
                  maxLength={3}
                  onChange={(e) =>
                    update("code", e.target.value.toUpperCase())
                  }
                  className="font-mono uppercase tracking-widest"
                  disabled={!creating}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="hub-name">Name</Label>
                <Input
                  id="hub-name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="hub-city">City</Label>
                <Input
                  id="hub-city"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="hub-state">State</Label>
                <Input
                  id="hub-state"
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="hub-pincode">Pincode</Label>
                <Input
                  id="hub-pincode"
                  value={form.pincode}
                  maxLength={6}
                  onChange={(e) =>
                    update("pincode", e.target.value.replace(/\D/g, ""))
                  }
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="hub-address">Address</Label>
              <Input
                id="hub-address"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex items-center justify-between border border-border bg-background px-3 py-2">
                <span className="font-mono text-ui-10 uppercase tracking-widest">
                  Allows origin
                </span>
                <Switch
                  checked={form.isOrigin ?? true}
                  onCheckedChange={(v) => update("isOrigin", v)}
                />
              </label>
              <label className="flex items-center justify-between border border-border bg-background px-3 py-2">
                <span className="font-mono text-ui-10 uppercase tracking-widest">
                  Allows destination
                </span>
                <Switch
                  checked={form.isDestination ?? true}
                  onCheckedChange={(v) => update("isDestination", v)}
                />
              </label>
              <label className="flex items-center justify-between border border-border bg-background px-3 py-2">
                <span className="font-mono text-ui-10 uppercase tracking-widest">
                  Active
                </span>
                <Switch
                  checked={form.isActive ?? true}
                  onCheckedChange={(v) => update("isActive", v)}
                />
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!valid || submitting}
            >
              {submitting
                ? "Saving…"
                : creating
                  ? "Create hub"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
