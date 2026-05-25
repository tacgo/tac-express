"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import {
  RiBox3Line,
  RiFileList3Line,
  RiCheckboxCircleLine,
  RiSettingsLine,
  RiGridLine,
  RiCameraLine,
  RiTimeLine,
  RiBarcodeBoxLine,
  RiCheckLine,
  RiErrorWarningLine,
} from "@workspace/ui/icons"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { SurfaceCard } from "@workspace/ui/components/composed/surface-card"
import { Input } from "@workspace/ui/components/primitives/input"
import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/primitives/tabs"

/**
 * V7OpsScanning — Violet Grid v7 layout for the hub Scanning console.
 *
 * Replaces the Paper Ops Console `OpsScanningView` (Phase 8). Scanning is an
 * operational workhorse surface, not an overview — so there is no display-
 * moment title; the AWB input is the hero of the surface. Depth tiers follow
 * the operational read: the scan feed is the elevated `command` surface (where
 * operational output lands), the input area is the `bg-card` tier.
 *
 * Self-contained UI state (scan mode, AWB draft, input method) mirrors the v6
 * view — no service hooks, no data layer. The input is non-submitting (no
 * recording backend yet, same as v6); the v7 addition is the AWB-format
 * validation choreography (idle / valid / invalid) and the live session clock.
 */

type ScanMode = "Receive" | "Load Manifest" | "Verify Manifest" | "Deliver"

const MODES: { id: ScanMode; sub: string; icon: typeof RiBox3Line }[] = [
  { id: "Receive", sub: "INBOUND AT HUB", icon: RiBox3Line },
  { id: "Load Manifest", sub: "OUTBOUND DISPATCH", icon: RiFileList3Line },
  { id: "Verify Manifest", sub: "ARRIVAL AUDIT", icon: RiFileList3Line },
  { id: "Deliver", sub: "LAST MILE + POD", icon: RiCheckboxCircleLine },
]

type InputMethod = "manual" | "camera"

function V7OpsScanning({ className }: { className?: string }) {
  const [mode, setMode] = React.useState<ScanMode>("Receive")
  const [awb, setAwb] = React.useState("")
  const [method, setMethod] = React.useState<InputMethod>("manual")

  const current = MODES.find((m) => m.id === mode) ?? MODES[0]!

  const draft = awb.trim()
  const hasInput = draft.length > 0
  // Format-only validation for visual choreography (no submission backend).
  const isValid = /^TAC[A-Z0-9]{6,}$/.test(draft)
  const isInvalid = hasInput && !isValid

  return (
    <PageShell width="wide" className={cn(className)}>
      <PageHeader
        overline="Operations"
        title="Scanning"
        description="Scan AWBs and manifests — works offline with auto-sync."
      />

      {/* Console control strip — live hub state + session telemetry. Bare
          chrome (not a panel) so the elevated scan feed below stays the depth
          focal point. */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="size-2 bg-primary tac-blink motion-reduce:animate-none"
          />
          <div className="min-w-0">
            <p className="tac-mono-label">Hub Operations Console</p>
            <p className="t-h4 text-foreground mt-0.5">
              {current.id}
              <span className="font-mono font-normal text-muted-foreground text-2xs tracking-badge ml-2 uppercase">
                · {current.sub}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <StatReadout label="Total" value="0" />
          <StatReadout label="OK" value="0" tone="success" />
          <StatReadout label="Err" value="0" tone="danger" />
          <StatReadout label="Rate" value="0%" />
          <button
            type="button"
            aria-label="Scanner settings"
            className="size-8 border border-border bg-card grid place-items-center text-foreground hover:bg-muted focus-visible:outline-none focus-visible:tac-focus-premium transition-colors duration-fast ease-linear"
          >
            <RiSettingsLine aria-hidden className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Scan mode selector — the operation context for every scan. */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as ScanMode)}>
        <TabsList className="flex-wrap h-auto">
          {MODES.map((m) => {
            const Icon = m.icon
            return (
              <TabsTrigger key={m.id} value={m.id}>
                <Icon aria-hidden className="size-3.5" />
                {m.id}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {/* Work area — input (card tier) + scan feed (elevated tier). */}
      <div className="grid grid-cols-1 gap-card-gap lg:grid-cols-[1.6fr_1fr]">
        <SurfaceCard
          eyebrow="Scan input"
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={method === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setMethod("manual")}
              >
                <RiGridLine aria-hidden className="size-3.5" />
                Manual
              </Button>
              <Button
                type="button"
                variant={method === "camera" ? "default" : "outline"}
                size="sm"
                onClick={() => setMethod("camera")}
              >
                <RiCameraLine aria-hidden className="size-3.5" />
                Camera
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="scan-awb" className="tac-mono-label">
              Scan or type an AWB for {current.id.toLowerCase()}
            </label>
            <div className="relative">
              <RiBarcodeBoxLine
                aria-hidden
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 size-5",
                  isValid
                    ? "text-accent-success"
                    : isInvalid
                      ? "text-destructive"
                      : "text-muted-foreground"
                )}
              />
              <Input
                id="scan-awb"
                aria-label="Scan AWB"
                aria-invalid={isInvalid || undefined}
                inputMode="text"
                autoComplete="off"
                placeholder="TAC……"
                value={awb}
                onChange={(e) => setAwb(e.target.value.toUpperCase())}
                className="h-12 pl-10 font-mono text-base tracking-wide tabular-nums"
              />
            </div>

            {/* Validation choreography: idle / valid / invalid */}
            <p
              role={isInvalid ? "alert" : undefined}
              className={cn(
                "t-mono-sm inline-flex items-center gap-1.5",
                isValid
                  ? "text-accent-success"
                  : isInvalid
                    ? "text-destructive"
                    : "text-muted-foreground"
              )}
            >
              {isValid ? (
                <>
                  <RiCheckLine aria-hidden className="size-3.5" />
                  AWB format OK — ready to scan
                </>
              ) : isInvalid ? (
                <>
                  <RiErrorWarningLine aria-hidden className="size-3.5" />
                  Expected format: TAC followed by 6+ characters
                </>
              ) : (
                <>Awaiting input — scanner or keyboard</>
              )}
            </p>
          </div>
        </SurfaceCard>

        <SurfaceCard
          emphasis="command"
          eyebrow={
            <span className="inline-flex items-center gap-1.5">
              <RiBarcodeBoxLine aria-hidden className="size-3.5" />
              Scan Feed · Last 100
            </span>
          }
          className="min-h-[length:var(--spacing-chart-lg)]"
        >
          <div className="flex-1 grid place-items-center text-center">
            <div className="flex flex-col items-center gap-1.5">
              <RiBarcodeBoxLine
                aria-hidden
                className="size-8 text-muted-foreground"
              />
              <p className="tac-mono-label">Awaiting scans</p>
              <p className="t-body-sm text-muted-foreground max-w-xs">
                Scanned AWBs land here in real time. Use the scanner or type an
                AWB to begin.
              </p>
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* Sync + session telemetry. */}
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-2xs tracking-badge text-muted-foreground">
        <span className="inline-flex items-center gap-2 uppercase">
          <span className="inline-flex items-center gap-1.5 text-accent-success">
            <span
              aria-hidden
              className="size-1.5 bg-accent-success tac-blink motion-reduce:animate-none"
            />
            Online
          </span>
          <span aria-hidden>·</span>
          <span>
            Pending sync <span className="tabular-nums text-foreground">0</span>
          </span>
          <span aria-hidden>·</span>
          <span>
            Failed <span className="tabular-nums text-foreground">0</span>
          </span>
        </span>
        <SessionClock />
      </div>
    </PageShell>
  )
}

/** A single telemetry readout — mono label + tabular value. */
function StatReadout({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "success" | "danger"
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="tac-mono-label">{label}</span>
      <span
        className={cn(
          "font-mono tabular-nums text-sm",
          tone === "success"
            ? "text-accent-success"
            : tone === "danger"
              ? "text-destructive"
              : "text-foreground"
        )}
      >
        {value}
      </span>
    </span>
  )
}

/** Live session clock — ticks mm:ss from mount (UI-only, no persistence). */
function SessionClock() {
  const [seconds, setSeconds] = React.useState(0)

  React.useEffect(() => {
    const id = globalThis.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => globalThis.clearInterval(id)
  }, [])

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0")
  const ss = String(seconds % 60).padStart(2, "0")

  return (
    <span className="inline-flex items-center gap-1.5 uppercase">
      <RiTimeLine aria-hidden className="size-3" />
      Session{" "}
      <span className="tabular-nums text-foreground">
        {mm}:{ss}
      </span>
    </span>
  )
}

export { V7OpsScanning }
