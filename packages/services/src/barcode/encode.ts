/**
 * Real barcode encoding for the dashboard's shipping labels.
 *
 * ## Why this module exists
 *
 * The previous `Code128` and `DataMatrix` helpers in
 * `packages/ui/src/components/composed/shipments/shipping-label.tsx`
 * were decorative seeded patterns — visually plausible but NOT real
 * symbology encodings. Printed labels would not scan; ops would
 * discover this only at the destination hub. Tracked as issue #28.
 *
 * This module replaces those stand-ins with `bwip-js`-encoded SVG
 * strings. The label component receives the encoded SVG as a string
 * and inlines it via `dangerouslySetInnerHTML`. Server-side encoding
 * means:
 *   - bwip-js stays out of the client bundle
 *   - encoding is deterministic per AWB (same input → same SVG bytes)
 *   - SVG scales cleanly from preview (~480 dpi screen) to thermal
 *     print (~203 dpi) without resampling artefacts
 *
 * ## Sync with `qr.ts`
 *
 * `packages/services/src/pdf/qr.ts` already wraps bwip-js for the
 * invoice-PDF QR code. This module follows the same pattern (defensive
 * type wrapper, server-only by virtue of the bwip-js entrypoint),
 * just for the linear barcodes shipping labels need.
 */

/**
 * `bwip-js` v4 ships its `.d.ts` under `bwip-js/types/...` which the
 * workspace's `moduleResolution: "bundler"` doesn't discover via the
 * bare-import name. Pragmatic fix: declare the slim subset we use as a
 * local interface and cast the default export.
 */
interface BwipJsApi {
  toSVG(opts: {
    bcid: string
    text: string
    scale?: number
    /** Bar height in millimeters — bwip-js converts to pixels internally. */
    height?: number
    /** Print module width in millimeters (Code 128 X-dimension). */
    width?: number
    includetext?: boolean
    eclevel?: "L" | "M" | "Q" | "H" | string
    paddingwidth?: number
    paddingheight?: number
    /** Data Matrix shape — 'square' or 'rectangle'. Defaults to square. */
    rows?: number
    columns?: number
  }): string
}

// @ts-expect-error -- types unresolvable under bundler module resolution; runtime export is stable
import bwipjsRaw from "bwip-js"
const bwipjs = bwipjsRaw as BwipJsApi

/**
 * Encode `text` as a real Code 128 barcode and return the SVG markup
 * as a string. The returned SVG is a self-contained `<svg>...</svg>`
 * block ready to inline via `dangerouslySetInnerHTML`.
 *
 * Sizing notes: bwip-js renders bars at module-precision pixel widths.
 * The `width` and `height` opts are millimetre hints used internally
 * to pick the right module size. Callers can rescale via SVG viewBox
 * (the markup is dimensionless once parsed).
 *
 * Throws if `text` is empty or contains characters that Code 128 can't
 * encode (raw bytes outside 0–127 in the ASCII subset). Code 128 in
 * default mode supports ASCII 0-127 plus the four FNC codes; this
 * matches every real-world AWB pattern.
 */
export function encodeCode128Svg(text: string): string {
  if (!text || text.trim().length === 0) {
    throw new Error("Code 128 input must be a non-empty string")
  }
  return bwipjs.toSVG({
    bcid: "code128",
    text,
    // 0.4mm per module — matches GS1 Code 128 minimum for thermal
    // printers at 203dpi. Larger modules (0.5+) read better but eat
    // horizontal space on a 4-inch label.
    scale: 3,
    height: 12,
    includetext: false,
    paddingwidth: 0,
    paddingheight: 0,
  })
}

/**
 * Encode `text` as a real Data Matrix code (ECC 200) and return the
 * SVG markup. The Data Matrix is a 2D symbology that packs more
 * payload into a smaller area than Code 128 — ideal for the second
 * scan target on the FBA 7-zone shipping label.
 *
 * Throws on empty input. bwip-js handles ECC 200 + finder pattern
 * generation internally per the ISO/IEC 16022 spec.
 */
export function encodeDataMatrixSvg(text: string): string {
  if (!text || text.trim().length === 0) {
    throw new Error("Data Matrix input must be a non-empty string")
  }
  return bwipjs.toSVG({
    bcid: "datamatrix",
    text,
    scale: 4,
    paddingwidth: 0,
    paddingheight: 0,
  })
}

/**
 * Encode both barcodes for a shipping label in one call. Convenience
 * wrapper for the print-page server components — they need both
 * barcodes per AWB, so collapsing the two encoder calls keeps the
 * caller code tidy.
 *
 * Throws if either encoder throws (empty input, unsupported chars).
 * Caller is responsible for handling the error — for the print
 * route, that means returning a 5xx rather than rendering an
 * unscannable label.
 */
export function encodeShippingLabelBarcodes(awbNumber: string): {
  code128Svg: string
  dataMatrixSvg: string
} {
  return {
    code128Svg: encodeCode128Svg(awbNumber),
    dataMatrixSvg: encodeDataMatrixSvg(awbNumber),
  }
}
