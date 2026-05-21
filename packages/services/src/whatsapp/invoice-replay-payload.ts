/**
 * Shared invoice-WhatsApp replay-payload builders.
 *
 * Extracted from apps/dashboard/app/api/whatsapp/send-invoice/route.ts in
 * the SB-1 / W2 PR 2 work (the failed-send retry action). Catalog #9 —
 * "abstract on second use, not first" — applies cleanly: the send-invoice
 * route is the FIRST consumer (the initial invoice→WhatsApp send); the
 * NEW /api/whatsapp/retry-send route is the SECOND consumer (replay a
 * previously-failed send). Both must produce IDENTICAL payloads for the
 * same invoice — that invariant is what this module gives them.
 *
 * Two surfaces:
 *
 *   - `buildInvoiceMessage(invoice)` — for `sendmessage` (direct mode).
 *     Composes the WhatsApp markdown-subset summary text. Pure: invoice in,
 *     string out.
 *
 *   - `buildInvoiceTemplateComponents(...)` — for `sendtemplatemessage`.
 *     Translates the dialog's flat template inputs into the nested
 *     `components` array WPBox expects. Pure: invoice + optional media-URL
 *     bits in, components array out.
 *
 * Plus the `InvoiceLike` interface — the minimum shape both builders need
 * from an invoice. Mirrors the field set the existing send-invoice route
 * was already using (extracted verbatim).
 *
 * **What this module deliberately does NOT do:** Supabase calls, env reads,
 * URL signing, payment-mode classification. Same purity contract as the
 * shared `audit/with-audit.ts` family — wrappers compose stateful glue,
 * pure functions stay pure.
 */

import {
  buildHeaderMediaComponent,
  type WhatsAppTemplateComponent,
} from "../whatsapp.service"

/**
 * The subset of an invoice that the WhatsApp replay-payload builders need.
 * Verbatim from the send-invoice route's prior inline interface (PR #141
 * lineage). Both consumers (send-invoice + retry-send) load a full invoice
 * via `createInvoiceServerService` and rely on this structural subset.
 */
export interface InvoiceLike {
  invoiceNumber: string
  status: string
  createdAt: string
  customerName: string
  customerId?: string | null
  customerGstin?: string | null
  awbNumber?: string | null
  baseFreight: number
  docketCharge: number
  pickupCharge?: number | null
  packingCharge?: number | null
  fuelSurcharge: number
  handlingFee: number
  insurance: number
  discount: number
  tax: { cgst: number; sgst: number; igst: number; total: number }
  totalAmount: number
  advancePaid: number
  balance: number
  dueDate?: string | null
  notes?: string | null
  paymentMode: string
}

/**
 * Compose the free-form WhatsApp message body for `sendmessage` (direct
 * mode). Uses WhatsApp's markdown subset (`*bold*`) for label emphasis.
 * Pure: same invoice → same message string, every time. This determinism
 * is what makes retries safe.
 */
export function buildInvoiceMessage(invoice: InvoiceLike): string {
  const formatINR = (n: number) =>
    `₹${Number(n).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const lines: Array<string | null> = [
    `Hello ${invoice.customerName || "customer"},`,
    "",
    "Your tax invoice has been generated.",
    "",
    `*Invoice:* ${invoice.invoiceNumber}`,
    invoice.awbNumber ? `*AWB:* ${invoice.awbNumber}` : null,
    `*Amount:* ${formatINR(invoice.totalAmount)}`,
    `*Balance Due:* ${formatINR(invoice.balance)}`,
    invoice.dueDate
      ? `*Due Date:* ${new Date(invoice.dueDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`
      : null,
    "",
    "Thank you for choosing TAC Express.",
  ]

  return lines.filter((l): l is string => l !== null).join("\n")
}

interface BuildInvoiceTemplateComponentsInput {
  invoice: InvoiceLike
  /**
   * Per-template parameter overrides. When absent OR empty, falls back to
   * the three-param default (customerName, invoiceNumber, formatINR(total))
   * so a fire-and-forget template send produces a sensible body.
   */
  params?: Array<{ text: string }>
  /**
   * Optional public URL for the template's HEADER (DOCUMENT / IMAGE /
   * VIDEO). When absent, only the BODY component is emitted (templates
   * with TEXT-only HEADER, or no HEADER at all).
   */
  mediaUrl?: string
  /** Display filename for HEADER format=DOCUMENT. */
  mediaFilename?: string
  /** HEADER media type. Defaults to "document". */
  mediaKind?: "document" | "image" | "video"
}

/**
 * Translate the dialog's flat template inputs into the nested `components`
 * array WPBox expects. Output shape (in order):
 *
 *   1. HEADER (optional — only when `mediaUrl` is provided; matches the
 *      structure required by templates whose HEADER is DOCUMENT, IMAGE,
 *      or VIDEO).
 *   2. BODY (always — N text parameters matching the template's
 *      `{{1}}…{{N}}` placeholders).
 *
 * Pure: same invoice + same optional inputs → same components array. This
 * determinism is what makes retries safe — a replay produces the IDENTICAL
 * payload the original send produced.
 */
export function buildInvoiceTemplateComponents(
  input: BuildInvoiceTemplateComponentsInput,
): WhatsAppTemplateComponent[] {
  const formatINR = (n: number) =>
    `₹${Number(n).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const effectiveParams =
    input.params && input.params.length > 0
      ? input.params
      : [
          { text: input.invoice.customerName || "Customer" },
          { text: input.invoice.invoiceNumber },
          { text: formatINR(input.invoice.totalAmount) },
        ]

  const components: WhatsAppTemplateComponent[] = []

  if (input.mediaUrl) {
    const kind = input.mediaKind ?? "document"
    if (kind === "document") {
      components.push(
        buildHeaderMediaComponent({
          kind: "document",
          link: input.mediaUrl,
          filename:
            input.mediaFilename ?? `TAC-Invoice-${input.invoice.invoiceNumber}.pdf`,
        }),
      )
    } else if (kind === "image") {
      components.push(
        buildHeaderMediaComponent({ kind: "image", link: input.mediaUrl }),
      )
    } else {
      components.push(
        buildHeaderMediaComponent({ kind: "video", link: input.mediaUrl }),
      )
    }
  }

  components.push({
    type: "BODY",
    parameters: effectiveParams.map((p) => ({
      type: "text" as const,
      text: p.text,
    })),
  })

  return components
}
