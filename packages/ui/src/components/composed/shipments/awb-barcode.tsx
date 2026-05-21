"use client"



import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Minimal, dependency-free Code-128B-style barcode renderer.
 *
 * This produces a visually-correct AWB barcode using deterministic bar widths.
 * It is intended for internal label printing — for customer-facing scannable
 * barcodes consider bwip-js or JsBarcode. The AWB text is always rendered
 * below the bars so manual entry remains possible.
 */

interface AwbBarcodeProps {
  value: string
  height?: number
  barWidth?: number
  quietZone?: number
  showText?: boolean
  className?: string
}

// Simple deterministic bar-pattern generator. Not a real Code-128 encoder —
// for customer-scannable output swap in bwip-js later.
function generatePattern(value: string): Array<[number, boolean]> {
  const bars: Array<[number, boolean]> = []
  // Start quiet
  bars.push([1, false])
  // Start pattern
  bars.push([2, true], [1, false], [1, true], [2, false])
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    // Generate 6 bars per character based on char code bits
    for (let i = 0; i < 6; i++) {
      const bit = (code >> i) & 1
      const isBar = i % 2 === 0
      bars.push([bit ? 2 : 1, isBar])
    }
  }
  // Stop pattern
  bars.push([1, false], [2, true], [3, true], [1, false], [1, true])
  return bars
}

function AwbBarcode({
  value,
  height = 60,
  barWidth = 2,
  quietZone = 10,
  showText = true,
  className,
}: AwbBarcodeProps) {
  const bars = React.useMemo(() => generatePattern(value), [value])

  const totalBarUnits = bars.reduce((sum, [w]) => sum + w, 0)
  const width = totalBarUnits * barWidth + quietZone * 2

  let x = quietZone
  const paths: React.ReactNode[] = []
  bars.forEach(([w, filled], i) => {
    const barW = w * barWidth
    if (filled) {
      paths.push(
        <rect
          key={i}
          x={x}
          y={0}
          width={barW}
          height={height}
          fill="currentColor"
        />
      )
    }
    x += barW
  })

  return (
    <div
      data-slot="awb-barcode"
      className={cn("inline-flex flex-col items-center text-foreground", className)}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Barcode for ${value}`}
        className="block"
      >
        <rect width={width} height={height} fill="white" />
        {paths}
      </svg>
      {showText && (
        // eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md
        <span className="font-mono text-xs tracking-[0.25em] mt-1 tabular-nums">
          {value}
        </span>
      )}
    </div>
  )
}

export { AwbBarcode }
