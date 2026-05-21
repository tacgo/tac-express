"use client"

import * as React from "react"
// Use the browser entry point explicitly to avoid the Node bundle being
// pulled into the client and to keep types consistent across environments.
import bwipjs from "bwip-js/browser"

import { cn } from "@workspace/ui/lib/utils"

export type UniversalBarcodeMode =
  | "screen"
  | "print"
  | "thermal4x6"
  | "compact"
  | "pdf"

export interface UniversalBarcodeProps {
  value: string
  mode?: UniversalBarcodeMode
  /** Override BWIPP barcode type. Default: code128. */
  bcid?: string
  /** Override module width (mm) for fine-grained tuning. */
  scale?: number
  /** Bar height (mm). */
  height?: number
  /** Whether to display the human-readable text. */
  includeText?: boolean
  /** Class applied to the rendered SVG element. */
  className?: string
  /** Override fill colors (hex without #). */
  barColor?: string
  background?: string
  /** Override text font name. */
  textFont?: string
  /** Override text size. */
  textSize?: number
}

const MODE_PRESETS: Record<
  UniversalBarcodeMode,
  Pick<UniversalBarcodeProps, "scale" | "height" | "includeText" | "textSize">
> = {
  screen: { scale: 3, height: 14, includeText: true, textSize: 10 },
  compact: { scale: 2, height: 8, includeText: false, textSize: 8 },
  print: { scale: 3, height: 16, includeText: true, textSize: 12 },
  thermal4x6: { scale: 4, height: 20, includeText: true, textSize: 14 },
  pdf: { scale: 4, height: 18, includeText: true, textSize: 12 },
}

function UniversalBarcode({
  value,
  mode = "screen",
  bcid = "code128",
  scale,
  height,
  includeText,
  className,
  barColor,
  background,
  textFont = "JetBrains Mono",
  textSize,
}: UniversalBarcodeProps) {
  const [svg, setSvg] = React.useState<string>("")
  const preset = MODE_PRESETS[mode]

  React.useEffect(() => {
    let cancelled = false
    const opts: bwipjs.RenderOptions = {
      bcid,
      text: value,
      scale: scale ?? preset.scale ?? 3,
      height: height ?? preset.height ?? 14,
      includetext: includeText ?? preset.includeText ?? true,
      textxalign: "center",
      textfont: textFont,
      textsize: textSize ?? preset.textSize ?? 10,
    }
    if (barColor) opts.barcolor = barColor
    if (background) opts.backgroundcolor = background

    try {
      const out = bwipjs.toSVG(opts)
      if (!cancelled) setSvg(out)
    } catch (err) {
      // Render a tiny error placeholder rather than throwing.
      if (!cancelled) {
        setSvg(
          `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><text x="0" y="14" font-family="JetBrains Mono" font-size="10">${(err as Error).message}</text></svg>`
        )
      }
    }
    return () => {
      cancelled = true
    }
  }, [
    value,
    bcid,
    scale,
    height,
    includeText,
    preset.scale,
    preset.height,
    preset.includeText,
    preset.textSize,
    textSize,
    textFont,
    barColor,
    background,
  ])

  return (
    <div
      data-slot="universal-barcode"
      data-mode={mode}
      className={cn("inline-flex items-center justify-center", className)}
      // Inline SVG output from bwip-js; safe — produced from a single string value.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export { UniversalBarcode }
