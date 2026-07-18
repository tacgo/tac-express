"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RiArrowRightLine } from "@workspace/ui/icons"

export function V2TrackingWidget() {
  const router = useRouter()
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const awb = value.trim().toUpperCase()
    if (!awb) {
      setError("Enter an AWB or cargo ID")
      return
    }
    setError(null)
    router.push(`/track/${encodeURIComponent(awb)}`)
  }

  return (
    <div className="mt-10 border-t border-border pt-8">
      <p className="mb-3 flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
        <span className="size-1.5 bg-primary" aria-hidden="true" />
        Track a live shipment
      </p>
      <form
        onSubmit={handleSubmit}
        role="search"
        aria-label="Track shipment"
        className="flex"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          placeholder="e.g. TAC-DEL-2026-00419"
          className="h-10 flex-1 border border-border bg-background px-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label="AWB or cargo ID"
          aria-describedby={error ? "track-error" : undefined}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className="flex h-10 w-10 shrink-0 items-center justify-center border border-l-0 border-border bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:tac-focus-premium"
          aria-label="Track shipment"
        >
          <RiArrowRightLine className="size-4" aria-hidden="true" />
        </button>
      </form>
      {error && (
        <p id="track-error" role="alert" className="mt-2 font-mono text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
