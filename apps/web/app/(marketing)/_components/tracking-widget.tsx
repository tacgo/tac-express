"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Icon } from "./primitives"

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
    <div className="v2-tracking-widget">
      <p className="v2-tracking-label">
        <span aria-hidden className="v2-accent">■</span>
        Track a live shipment
      </p>
      <form onSubmit={handleSubmit} className="v2-tracking-form" role="search" aria-label="Track shipment">
        <input
          type="text"
          inputMode="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          placeholder="e.g. TAC-DEL-2026-00419"
          className="v2-tracking-input"
          aria-label="AWB or cargo ID"
          aria-describedby={error ? "track-error" : undefined}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
        <button type="submit" className="v2-tracking-submit" aria-label="Track shipment">
          <Icon name="arrow" size={16} />
        </button>
      </form>
      {error && (
        <p id="track-error" className="v2-tracking-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
