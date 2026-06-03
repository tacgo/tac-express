"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/primitives/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/primitives/table"
import { ScrollArea } from "@workspace/ui/components/primitives/scroll-area"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { BarcodeScanner } from "@workspace/ui/components/primitives/barcode-scanner"
import {
  RiKeyboardLine,
  RiBarcodeBoxLine,
  RiCameraLine,
  RiCheckLine,
  RiCloseLine,
  RiAlertLine,
  RiDeleteBinLine,
} from "@workspace/ui/icons"

export type ScanResult = "SUCCESS" | "DUPLICATE" | "ERROR"

export interface ScanLogEntry {
  id: string
  awb: string
  result: ScanResult
  reason?: string
  at: number
}

export interface ManifestShipmentRow {
  awbNumber: string
  consigneeName?: string
  consigneeCity?: string
  consignorName?: string
  consignorCity?: string
  pieces?: number
  weightKg?: number
  status?: string
}

interface StepAddShipmentsProps {
  /** Stable identifier for the manifest route, shown in the banner */
  routeBanner: string
  /** Hook called for every accepted scan; component is fully controlled. */
  onScan: (awb: string) => Promise<{ result: ScanResult; reason?: string }>
  /** Currently added shipments — drives table + stats. */
  rows: ManifestShipmentRow[]
  /** Remove an AWB from the manifest. */
  onRemove?: (awb: string) => void
  className?: string
}

export function StepAddShipments({
  routeBanner,
  onScan,
  rows,
  onRemove,
  className,
}: StepAddShipmentsProps) {
  const [tab, setTab] = React.useState<"manual" | "usb" | "camera">("manual")
  const [manualValue, setManualValue] = React.useState("")
  const [scanLog, setScanLog] = React.useState<ScanLogEntry[]>([])
  const [search, setSearch] = React.useState("")
  const deferredSearch = React.useDeferredValue(search)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const stats = React.useMemo(() => {
    const success = scanLog.filter((s) => s.result === "SUCCESS").length
    const dupes = scanLog.filter((s) => s.result === "DUPLICATE").length
    const errors = scanLog.filter((s) => s.result === "ERROR").length
    const weight = rows.reduce((s, r) => s + (r.weightKg ?? 0), 0)
    return { success, dupes, errors, weight }
  }, [scanLog, rows])

  const append = (awb: string, result: ScanResult, reason?: string) => {
    setScanLog((log) =>
      [
        {
          id: `${awb}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          awb,
          result,
          reason,
          at: Date.now(),
        },
        ...log,
      ].slice(0, 50)
    )
  }

  const submit = async (raw: string) => {
    const awb = raw.trim().toUpperCase()
    if (!awb) return
    try {
      const r = await onScan(awb)
      append(awb, r.result, r.reason)
    } catch (err) {
      append(awb, "ERROR", (err as Error).message)
    }
  }

  // Keep manual input focused for HID scanners (USB tab)
  React.useEffect(() => {
    if (tab === "manual" || tab === "usb") {
      inputRef.current?.focus()
    }
  }, [tab])

  // Optimize search: Deferred value prevents main thread blocking when typing
  // and filtering through large lists of scanned shipments.
  const filteredRows = React.useMemo(() => {
    if (!deferredSearch.trim()) return rows
    const q = deferredSearch.toLowerCase()
    return rows.filter(
      (r) =>
        r.awbNumber.toLowerCase().includes(q) ||
        r.consigneeName?.toLowerCase().includes(q) ||
        r.consignorName?.toLowerCase().includes(q)
    )
  }, [rows, deferredSearch])

  return (
    <div
      data-slot="manifest-step-add-shipments"
      className={cn("grid gap-4 lg:grid-cols-[2fr_3fr]", className)}
    >
      {/* LEFT: scan controls + log */}
      <section className="grid gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual">
              <RiKeyboardLine />
              Manual
            </TabsTrigger>
            <TabsTrigger value="usb">
              <RiBarcodeBoxLine />
              USB Scanner
            </TabsTrigger>
            <TabsTrigger value="camera">
              <RiCameraLine />
              Camera
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-3">
            <ScanInputBlock
              ref={inputRef}
              label="Type or paste an AWB and press Enter"
              onSubmit={submit}
              value={manualValue}
              onValueChange={setManualValue}
            />
          </TabsContent>

          <TabsContent value="usb" className="mt-3">
            <ScanInputBlock
              ref={inputRef}
              label="USB scanner — input is auto-focused"
              onSubmit={submit}
              value={manualValue}
              onValueChange={setManualValue}
            />
          </TabsContent>

          <TabsContent value="camera" className="mt-3">
            <BarcodeScanner
              onDecode={submit}
              paused={tab !== "camera"}
              ariaLabel="Manifest camera scanner"
            />
          </TabsContent>
        </Tabs>

        {/* Stats grid */}
        <dl className="grid grid-cols-4 gap-px border border-border bg-border">
          <StatTile
            label="Added"
            value={rows.length}
            tone="default"
          />
          <StatTile label="Dupes" value={stats.dupes} tone="warning" />
          <StatTile label="Errors" value={stats.errors} tone="error" />
          <StatTile
            label="Weight"
            value={`${stats.weight.toFixed(1)}kg`}
            tone="default"
          />
        </dl>

        {/* Scan log */}
        <div className="border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
              Scan Log · last 50
            </span>
            {scanLog.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setScanLog([])}
                className="h-auto px-1 py-0.5 font-mono text-2xs uppercase tracking-widest text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>
          <ScrollArea className="h-56">
            {scanLog.length === 0 ? (
              <div className="flex h-56 items-center justify-center font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
                Awaiting scans…
              </div>
            ) : (
              <ul>
                {scanLog.map((entry) => (
                  <li
                    key={entry.id}
                    data-result={entry.result}
                    className={cn(
                      "flex items-center gap-2 border-l-2 border-transparent px-3 py-1.5 text-xs",
                      entry.result === "SUCCESS" &&
                        "border-l-status-success/70",
                      entry.result === "DUPLICATE" &&
                        "border-l-status-warning/70",
                      entry.result === "ERROR" && "border-l-destructive/70"
                    )}
                  >
                    {entry.result === "SUCCESS" ? (
                      <RiCheckLine className="size-3.5 text-status-success" />
                    ) : entry.result === "DUPLICATE" ? (
                      <RiAlertLine className="size-3.5 text-status-warning" />
                    ) : (
                      <RiCloseLine className="size-3.5 text-destructive" />
                    )}
                    <span className="font-mono text-ui-11 font-semibold">
                      {entry.awb}
                    </span>
                    {entry.reason && (
                      <span className="ml-auto truncate text-ui-10 text-muted-foreground">
                        {entry.reason}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      </section>

      {/* RIGHT: shipments table */}
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
            Route · {routeBanner}
          </p>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search CN / consignee / consignor"
            className="max-w-xs"
          />
        </div>

        <div className="border border-border bg-background">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-muted/30 text-left font-mono text-2xs uppercase tracking-widest text-muted-foreground hover:bg-muted/30">
                <TableHead className="h-auto px-3 py-2 text-muted-foreground">CN Number</TableHead>
                <TableHead className="h-auto px-3 py-2 text-muted-foreground">Consignee</TableHead>
                <TableHead className="h-auto px-3 py-2 text-muted-foreground">Consignor</TableHead>
                <TableHead className="h-auto px-3 py-2 text-right text-muted-foreground">Load</TableHead>
                <TableHead className="h-auto px-3 py-2 text-muted-foreground">Status</TableHead>
                <TableHead className="h-auto w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="px-3 py-10 text-center font-mono text-2xs uppercase tracking-widest text-muted-foreground"
                  >
                    {rows.length === 0
                      ? "Scan AWBs to populate this manifest"
                      : "No matches for this search"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((r) => (
                  <TableRow key={r.awbNumber}>
                    <TableCell className="px-3 py-2 font-mono text-xs font-semibold">
                      {r.awbNumber}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="font-medium">{r.consigneeName ?? "—"}</div>
                      {r.consigneeCity && (
                        <div className="font-mono text-2xs uppercase text-muted-foreground">
                          {r.consigneeCity}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="font-medium">{r.consignorName ?? "—"}</div>
                      {r.consignorCity && (
                        <div className="font-mono text-2xs uppercase text-muted-foreground">
                          {r.consignorCity}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right font-mono text-xs">
                      {r.pieces ?? 0} · {(r.weightKg ?? 0).toFixed(1)}kg
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      {r.status && (
                        <Badge variant="secondary" className="font-mono">
                          {r.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      {onRemove && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemove(r.awbNumber)}
                          aria-label={`Remove ${r.awbNumber}`}
                          className="size-7 text-muted-foreground hover:text-destructive"
                        >
                          <RiDeleteBinLine className="size-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────────────

const ScanInputBlock = React.forwardRef<
  HTMLInputElement,
  {
    label: string
    value: string
    onValueChange: (v: string) => void
    onSubmit: (v: string) => void | Promise<void>
  }
>(function ScanInputBlock({ label, value, onValueChange, onSubmit }, ref) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input
        ref={ref}
        value={value}
        autoFocus
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onValueChange(e.target.value.toUpperCase())}
        onKeyDown={async (e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            await onSubmit(value)
            onValueChange("")
          }
        }}
        className="h-12 font-mono text-sm uppercase tracking-widest"
      />
    </div>
  )
})

function StatTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: "default" | "warning" | "error"
}) {
  return (
    <div className="bg-background p-3">
      <p className="font-mono text-ui-9 uppercase tracking-wordmark text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-heading text-lg font-semibold tracking-tight",
          tone === "warning" && "text-status-warning",
          tone === "error" && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  )
}
