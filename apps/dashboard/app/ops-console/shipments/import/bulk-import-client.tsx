"use client"

import * as React from "react"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { Button } from "@workspace/ui/components/button"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { useBulkCreateShipments } from "@workspace/services/hooks/use-shipments"
import { useNotificationStore } from "@workspace/services/stores/notification.store"
import { RiUploadLine, RiCheckLine, RiCloseLine, RiFileTextLine, RiDownloadLine } from "@workspace/ui/icons"

const REQUIRED_COLUMNS = [
  "sender_name",
  "sender_phone",
  "sender_pincode",
  "receiver_name",
  "receiver_phone",
  "receiver_pincode",
  "origin_hub",
  "dest_hub",
  "pieces",
  "dead_weight",
  "service_level",
  "transport_mode",
  "payment_mode",
] as const

type ParsedRow = {
  rowNumber: number
  data: Record<string, string>
  errors: string[]
}

export function BulkImportClient() {
  const [file, setFile] = React.useState<File | null>(null)
  const [rows, setRows] = React.useState<ParsedRow[]>([])
  const [submitted, setSubmitted] = React.useState<{
    inserted: number
    failed: number
    errors?: { row: number; message: string }[]
  } | null>(null)
  const bulkCreate = useBulkCreateShipments()
  const addNotification = useNotificationStore((s) => s.addNotification)

  const submitting = bulkCreate.isPending
  const validRows = rows.filter((r) => r.errors.length === 0)
  const invalidRows = rows.filter((r) => r.errors.length > 0)

  function handleFile(f: File) {
    setFile(f)
    setSubmitted(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? "")
      const parsed = parseCsv(text)
      setRows(parsed)
    }
    reader.readAsText(f)
  }

  async function handleSubmit() {
    if (validRows.length === 0) return
    // Map parsed rows → shipment payload using DB column names.
    // `validRows` has already been filtered to require all REQUIRED_COLUMNS
    // (see parseCsv below) — the `?? ""` defaults are TS-only proofs that
    // the field is a string; runtime values are guaranteed non-empty.
    const payload = validRows.map((r) => ({
      sender_name: r.data.sender_name ?? "",
      sender_phone: r.data.sender_phone ?? "",
      sender_pincode: r.data.sender_pincode ?? "",
      sender_address: r.data.sender_address ?? "",
      sender_city: r.data.sender_city ?? "",
      sender_state: r.data.sender_state ?? "",
      receiver_name: r.data.receiver_name ?? "",
      receiver_phone: r.data.receiver_phone ?? "",
      receiver_pincode: r.data.receiver_pincode ?? "",
      receiver_address: r.data.receiver_address ?? "",
      receiver_city: r.data.receiver_city ?? "",
      receiver_state: r.data.receiver_state ?? "",
      origin_hub: (r.data.origin_hub ?? "").toUpperCase(),
      dest_hub: (r.data.dest_hub ?? "").toUpperCase(),
      pieces: Number(r.data.pieces ?? 0),
      dead_weight: Number(r.data.dead_weight ?? 0),
      chargeable_weight: Number(r.data.chargeable_weight ?? r.data.dead_weight ?? 0),
      rate_per_kg: Number(r.data.rate_per_kg ?? 0),
      service_level: (r.data.service_level ?? "STANDARD").toUpperCase(),
      transport_mode: (r.data.transport_mode ?? "TRUCK").toUpperCase(),
      payment_mode: (r.data.payment_mode ?? "PAID").toUpperCase(),
    }))
    try {
      const result = await bulkCreate.mutateAsync(payload)
      setSubmitted({
        inserted: result.inserted,
        failed: result.failed + invalidRows.length,
        errors: result.errors,
      })
      addNotification({
        type: result.failed > 0 ? "warning" : "success",
        title: "Bulk import complete",
        message: `${result.inserted} shipments created${
          result.failed > 0 ? `, ${result.failed} failed` : ""
        }.`,
      })
    } catch (err) {
      addNotification({
        type: "error",
        title: "Bulk import failed",
        message: (err as Error).message,
      })
    }
  }

  function downloadTemplate() {
    const header = REQUIRED_COLUMNS.join(",")
    const sample = [
      "Acme Industries", "9876543210", "795001",
      "Delta Traders", "9876512340", "110037",
      "IMP", "DEL", "2", "12.5", "standard", "road", "prepaid",
    ].join(",")
    const blob = new Blob([`${header}\n${sample}\n`], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "tac-shipments-template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageShell width="wide">
      <PageHeader
        overline="Operations"
        title="Bulk Import Shipments"
        description="Upload a CSV to create up to 1000 shipments at a time."
        actions={
          <Button variant="outline" onClick={downloadTemplate}>
            <RiDownloadLine className="mr-2 size-4" aria-hidden="true" />
            Download template
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Detected rows" value={rows.length} />
        <Stat label="Valid rows" value={validRows.length} tone="ok" />
        <Stat label="Rows with errors" value={invalidRows.length} tone={invalidRows.length > 0 ? "danger" : "ok"} />
      </div>

      {!file && (
        <label className="tac-fui-panel relative flex cursor-pointer flex-col items-center justify-center gap-2 px-8 py-16 text-center transition-colors hover:border-primary">
          {/* eslint-disable-next-line no-restricted-syntax -- Native <input type="file"> inside <label> is the standard pattern for custom file upload UI; shadcn Input does not support file picking */}
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
          <RiUploadLine className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Drop a CSV here</p>
          <p className="text-sm text-foreground">or click to browse</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Required columns: {REQUIRED_COLUMNS.join(", ")}
          </p>
        </label>
      )}

      {file && rows.length === 0 && (
        <EmptyState
          icon={<RiFileTextLine className="size-6" aria-hidden="true" />}
          title="Couldn't parse this file"
          description="Confirm the file is a CSV and the header row uses the expected column names."
          action={<Button onClick={() => { setFile(null); setRows([]) }}>Try again</Button>}
        />
      )}

      {file && rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {file.name} · {rows.length} rows
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { setFile(null); setRows([]); setSubmitted(null) }}>
                Reset
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={validRows.length === 0 || submitting}
              >
                Import {validRows.length} valid {validRows.length === 1 ? "shipment" : "shipments"}
              </Button>
            </div>
          </div>

          <div className="border border-border">
            <div className="grid grid-cols-[60px_120px_1fr] border-b border-border bg-muted/40 px-3 py-2 text-2xs font-mono uppercase tracking-wider text-muted-foreground">
              <span>Row</span>
              <span>Status</span>
              <span>Detail</span>
            </div>
            {rows.map((r) => (
              <div
                key={r.rowNumber}
                className="grid grid-cols-[60px_120px_1fr] items-center border-b border-border px-3 py-2 text-sm last:border-0"
              >
                <span className="font-mono text-xs text-muted-foreground">#{r.rowNumber}</span>
                <span>
                  {r.errors.length === 0 ? (
                    <Badge variant="default" className="border-accent-success text-accent-success-foreground bg-accent-success/15">
                      <RiCheckLine className="size-3" aria-hidden="true" /> Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <RiCloseLine className="size-3" aria-hidden="true" /> {r.errors.length} issue{r.errors.length === 1 ? "" : "s"}
                    </Badge>
                  )}
                </span>
                <span className="truncate text-foreground">
                  {r.errors.length === 0
                    ? `${r.data.sender_name} → ${r.data.receiver_name} (${r.data.origin_hub} → ${r.data.dest_hub})`
                    : r.errors.join(", ")}
                </span>
              </div>
            ))}
          </div>

          {submitted && (
            <div className="tac-fui-panel border-l-4 border-l-accent-success bg-card p-4">
              <p className="font-mono text-xs uppercase tracking-wider text-accent-success">Import complete</p>
              <p className="mt-1 text-sm text-foreground">
                Created <span className="font-mono">{submitted.inserted}</span> shipments.{" "}
                {submitted.failed > 0 && (
                  <span className="text-muted-foreground">
                    Skipped <span className="font-mono">{submitted.failed}</span> rows with errors.
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "ok" | "danger" }) {
  return (
    <div className="tac-fui-panel p-4">
      <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={
          "mt-1 font-mono text-2xl " +
          (tone === "ok" ? "text-accent-success" : tone === "danger" ? "text-accent-danger" : "text-foreground")
        }
      >
        {value}
      </p>
    </div>
  )
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []
  const header = (lines[0] ?? "").split(",").map((c) => c.trim().toLowerCase())
  const out: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = (lines[i] ?? "").split(",").map((c) => c.trim())
    const data: Record<string, string> = {}
    header.forEach((col, idx) => {
      data[col] = cells[idx] ?? ""
    })
    const errors: string[] = []
    for (const required of REQUIRED_COLUMNS) {
      if (!data[required]) errors.push(`Missing ${required}`)
    }
    if (data.pieces && Number.isNaN(Number(data.pieces))) errors.push("pieces is not a number")
    if (data.dead_weight && Number.isNaN(Number(data.dead_weight))) errors.push("dead_weight is not a number")
    out.push({ rowNumber: i + 1, data, errors })
  }
  return out
}
