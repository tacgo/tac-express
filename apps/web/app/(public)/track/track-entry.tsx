"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AwbInput } from "@workspace/ui/components/composed/awb-input"

/**
 * Client entry form for the dedicated /track page. Reuses the shared
 * <AwbInput> (the same control the hero used to embed) and, on submit,
 * routes to the server-rendered /track/[awb] detail page. Keeping the lookup
 * on its own page lets the hero stay minimal — a single CTA, no inline form.
 */
export function TrackEntry() {
  const router = useRouter()
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  function onSubmit(awb: string) {
    if (!awb) {
      setError("Enter an AWB or cargo ID.")
      return
    }
    setError(null)
    setLoading(true)
    // AwbInput already trims + uppercases before calling onSubmit.
    router.push(`/track/${encodeURIComponent(awb)}`)
  }

  return (
    <AwbInput
      id="track-entry"
      size="hero"
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      error={error}
      loading={loading}
      autoFocus
    />
  )
}
