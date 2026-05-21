"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import { ScrollArea } from "@workspace/ui/components/primitives/scroll-area"
import { Badge } from "@workspace/ui/components/primitives/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/primitives/tabs"
import { BarcodeScanner } from "@workspace/ui/components/primitives/barcode-scanner"
import {
  RiBox3Line,
  RiSendPlaneLine,
  RiListCheck3,
  RiCheckboxCircleLine,
  RiKeyboardLine,
  RiCameraLine,
  RiCheckLine,
  RiCloseLine,
  RiAlertLine,
  RiWifiLine,
  RiWifiOffLine,
  RiBugLine,
  RiTimeLine,
  type RemixiconComponentType,
} from "@workspace/ui/icons"

export type ScanMode =
  | "RECEIVE"
  | "LOAD_MANIFEST"
  | "VERIFY_MANIFEST"
  | "DELIVER"

export type ScanOutcome = "SUCCESS" | "DUPLICATE" | "ERROR"

export interface ScanFeedItem {
  id: string
  awb: string
  outcome: ScanOutcome
  reason?: string
  at: number
}

interface ActiveManifestBanner {
  id: string
  manifestNumber: string
  fromHub: string
  toHub: string
}

interface ScanningConsoleProps {
  /** Current scan mode. */
  mode: ScanMode
  onModeChange: (m: ScanMode) => void
  /** Process a scanned AWB; component is fully controlled. */
  onScan: (
    awb: string,
    mode: ScanMode
  ) => Promise<{ outcome: ScanOutcome; reason?: string }>
  /** Active manifest context (only when LOAD_MANIFEST or VERIFY_MANIFEST). */
  activeManifest?: ActiveManifestBanner | null
  /** Clear the active manifest context. */
  onClearManifest?: () => void
  /** Online state from the scan-queue store. */
  isOnline?: boolean
  /** Pending scans waiting on sync. */
  pendingCount?: number
  /** Failed scans (non-zero retry count). */
  failedCount?: number
  /** Toggle scanner debug overlay. */
  onToggleDebug?: () => void
  /** Children rendered to the right of the console (e.g. POD capture in DELIVER). */
  rightRail?: React.ReactNode
  className?: string
}

const MODES: {
  id: ScanMode
  label: string
  hint: string
  icon: RemixiconComponentType
  tone: "default" | "info" | "warning" | "success"
}[] = [
  {
    id: "RECEIVE",
    label: "Receive",
    hint: "Inbound at hub",
    icon: RiBox3Line,
    tone: "default",
  },
  {
    id: "LOAD_MANIFEST",
    label: "Load Manifest",
    hint: "Outbound dispatch",
    icon: RiSendPlaneLine,
    tone: "info",
  },
  {
    id: "VERIFY_MANIFEST",
    label: "Verify Manifest",
    hint: "Arrival audit",
    icon: RiListCheck3,
    tone: "warning",
  },
  {
    id: "DELIVER",
    label: "Deliver",
    hint: "Last mile + POD",
    icon: RiCheckboxCircleLine,
    tone: "success",
  },
]

export function ScanningConsole({
  mode,
  onModeChange,
  onScan,
  activeManifest,
  onClearManifest,
  isOnline = true,
  pendingCount = 0,
  failedCount = 0,
  onToggleDebug,
  rightRail,
  className,
}: ScanningConsoleProps) {
  const [tab, setTab] = React.useState<"manual" | "camera">("manual")
  const [manualValue, setManualValue] = React.useState("")
  const [feed, setFeed] = React.useState<ScanFeedItem[]>([])
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Session timer (elapsed since component mount). Date.now() is impure, so
  // we initialize the ref in an effect rather than at construction time.
  const startedAt = React.useRef<number>(0)
  const [elapsed, setElapsed] = React.useState(0)
  React.useEffect(() => {
    startedAt.current = Date.now()
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Auto-focus the manual input when on the manual tab
  React.useEffect(() => {
    if (tab === "manual") inputRef.current?.focus()
  }, [tab])

  const submit = async (raw: string) => {
    const awb = raw.trim().toUpperCase()
    if (!awb) return
    try {
      const r = await onScan(awb, mode)
      const item: ScanFeedItem = {
        id: `${awb}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        awb,
        outcome: r.outcome,
        reason: r.reason,
        at: Date.now(),
      }
      setFeed((f) => [item, ...f].slice(0, 100))
    } catch (err) {
      const item: ScanFeedItem = {
        id: `${awb}-${Date.now()}`,
        awb,
        outcome: "ERROR",
        reason: (err as Error).message,
        at: Date.now(),
      }
      setFeed((f) => [item, ...f].slice(0, 100))
    }
  }

  const counts = {
    success: feed.filter((f) => f.outcome === "SUCCESS").length,
    duplicate: feed.filter((f) => f.outcome === "DUPLICATE").length,
    error: feed.filter((f) => f.outcome === "ERROR").length,
  }
  const successRate =
    feed.length > 0 ? Math.round((counts.success / feed.length) * 100) : 0

  return (
    <div
      data-slot="scanning-console"
      className={cn("flex flex-col gap-4", className)}
    >
      {/* Header: mode dot + KPI chips + mode pill bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping bg-primary/60 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 bg-primary" />
          </span>
          <div>
            <p className="tac-mono-label text-muted-foreground">
              Hub Operations Console
            </p>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              {MODES.find((m) => m.id === mode)?.label} ·{" "}
              <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground">
                {MODES.find((m) => m.id === mode)?.hint}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <KpiChip label="Total" value={feed.length} />
          <KpiChip label="OK" value={counts.success} tone="success" />
          <KpiChip label="Err" value={counts.error} tone="error" />
          <KpiChip
            label="Rate"
            value={`${successRate}%`}
            tone={successRate >= 95 ? "success" : "warning"}
          />
          {onToggleDebug && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleDebug}
              aria-label="Toggle debug"
              className="size-8"
            >
              <RiBugLine className="size-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Mode pills */}
      <nav className="grid grid-cols-2 gap-px bg-border/40 lg:grid-cols-4">
        {MODES.map((m) => {
          const isActive = m.id === mode
          const Icon = m.icon
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange(m.id)}
              data-active={isActive}
              data-tone={m.tone}
              className={cn(
                "flex items-center justify-center gap-2 bg-background px-3 py-2 transition-colors",
                "hover:bg-muted/40",
                isActive && "bg-primary text-primary-foreground hover:bg-primary",
                m.tone === "info" && isActive && "bg-status-info text-background",
                m.tone === "warning" &&
                  isActive &&
                  "bg-status-warning text-background",
                m.tone === "success" &&
                  isActive &&
                  "bg-status-success text-background"
              )}
            >
              <Icon className="size-4" />
              <span className="font-mono text-paper-11 font-semibold uppercase tracking-widest">
                {m.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Active manifest banner */}
      {activeManifest && (mode === "LOAD_MANIFEST" || mode === "VERIFY_MANIFEST") && (
        <div
          className={cn(
            "flex items-center justify-between gap-3 border-l-4 px-4 py-3",
            mode === "LOAD_MANIFEST"
              ? "border-l-status-info bg-status-info/5"
              : "border-l-status-warning bg-status-warning/5"
          )}
        >
          <div>
            <p className="tac-mono-label text-muted-foreground">Active manifest</p>
            <p className="mt-0.5 flex items-center gap-2 font-mono text-sm font-semibold">
              {activeManifest.manifestNumber}
              <span className="tac-mono-label text-muted-foreground">
                {activeManifest.fromHub} → {activeManifest.toHub}
              </span>
            </p>
          </div>
          {onClearManifest && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearManifest}
            >
              <RiCloseLine className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Two-column layout: scanner viewport (left) + feed + right rail */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* LEFT */}
        <section className="grid gap-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">
                <RiKeyboardLine />
                Manual
              </TabsTrigger>
              <TabsTrigger value="camera">
                <RiCameraLine />
                Camera
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-3">
              <div className="grid gap-1.5">
                <Label htmlFor="scan-input">
                  Scan or type AWB and press Enter
                </Label>
                <Input
                  ref={inputRef}
                  id="scan-input"
                  value={manualValue}
                  onChange={(e) =>
                    setManualValue(e.target.value.toUpperCase())
                  }
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      await submit(manualValue)
                      setManualValue("")
                    }
                  }}
                  placeholder="TAC…"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-12 font-mono text-base tracking-widest focus-visible:outline-none focus-visible:tac-focus-premium"
                />
              </div>
            </TabsContent>

            <TabsContent value="camera" className="mt-3">
              {/* Active-scan atmosphere — the tac-scanline traveling stripe
                  signals "live capture in progress" without being a load
                  spinner. motion-reduce honored via globals.css. */}
              <div className="relative tac-scanline">
                <BarcodeScanner
                  onDecode={submit}
                  paused={tab !== "camera"}
                  ariaLabel="Hub scan camera"
                />
              </div>
            </TabsContent>
          </Tabs>

          {rightRail && (
            <div className="lg:hidden">
              {rightRail}
            </div>
          )}
        </section>

        {/* RIGHT: feed + optional rail */}
        <aside className="grid gap-4">
          {rightRail && <div className="hidden lg:block">{rightRail}</div>}

          <div className="border border-border bg-background">
            <header className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="tac-mono-label text-muted-foreground">
                Scan feed · last 100
              </span>
              {feed.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFeed([])}
                  className="tac-mono-label text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:tac-focus-premium"
                >
                  Clear
                </button>
              )}
            </header>
            <ScrollArea className="h-72">
              {feed.length === 0 ? (
                <div className="flex h-72 flex-col items-center justify-center gap-2 px-4 text-center">
                  <span className="tac-mono-label text-muted-foreground">
                    Awaiting scans…
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Use the scanner or type an AWB to begin.
                  </p>
                </div>
              ) : (
                <ul>
                  {feed.map((item, i) => (
                    <li
                      key={item.id}
                      data-outcome={item.outcome}
                      className={cn(
                        "flex items-center gap-2 border-l-2 border-transparent px-3 py-1.5 text-xs",
                        i === 0 && "bg-muted/20",
                        item.outcome === "SUCCESS" &&
                          "border-l-status-success/70",
                        item.outcome === "DUPLICATE" &&
                          "border-l-status-warning/70",
                        item.outcome === "ERROR" && "border-l-destructive/70"
                      )}
                    >
                      {item.outcome === "SUCCESS" ? (
                        <RiCheckLine className="size-3.5 text-status-success" />
                      ) : item.outcome === "DUPLICATE" ? (
                        <RiAlertLine className="size-3.5 text-status-warning" />
                      ) : (
                        <RiCloseLine className="size-3.5 text-destructive" />
                      )}
                      <span className="font-mono text-paper-11 font-semibold">
                        {item.awb}
                      </span>
                      {i === 0 && (
                        <Badge variant="secondary" className="font-mono">
                          latest
                        </Badge>
                      )}
                      {item.reason && (
                        <span className="ml-auto truncate text-paper-10 text-muted-foreground">
                          {item.reason}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>
        </aside>
      </div>

      {/* Footer status bar */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <span className="flex items-center gap-1 text-status-success">
              <RiWifiLine className="size-3.5" />
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-destructive">
              <RiWifiOffLine className="size-3.5" />
              Offline
            </span>
          )}
          <span>· Pending sync: {pendingCount}</span>
          <span>· Failed: {failedCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <RiTimeLine className="size-3" />
          <span>Session {fmtElapsed(elapsed)}</span>
        </div>
      </footer>
    </div>
  )
}

function KpiChip({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number | string
  tone?: "default" | "success" | "warning" | "error"
}) {
  return (
    <div
      data-tone={tone}
      className={cn(
        "flex items-center gap-2 border border-border bg-background px-2.5 py-1",
        tone === "success" && "border-status-success/30",
        tone === "warning" && "border-status-warning/30",
        tone === "error" && "border-destructive/30"
      )}
    >
      <span className="font-mono text-paper-9 uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-xs font-semibold",
          tone === "success" && "text-status-success",
          tone === "warning" && "text-status-warning",
          tone === "error" && "text-destructive"
        )}
      >
        {value}
      </span>
    </div>
  )
}

function fmtElapsed(s: number): string {
  const mm = String(Math.floor(s / 60)).padStart(2, "0")
  const ss = String(s % 60).padStart(2, "0")
  return `${mm}:${ss}`
}
