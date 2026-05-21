"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"

import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { ScrollArea } from "@workspace/ui/components/primitives/scroll-area"
import { Button } from "@workspace/ui/components/button"
import {
  RiMoneyDollarCircleLine,
  RiDeleteBinLine,
  RiFileTextLine,
} from "@workspace/ui/icons"

interface Payment {
  id: string
  amount: number
  method: string
  reference?: string
  notes?: string
  receivedAt: string
  attachmentPath?: string
}

interface PaymentTimelineProps {
  payments: Payment[]
  onDelete?: (id: string) => void
  /** Locale + currency for amount formatting. */
  locale?: string
  currency?: string
  className?: string
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
  CHEQUE: "Cheque",
  CARD: "Card",
  NEFT_RTGS: "NEFT / RTGS",
  WALLET: "Wallet",
  OTHER: "Other",
}

export function PaymentTimeline({
  payments,
  onDelete,
  locale = "en-IN",
  currency = "INR",
  className,
}: PaymentTimelineProps) {
  const fmt = React.useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }),
    [locale, currency]
  )

  const total = payments.reduce((s, p) => s + (p.amount ?? 0), 0)

  return (
    <section
      data-slot="payment-timeline"
      className={cn(
        "tac-fui-panel flex flex-col bg-card",
        className
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
            Payment timeline
          </p>
          <p className="mt-0.5 font-heading text-sm font-semibold">
            Received {fmt.format(total)} ·{" "}
            <span className="font-mono text-xs text-muted-foreground">
              {payments.length} record{payments.length === 1 ? "" : "s"}
            </span>
          </p>
        </div>
      </header>

      <ScrollArea className="max-h-72">
        {payments.length === 0 ? (
          <div className="flex h-32 items-center justify-center px-4 text-center">
            <p className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
              No payments recorded
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-border/60">
            {payments.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-3"
              >
                <span className="flex size-8 items-center justify-center border border-border bg-muted">
                  <RiMoneyDollarCircleLine className="size-4 text-status-success" />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-sm font-semibold">
                      {fmt.format(p.amount)}
                    </span>
                    <Badge variant="secondary" className="font-mono">
                      {METHOD_LABELS[p.method] ?? p.method}
                    </Badge>
                    {p.attachmentPath && (
                      <Badge variant="outline" className="font-mono">
                        <RiFileTextLine className="size-3" />
                        Receipt
                      </Badge>
                    )}
                  </p>
                  {p.reference && (
                    <p className="mt-0.5 font-mono text-paper-11 uppercase tracking-widest text-muted-foreground">
                      Ref · {p.reference}
                    </p>
                  )}
                  {p.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.notes}
                    </p>
                  )}
                  <p className="mt-1 font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
                    {format(parseISO(p.receivedAt), "dd MMM yyyy · HH:mm")}
                  </p>
                </div>
                {onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(p.id)}
                    aria-label="Delete payment"
                    className="size-7"
                  >
                    <RiDeleteBinLine className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </ScrollArea>
    </section>
  )
}
