/**
 * QR code generation for invoice PDFs.
 *
 * Wraps `bwip-js` (already a workspace dep used elsewhere for Code-128
 * shipping-label barcodes) to produce a PNG buffer suitable for embedding
 * via `@react-pdf/renderer`'s `<Image src={{ data, format: "png" }} />`.
 *
 * Server-only — `bwip-js` resolves a Node-specific entrypoint that uses
 * the `canvas` package indirectly. Do not import from a client component.
 *
 * Sized for invoice headers: ~45mm square at 300 DPI (~530px PNG). The
 * `scale` parameter trades file size for crispness; 4 is the sweet spot
 * between sharp print rendering and reasonable buffer size.
 */

/**
 * `bwip-js` v4 ships its `.d.ts` under `bwip-js/types/...` which the
 * workspace's `moduleResolution: "bundler"` doesn't discover via the
 * bare-import name — and putting `declare module "bwip-js"` inside a
 * module file is treated as augmentation rather than a fresh
 * declaration. Pragmatic fix: suppress the resolution error and cast
 * the default export to a strongly-typed local shape. The runtime API
 * is stable across v4.x so the type drift risk is nil.
 */
interface BwipJsApi {
  toBuffer(opts: {
    bcid: string
    text: string
    scale?: number
    includetext?: boolean
    eclevel?: "L" | "M" | "Q" | "H" | string
    paddingwidth?: number
    paddingheight?: number
  }): Promise<Buffer>
}

// @ts-expect-error -- types unresolvable under bundler module resolution; runtime export is stable
import bwipjsRaw from "bwip-js"
const bwipjs = bwipjsRaw as BwipJsApi

export interface InvoiceQrInput {
  /** What the QR encodes — typically a public tracking URL. */
  text: string
  /**
   * Pixel multiplier. Higher = sharper print but larger file.
   * Default 4 produces ~480-540px wide PNGs.
   */
  scale?: number
}

/**
 * Generate a QR code PNG buffer encoding `text`.
 * Returns null on failure rather than throwing — callers should treat
 * QR as optional and degrade gracefully (the invoice is still useful
 * without it).
 */
export async function generateQrPng(input: InvoiceQrInput): Promise<Buffer | null> {
  try {
    const png = await bwipjs.toBuffer({
      bcid: "qrcode",
      text: input.text,
      scale: input.scale ?? 4,
      // No surrounding text under the QR — the body text in the WhatsApp
      // message already explains "Tap to track" implicitly.
      includetext: false,
      // QR ECC level "M" is the WhatsApp/postal-label default — recovers
      // ~15% of damage. Higher levels produce denser, larger codes which
      // hurt rendering at small print sizes.
      eclevel: "M",
      // No padding — the React-PDF layout handles its own spacing.
      paddingwidth: 0,
      paddingheight: 0,
    })
    return png
  } catch (err) {
    console.warn(
      "[invoice-pdf] QR generation failed — rendering invoice without code:",
      err instanceof Error ? err.message : String(err)
    )
    return null
  }
}
