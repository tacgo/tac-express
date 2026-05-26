"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import {
  FileDropzone,
  type FileDropzoneFile,
} from "@workspace/ui/components/primitives/file-dropzone"
import { SignaturePad } from "@workspace/ui/components/primitives/signature-pad"
import { RiCheckLine, RiCloseLine } from "@workspace/ui/icons"

export interface PodPayload {
  /** AWB this POD belongs to. */
  awbNumber: string
  /** Recipient signed-off name (printed name on POD). */
  recipientName: string
  /** Optional relationship (Self / Family / Office / Security). */
  recipientRelation?: string
  /** Photo evidence files (POD shots, packing list, condition). */
  photos: FileDropzoneFile[]
  /** Signature data URL (PNG, transparent background). */
  signatureDataUrl: string | null
  /** ISO timestamp captured at submission. */
  capturedAt: string
}

interface PodCaptureProps {
  awbNumber: string
  onSubmit?: (payload: PodPayload) => void | Promise<void>
  onCancel?: () => void
  className?: string
}

const RELATIONS = ["Self", "Family", "Office", "Security", "Other"]

export function PodCapture({
  awbNumber,
  onSubmit,
  onCancel,
  className,
}: PodCaptureProps) {
  const [recipientName, setRecipientName] = React.useState("")
  const [recipientRelation, setRecipientRelation] =
    React.useState<string>("Self")
  const [photos, setPhotos] = React.useState<FileDropzoneFile[]>([])
  const [signature, setSignature] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const valid =
    recipientName.trim().length > 1 && (photos.length > 0 || signature !== null)

  const handleSubmit = async () => {
    if (!valid || !onSubmit) return
    setSubmitting(true)
    try {
      await onSubmit({
        awbNumber,
        recipientName: recipientName.trim(),
        recipientRelation,
        photos,
        signatureDataUrl: signature,
        capturedAt: new Date().toISOString(),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      data-slot="pod-capture"
      className={cn(
        // bg-surface-floating signals "modal-like elevated capture step"
        // distinct from the static console it sits inside (LAW 9, surface tier).
        "grid gap-5 border border-border border-l-4 border-l-status-success bg-surface-floating shadow-md p-5",
        className
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="tac-mono-label text-muted-foreground">Proof of Delivery</p>
          <p className="mt-1 font-mono text-sm font-semibold tracking-widest tabular-nums">
            {awbNumber}
          </p>
        </div>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            aria-label="Cancel POD capture"
          >
            <RiCloseLine />
          </Button>
        )}
      </header>

      {/* Recipient details */}
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div className="grid gap-1.5">
          <Label htmlFor="pod-recipient">Recipient name</Label>
          <Input
            id="pod-recipient"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Name printed on POD"
            autoComplete="off"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pod-relation">Relation</Label>
          {/* eslint-disable-next-line no-restricted-syntax -- Native select for POD relation field; used with direct state binding, not RHF */}
          <select
            id="pod-relation"
            value={recipientRelation}
            onChange={(e) => setRecipientRelation(e.target.value)}
            className="flex h-9 w-full border border-input bg-transparent px-2 font-mono text-xs uppercase tracking-wide focus-visible:outline-none focus-visible:tac-focus-premium"
          >
            {RELATIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Photo evidence */}
      <div className="grid gap-1.5">
        <Label>Photo evidence (optional, up to 5)</Label>
        <FileDropzone
          value={photos}
          onChange={setPhotos}
          accept="image/*"
          maxFiles={5}
          maxSizeBytes={5 * 1024 * 1024}
          label="Drop POD photos here or click to capture"
          showPreviews
        />
      </div>

      {/* Signature */}
      <div className="grid gap-1.5">
        <Label>Recipient signature</Label>
        <SignaturePad
          width={520}
          height={140}
          onChange={setSignature}
          ariaLabel="Recipient signature pad"
        />
      </div>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
        {onCancel && (
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!valid || submitting}
        >
          <RiCheckLine />
          {submitting ? "Submitting…" : "Confirm Delivery"}
        </Button>
      </footer>
    </section>
  )
}
