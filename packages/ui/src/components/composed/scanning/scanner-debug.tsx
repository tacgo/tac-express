"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  RiBugLine,
  RiCloseLine,
  RiKeyboardLine,
  RiBarcodeBoxLine,
} from "@workspace/ui/icons"

interface KeystrokeSample {
  key: string
  delta: number
}

interface ScannerDebugProps {
  /** Optional manual close handler — when provided, renders a close X. */
  onClose?: () => void
  className?: string
}

/**
 * Floating bottom-right diagnostics panel for the scanning console.
 * Tracks keystroke timing on document-level keydown events to distinguish
 * between USB HID barcode scanners (typically <30ms inter-keystroke,
 * burst-then-Enter) and human typing (>150ms inter-keystroke).
 */
export function ScannerDebug({ onClose, className }: ScannerDebugProps) {
  const [samples, setSamples] = React.useState<KeystrokeSample[]>([])
  const [lastCode, setLastCode] = React.useState<string | null>(null)
  const [scannerDetected, setScannerDetected] = React.useState(false)
  const lastKey = React.useRef<{ key: string; at: number } | null>(null)
  const buffer = React.useRef<string>("")

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const now = performance.now()
      const delta = lastKey.current ? now - lastKey.current.at : 0
      lastKey.current = { key: e.key, at: now }

      if (e.key.length === 1) {
        buffer.current += e.key
        setSamples((s) =>
          [{ key: e.key, delta }, ...s].slice(0, 12)
        )
        // Heuristic: 8+ keys with average <50ms = scanner
        const fast = samples.filter((s) => s.delta < 50 && s.delta > 0).length
        if (fast >= 6) setScannerDetected(true)
      } else if (e.key === "Enter" && buffer.current.length > 0) {
        setLastCode(buffer.current)
        buffer.current = ""
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [samples])

  const avg =
    samples.length > 1
      ? samples.slice(1).reduce((s, x) => s + x.delta, 0) /
        Math.max(samples.length - 1, 1)
      : 0

  return (
    <aside
      data-slot="scanner-debug"
      role="complementary"
      aria-label="Scanner diagnostics"
      className={cn(
        "fixed bottom-4 right-4 z-40 w-72 border border-border bg-popover text-popover-foreground shadow-[var(--shadow-brutal)]",
        className
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="flex items-center gap-2 font-mono text-paper-10 uppercase tracking-widest">
          <RiBugLine className="size-3.5" />
          Scanner Debug
        </span>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close debug panel"
            className="size-6"
          >
            <RiCloseLine className="size-3" />
          </Button>
        )}
      </header>

      <div className="grid grid-cols-2 gap-px bg-border/40">
        <div className="bg-popover px-3 py-2">
          <p className="font-mono text-paper-9 uppercase tracking-widest text-muted-foreground">
            Avg Δ
          </p>
          <p
            className={cn(
              "mt-0.5 font-mono text-sm font-semibold",
              avg < 50 && avg > 0 && "text-status-success",
              avg >= 150 && "text-status-warning"
            )}
          >
            {avg > 0 ? `${avg.toFixed(0)}ms` : "—"}
          </p>
        </div>
        <div className="bg-popover px-3 py-2">
          <p className="font-mono text-paper-9 uppercase tracking-widest text-muted-foreground">
            Source
          </p>
          <p className="mt-0.5 flex items-center gap-1 font-mono text-paper-11 font-semibold">
            {scannerDetected ? (
              <>
                <RiBarcodeBoxLine className="size-3" />
                Scanner
              </>
            ) : (
              <>
                <RiKeyboardLine className="size-3" />
                Manual
              </>
            )}
          </p>
        </div>
      </div>

      <div className="border-t border-border px-3 py-2">
        <p className="font-mono text-paper-9 uppercase tracking-widest text-muted-foreground">
          Last code
        </p>
        <p className="truncate font-mono text-paper-11 font-semibold">
          {lastCode ?? "—"}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-px border-t border-border bg-border/40">
        {samples.slice(0, 12).map((s, i) => (
          <span
            key={i}
            title={`${s.key} · ${s.delta.toFixed(0)}ms`}
            className={cn(
              "block h-2 bg-popover",
              s.delta < 50 && s.delta > 0 && "bg-status-success/70",
              s.delta >= 50 && s.delta < 150 && "bg-status-warning/70",
              s.delta >= 150 && "bg-destructive/70"
            )}
          />
        ))}
      </div>
    </aside>
  )
}
