"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/primitives/dialog"
import {
  RiWhatsappLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiLoader4Line,
} from "@workspace/ui/icons"

export type DeliveryMode = "direct" | "template"

export interface WhatsAppTemplateOption {
  name: string
  language: string
  status?: string
  body?: string
  /**
   * `"DOCUMENT" | "IMAGE" | "VIDEO" | "TEXT"` (or undefined for templates
   * without a HEADER). When DOCUMENT/IMAGE/VIDEO, the dialog requires a
   * `templateMediaUrl` from the user — otherwise WhatsApp silently
   * rejects the send.
   */
  headerFormat?: string
}

export interface SendWhatsAppValues {
  phone: string
  mode: DeliveryMode
  /** Required when mode === "template" */
  templateName?: string
  templateLanguage?: string
  /** Body parameters in order. */
  templateParams?: Array<{ text: string }>
  /** Public URL of the document/image/video for the template's HEADER. */
  templateMediaUrl?: string
  templateMediaFilename?: string
  templateMediaKind?: "document" | "image" | "video"
}

export interface WhatsappTestStatus {
  ok: boolean
  configured: boolean
  connected: boolean
  /**
   * True when the server can mint signed `/api/public/invoice-pdf` URLs
   * that WhatsApp can fetch. When true, the dialog hides the manual
   * Document URL field — the server fills it in.
   */
  pdfAutoGenAvailable?: boolean
  error?: string
  templates?: WhatsAppTemplateOption[]
}

interface SendWhatsAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerName: string
  defaultPhone?: string
  invoiceNumber: string
  totalAmount: number
  awbNumber?: string
  onSubmit: (values: SendWhatsAppValues) => Promise<void> | void
  isSubmitting?: boolean
  testStatus?: WhatsappTestStatus
  testLoading?: boolean
  onRetryTest?: () => void
  className?: string
}

/**
 * Confirmation dialog for sending an invoice via WhatsApp.
 *
 * The dialog auto-selects the delivery mechanism behind the scenes —
 * operators don't pick modes, edit template parameters, or see WhatsApp's
 * internal template names. They confirm WHO and see a preview of WHAT.
 *
 * Mode selection is implicit:
 *   - **Template** when the WPBox account has approved templates available
 *     (delivers anytime, no 24-hour window). Production default — used by
 *     virtually every send.
 *   - **Direct** when no templates exist (free-form `sendmessage`). The
 *     24h-window caveat is surfaced as a warning so the operator knows
 *     delivery isn't guaranteed for cold contacts.
 */
export function SendWhatsAppDialog({
  open,
  onOpenChange,
  customerName,
  defaultPhone = "",
  invoiceNumber,
  totalAmount,
  awbNumber,
  onSubmit,
  isSubmitting,
  testStatus,
  testLoading,
  onRetryTest,
  className,
}: SendWhatsAppDialogProps) {
  const [phone, setPhone] = React.useState(defaultPhone)
  const [templateMediaUrl, setTemplateMediaUrl] = React.useState<string>("")
  const [error, setError] = React.useState<string | null>(null)
  const [errorDetail, setErrorDetail] = React.useState<string | null>(null)
  const [showDetail, setShowDetail] = React.useState(false)

  /* Available approved templates — drives implicit mode selection. */
  const templates = testStatus?.templates ?? []
  /**
   * Deterministically pick the invoice template. We can't safely auto-
   * select `templates[0]` because WPBox's getTemplates response order
   * isn't stable — once the WPBox account has more than one approved
   * template (utility, marketing, etc.), positional selection picks
   * whatever happens to come back first, which could fire the wrong
   * BODY/HEADER contract for invoice sends.
   *
   * Match order: explicit env var → name pattern (`*invoice*`) → first
   * approved template only when there's exactly one (degenerate case
   * where ordering is moot). Otherwise return undefined.
   */
  const invoiceTemplate = pickInvoiceTemplate(templates)
  /**
   * **Misconfigured template state.** When the WPBox account has
   * approved templates but `pickInvoiceTemplate()` couldn't identify
   * the invoice one (e.g. naming convention drifted, env var unset
   * with multiple templates), DON'T silently fall back to direct mode
   * — that would defeat the deterministic-template guarantee and
   * reintroduce the 24h-window failure. Treat as a blocking config
   * error: the send button stays disabled and a status message
   * surfaces. Operators should set `NEXT_PUBLIC_WHATSAPP_INVOICE_TEMPLATE`
   * to the exact template name.
   */
  const isTemplateMisconfigured = templates.length > 0 && invoiceTemplate === undefined
  const hasTemplates = invoiceTemplate !== undefined
  /* Implicit delivery mode — operator doesn't see this decision. */
  const mode: DeliveryMode = hasTemplates ? "template" : "direct"
  const selectedTemplate = invoiceTemplate

  /* Reset transient state every time the dialog opens. */
  React.useEffect(() => {
    if (!open) return
    setPhone(defaultPhone)
    setTemplateMediaUrl("")
    setError(null)
    setErrorDetail(null)
    setShowDetail(false)
  }, [open, defaultPhone])

  /* Live preview body — direct mode shows the actual free-form message;
   * template mode shows the template body with placeholders resolved
   * from invoice data. */
  const previewMessage = React.useMemo(() => {
    if (mode === "template" && selectedTemplate?.body) {
      const params = buildParamDefaults({
        customerName,
        invoiceNumber,
        totalAmount,
        awbNumber,
      })
      return resolvePlaceholders(selectedTemplate.body, params)
    }
    if (mode === "template") {
      // Template body wasn't returned by the WPBox catalog endpoint — give
      // the operator a sensible neutral preview rather than an empty box.
      return `Invoice ${invoiceNumber} for ${customerName || "customer"} (${formatINR(totalAmount)}) — PDF attached.`
    }
    return buildDirectPreview({ customerName, invoiceNumber, totalAmount, awbNumber })
  }, [mode, selectedTemplate, customerName, invoiceNumber, totalAmount, awbNumber])

  /* Media-attachment plumbing — entirely server-side in production. */
  const requiredMediaKind = mediaKindFromHeaderFormat(selectedTemplate?.headerFormat)
  const requiresMedia = requiredMediaKind !== null
  const autoGenAvailable = Boolean(testStatus?.pdfAutoGenAvailable)
  /**
   * Manual URL is only required when:
   *   - The template needs media (DOCUMENT/IMAGE/VIDEO HEADER), AND
   *   - The server can't auto-generate one. In production the server
   *     fills the URL in transparently; this fallback only fires in
   *     legacy/dev environments without a public origin configured.
   */
  const showUrlField = mode === "template" && requiresMedia && !autoGenAvailable
  const showAttachmentNotice = mode === "template" && requiresMedia && autoGenAvailable

  async function handleSubmit() {
    setError(null)
    setErrorDetail(null)
    setShowDetail(false)
    const trimmedPhone = phone.trim()
    if (!trimmedPhone) {
      setError("Phone number is required")
      return
    }
    const digits = trimmedPhone.replace(/\D/g, "")
    if (digits.length < 10) {
      setError("Phone number must include at least 10 digits")
      return
    }

    const trimmedUrl = templateMediaUrl.trim()
    if (showUrlField && !trimmedUrl) {
      setError(
        `This template requires a ${requiredMediaKind} — paste a public URL.`,
      )
      return
    }
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      setError("Document URL must start with http:// or https://")
      return
    }

    /* Auto-fill template parameters from invoice data. Operators never
     * see or edit these — they're a transport-layer detail of how
     * WhatsApp's template engine works, not a customer-facing field. */
    const templateParams =
      mode === "template" && selectedTemplate
        ? buildAutoTemplateParams({
            template: selectedTemplate,
            customerName,
            invoiceNumber,
            totalAmount,
            awbNumber,
          })
        : undefined

    const values: SendWhatsAppValues = {
      phone: trimmedPhone,
      mode,
      ...(mode === "template" && selectedTemplate
        ? {
            templateName: selectedTemplate.name,
            templateLanguage: selectedTemplate.language,
            templateParams,
            ...(trimmedUrl
              ? {
                  templateMediaUrl: trimmedUrl,
                  templateMediaKind: requiredMediaKind ?? "document",
                  ...(requiredMediaKind === "document" || !requiredMediaKind
                    ? {
                        templateMediaFilename: `TAC-Invoice-${invoiceNumber}.pdf`,
                      }
                    : {}),
                }
              : {}),
          }
        : {}),
    }

    try {
      await onSubmit(values)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      const raw =
        err && typeof err === "object" && "rawResponse" in err
          ? String((err as { rawResponse?: unknown }).rawResponse ?? "")
          : ""
      if (raw) setErrorDetail(raw)
    }
  }

  const sendDisabled =
    isSubmitting ||
    Boolean(testStatus && !testStatus.ok) ||
    Boolean(testLoading) ||
    isTemplateMisconfigured

  /* Show the connectivity pill ONLY when the connection is broken or
   * still loading — once verified, hide it so production users don't
   * see ops-flavored "WHATSAPP CONNECTED" badges on every send. */
  const showStatusPill =
    Boolean(testLoading) || !testStatus || !testStatus.ok

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiWhatsappLine className="h-4 w-4 text-primary" aria-hidden="true" />
            Send invoice via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Invoice {invoiceNumber} will be delivered to the customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Connectivity pill — only when broken or still loading. */}
          {showStatusPill && (
            <ConfigStatusPill
              status={testStatus}
              loading={testLoading}
              onRetry={onRetryTest}
            />
          )}

          {/* Template-misconfigured: blocking error. We have approved
              templates but couldn't resolve which one is the invoice
              template. Don't silently fall back to direct. */}
          {isTemplateMisconfigured && testStatus?.ok && (
            <TemplateMisconfiguredNotice
              templateCount={templates.length}
            />
          )}

          {/* 24-hour policy notice — only when we'll send via direct
              mode (no approved templates available) and the connection
              is healthy. Surfaces the only delivery caveat the operator
              needs to know about. */}
          {mode === "direct" && testStatus?.ok && !isTemplateMisconfigured && (
            <Direct24hNotice />
          )}

          {/* Recipient name (read-only) */}
          <div className="space-y-1.5">
            <Label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
              Recipient
            </Label>
            <div className="flex h-9 items-center border border-border bg-muted/40 px-3 font-sans text-sm text-foreground">
              {customerName || "—"}
            </div>
          </div>

          {/* Editable phone */}
          <div className="space-y-1.5">
            <Label
              htmlFor="wa-phone"
              className="font-mono text-2xs uppercase tracking-widest text-muted-foreground"
            >
              WhatsApp number
            </Label>
            <Input
              id="wa-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="font-mono"
            />
          </div>

          {/* Compact attachment confirmation — production path. */}
          {showAttachmentNotice && (
            <div className="flex items-center gap-2 border border-primary/30 bg-primary/5 px-3 py-2">
              <RiCheckLine
                className="h-3.5 w-3.5 text-primary shrink-0"
                aria-hidden="true"
              />
              <p className="font-mono text-2xs uppercase tracking-widest text-primary">
                Invoice PDF will be attached
              </p>
            </div>
          )}

          {/* Manual URL fallback — fires only when auto-gen is unavailable
              (e.g. local dev without a public tunnel). Production never
              reaches this branch. */}
          {showUrlField && requiredMediaKind && (
            <div className="space-y-1.5">
              <Label
                htmlFor="wa-media-url"
                className="font-mono text-2xs uppercase tracking-widest text-muted-foreground flex items-center gap-2"
              >
                <span>{requiredMediaKind} URL</span>
                <span className="font-sans normal-case text-2xs text-accent-warning">
                  required
                </span>
              </Label>
              <Input
                id="wa-media-url"
                type="url"
                inputMode="url"
                value={templateMediaUrl}
                onChange={(e) => setTemplateMediaUrl(e.target.value)}
                placeholder="https://example.com/invoice.pdf"
                className="font-mono text-xs"
              />
              <p className="font-sans text-2xs leading-snug text-muted-foreground/80">
                WhatsApp fetches this URL server-side — it must be publicly
                reachable.
              </p>
            </div>
          )}

          {/* Live message preview — what the customer will actually see. */}
          <div className="space-y-1.5">
            <Label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
              Preview
            </Label>
            <pre className="border border-border bg-muted/30 px-3 py-2 font-sans text-xs leading-snug text-foreground/90 whitespace-pre-wrap break-words">
              {previewMessage}
            </pre>
          </div>

          {/* Inline error with optional expandable detail. */}
          {error && (
            <div className="space-y-1.5 border border-destructive/40 bg-destructive/5 p-3">
              <p className="font-sans text-xs font-semibold text-destructive break-words">
                {error}
              </p>
              {errorDetail && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowDetail((v) => !v)}
                    className="h-auto px-0 py-0 font-mono text-2xs uppercase tracking-widest text-destructive/80 hover:text-destructive hover:underline underline-offset-2 hover:bg-transparent"
                  >
                    {showDetail ? "Hide details" : "View details"}
                  </Button>
                  {showDetail && (
                    <pre className="mt-1 max-h-32 overflow-auto border border-destructive/20 bg-background/60 px-2 py-1.5 font-mono text-2xs leading-snug text-foreground/80 whitespace-pre-wrap break-all">
                      {errorDetail}
                    </pre>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={sendDisabled}
            className="font-mono text-xs uppercase tracking-wider"
          >
            <RiWhatsappLine className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="ml-1.5">
              {isSubmitting ? "Sending…" : "Send invoice"}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  Sub-components                                                           */
/* ════════════════════════════════════════════════════════════════════════ */

function ConfigStatusPill({
  status,
  loading,
  onRetry,
}: {
  status: WhatsappTestStatus | undefined
  loading: boolean | undefined
  onRetry?: () => void
}) {
  if (loading || !status) {
    return (
      <div className="flex items-center gap-2 border border-border/60 bg-muted/30 px-3 py-2">
        <RiLoader4Line
          className="h-3.5 w-3.5 text-muted-foreground animate-spin"
          aria-hidden="true"
        />
        <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
          Checking WhatsApp connection…
        </p>
      </div>
    )
  }

  // The healthy state isn't rendered here — the parent hides this pill
  // entirely when status.ok is true.
  const headline = !status.configured
    ? "WhatsApp not configured"
    : "WhatsApp connection failed"

  return (
    <div className="space-y-1 border border-destructive/40 bg-destructive/5 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <RiErrorWarningLine
            className="h-3.5 w-3.5 text-destructive shrink-0"
            aria-hidden="true"
          />
          <p className="font-mono text-2xs uppercase tracking-widest text-destructive">
            {headline}
          </p>
        </div>
        {onRetry && (
          <Button
            type="button"
            variant="ghost"
            onClick={onRetry}
            className="h-auto shrink-0 px-0 py-0 font-mono text-2xs uppercase tracking-widest text-destructive/80 hover:text-destructive hover:underline underline-offset-2 hover:bg-transparent"
          >
            Retry
          </Button>
        )}
      </div>
      {!status.configured && (
        <p className="font-sans text-2xs leading-snug text-muted-foreground pl-5">
          Contact an administrator to enable invoice messaging.
        </p>
      )}
    </div>
  )
}

function TemplateMisconfiguredNotice({
  templateCount,
}: {
  templateCount: number
}) {
  return (
    <div className="border border-destructive/40 bg-destructive/5 px-3 py-2 space-y-1">
      <div className="flex items-center gap-2">
        <RiErrorWarningLine
          className="h-3.5 w-3.5 text-destructive shrink-0"
          aria-hidden="true"
        />
        <p className="font-mono text-2xs uppercase tracking-widest text-destructive">
          Template not configured
        </p>
      </div>
      <p className="font-sans text-2xs leading-snug text-muted-foreground pl-5">
        {templateCount === 1
          ? "The single approved template doesn't match the invoice naming pattern. "
          : `Found ${templateCount} approved templates but none matches the invoice pattern. `}
        Set <code className="font-mono">NEXT_PUBLIC_WHATSAPP_INVOICE_TEMPLATE</code>{" "}
        to the exact template name and restart the dashboard.
      </p>
    </div>
  )
}

function Direct24hNotice() {
  return (
    <div className="border border-accent-warning/40 bg-accent-warning/5 px-3 py-2 space-y-1">
      <div className="flex items-center gap-2">
        <RiErrorWarningLine
          className="h-3.5 w-3.5 text-accent-warning shrink-0"
          aria-hidden="true"
        />
        <p className="font-mono text-2xs uppercase tracking-widest text-accent-warning">
          24-hour delivery window
        </p>
      </div>
      <p className="font-sans text-2xs leading-snug text-muted-foreground pl-5">
        This message will only deliver if the customer has messaged your
        WhatsApp Business number in the past 24 hours.
      </p>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  Helpers                                                                  */
/* ════════════════════════════════════════════════════════════════════════ */

/** Format an INR amount the same way the route handler does. */
function formatINR(n: number): string {
  return `₹${Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function buildDirectPreview(input: {
  customerName: string
  invoiceNumber: string
  totalAmount: number
  awbNumber?: string
}): string {
  const lines: Array<string | null> = [
    `Hello ${input.customerName || "customer"},`,
    "",
    "Your tax invoice has been generated.",
    "",
    `*Invoice:* ${input.invoiceNumber}`,
    input.awbNumber ? `*AWB:* ${input.awbNumber}` : null,
    `*Amount:* ${formatINR(input.totalAmount)}`,
    "",
    "Thank you for choosing TAC Express.",
  ]
  return lines.filter((l): l is string => l !== null).join("\n")
}

/** Default param order: name, invoice #, amount, AWB. Trimmed by template needs. */
function buildParamDefaults(input: {
  customerName: string
  invoiceNumber: string
  totalAmount: number
  awbNumber?: string
}): string[] {
  return [
    input.customerName || "Customer",
    input.invoiceNumber,
    formatINR(input.totalAmount),
    input.awbNumber ?? "",
  ]
}

/** Build the exact array of `{ text }` parameters the template expects.
 *  Counts the `{{N}}` placeholders in the template body so we never send
 *  too many (which WhatsApp rejects with "parameter mismatch"). Falls
 *  back to 3 (the canonical name/invoice/amount shape) when the body
 *  text isn't returned by the WPBox getTemplates response. */
function buildAutoTemplateParams(input: {
  template: WhatsAppTemplateOption
  customerName: string
  invoiceNumber: string
  totalAmount: number
  awbNumber?: string
}): Array<{ text: string }> {
  const detected = countPlaceholders(input.template.body ?? "")
  const finalCount = detected > 0 ? detected : 3
  const defaults = buildParamDefaults({
    customerName: input.customerName,
    invoiceNumber: input.invoiceNumber,
    totalAmount: input.totalAmount,
    awbNumber: input.awbNumber,
  })
  const out: Array<{ text: string }> = []
  for (let i = 0; i < finalCount; i++) {
    out.push({ text: defaults[i] ?? "" })
  }
  return out
}

function countPlaceholders(body: string): number {
  const matches = body.match(/\{\{\s*\d+\s*\}\}/g)
  return matches ? matches.length : 0
}

function resolvePlaceholders(body: string, params: string[]): string {
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_match, idx) => {
    const i = parseInt(String(idx), 10) - 1
    return params[i] ?? `{{${idx}}}`
  })
}

/** Map WhatsApp's HEADER format string to our media-kind union. */
function mediaKindFromHeaderFormat(
  fmt: string | undefined,
): "document" | "image" | "video" | null {
  if (!fmt) return null
  const upper = fmt.toUpperCase()
  if (upper === "DOCUMENT") return "document"
  if (upper === "IMAGE") return "image"
  if (upper === "VIDEO") return "video"
  return null // TEXT or other — no media required
}

/**
 * Deterministically pick the invoice template from the WPBox catalog.
 * Match order:
 *   1. `NEXT_PUBLIC_WHATSAPP_INVOICE_TEMPLATE` env (exact name match,
 *      case-insensitive) — production-blessed, lets ops switch templates
 *      without redeploying the dashboard.
 *   2. Name contains "invoice" (case-insensitive) — fallback for the
 *      common case where the template is named `*_invoice` /
 *      `invoice_*` / similar.
 *   3. The single approved template, if there's exactly one — degenerate
 *      case where ordering doesn't matter.
 *   4. `undefined` — refuse to send rather than picking arbitrarily.
 */
function pickInvoiceTemplate(
  templates: readonly WhatsAppTemplateOption[],
): WhatsAppTemplateOption | undefined {
  if (templates.length === 0) return undefined

  const explicit =
    typeof process !== "undefined"
      ? process.env?.NEXT_PUBLIC_WHATSAPP_INVOICE_TEMPLATE?.trim()
      : undefined
  if (explicit) {
    const exact = templates.find((t) => t.name.toLowerCase() === explicit.toLowerCase())
    if (exact) return exact
  }

  const byPattern = templates.find((t) => /invoice/i.test(t.name))
  if (byPattern) return byPattern

  if (templates.length === 1) return templates[0]

  return undefined
}
