"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import { RiArrowRightLine } from "@workspace/ui/icons"

export function TrackSearchClient() {
  const router = useRouter()
  const [awb, setAwb] = React.useState("")
  const trimmed = awb.trim().toUpperCase()
  const valid = /^TAC\d{8,11}$/i.test(trimmed)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    router.push(`/track/${encodeURIComponent(trimmed)}`)
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 border border-border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="track-awb">CN Number</Label>
        <Input
          id="track-awb"
          value={awb}
          onChange={(e) => setAwb(e.target.value.toUpperCase())}
          placeholder="TAC0123456789"
          autoFocus
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={awb.length > 0 && !valid}
          className="font-mono text-base tracking-widest"
        />
        <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
          Format · TAC followed by 8 to 11 digits
        </p>
      </div>
      <Button type="submit" disabled={!valid} className="self-end">
        Track
        <RiArrowRightLine />
      </Button>
    </form>
  )
}
