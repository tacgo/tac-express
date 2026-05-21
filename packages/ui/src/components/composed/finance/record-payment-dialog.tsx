"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import { Textarea } from "@workspace/ui/components/primitives/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/primitives/dialog"
import {
  Combobox,
  type ComboboxOption,
} from "@workspace/ui/components/primitives/combobox"
import { DatePicker } from "@workspace/ui/components/primitives/date-picker"
import { RiMoneyDollarCircleLine } from "@workspace/ui/icons"

export type PaymentMethod =
  | "CASH"
  | "UPI"
  | "BANK_TRANSFER"
  | "CHEQUE"
  | "CARD"
  | "NEFT_RTGS"
  | "WALLET"
  | "OTHER"

export interface RecordPaymentValues {
  amount: number
  method: PaymentMethod
  reference?: string
  notes?: string
  receivedAt: string
}

const METHOD_OPTIONS: ComboboxOption[] = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "Card" },
  { value: "NEFT_RTGS", label: "NEFT / RTGS" },
  { value: "WALLET", label: "Wallet" },
  { value: "OTHER", label: "Other" },
]

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Maximum amount the user can record (current invoice balance). */
  maxAmount: number
  /** Locale + currency for input formatting. */
  locale?: string
  currency?: string
  onSubmit: (values: RecordPaymentValues) => Promise<void> | void
  className?: string
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  maxAmount,
  locale = "en-IN",
  currency = "INR",
  onSubmit,
  className,
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = React.useState<string>(
    String(maxAmount > 0 ? maxAmount : "")
  )
  const [method, setMethod] = React.useState<PaymentMethod>("UPI")
  const [reference, setReference] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [receivedAt, setReceivedAt] = React.useState<Date | undefined>(
    new Date()
  )
  const [submitting, setSubmitting] = React.useState(false)

  // Re-seed the amount when the dialog opens with a fresh balance.
  React.useEffect(() => {
    if (open) {
      setAmount(String(maxAmount > 0 ? maxAmount : ""))
      setReference("")
      setNotes("")
      setReceivedAt(new Date())
    }
  }, [open, maxAmount])

  const fmt = React.useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }),
    [locale, currency]
  )

  const parsed = Number.parseFloat(amount)
  const valid =
    !Number.isNaN(parsed) &&
    parsed > 0 &&
    parsed <= maxAmount + 0.001 &&
    Boolean(receivedAt)

  const handleSubmit = async () => {
    if (!valid || !receivedAt) return
    setSubmitting(true)
    try {
      await onSubmit({
        amount: Number(parsed.toFixed(2)),
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        receivedAt: receivedAt.toISOString(),
      })
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Outstanding balance: {fmt.format(maxAmount)}. Partial payments
            are supported.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="payment-amount">Amount</Label>
            <Input
              id="payment-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              className="font-mono text-base tracking-wide"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Method</Label>
            <Combobox
              options={METHOD_OPTIONS}
              value={method}
              onChange={(v) => setMethod(v as PaymentMethod)}
              placeholder="Select method"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="payment-ref">Reference (optional)</Label>
              <Input
                id="payment-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="UPI ref / cheque no / TXN ID"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Received on</Label>
              <DatePicker value={receivedAt} onChange={setReceivedAt} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="payment-notes">Notes (optional)</Label>
            <Textarea
              id="payment-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context for finance — bank, branch, batch number…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!valid || submitting}
          >
            <RiMoneyDollarCircleLine />
            {submitting ? "Recording…" : `Record ${fmt.format(parsed || 0)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
