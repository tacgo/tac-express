"use client"

import * as React from "react"

import {
  RiBox3Line,
  RiFileList3Line,
  RiCheckboxCircleLine,
  RiSettingsLine,
  RiGridLine,
  RiCameraLine,
  RiTimeLine,
  RiSignalTowerLine,
} from "@workspace/ui/icons"
import { OpsFrame } from "../ops-frame"
import { OpsPageHead } from "../ops-page-head"
import { OpsButton } from "../ops-button"
import { OpsBadge } from "../ops-badge"
import { OpsCard } from "../ops-card"
import { OpsFieldInput } from "../ops-field"

type ScanMode = "Receive" | "Load Manifest" | "Verify Manifest" | "Deliver"

const MODES: { id: ScanMode; sub: string; icon: typeof RiBox3Line }[] = [
  { id: "Receive", sub: "INBOUND AT HUB", icon: RiBox3Line },
  { id: "Load Manifest", sub: "OUTBOUND DISPATCH", icon: RiFileList3Line },
  { id: "Verify Manifest", sub: "ARRIVAL AUDIT", icon: RiFileList3Line },
  { id: "Deliver", sub: "LAST MILE + POD", icon: RiCheckboxCircleLine },
]

function OpsScanningView() {
  const [mode, setMode] = React.useState<ScanMode>("Receive")
  const [awb, setAwb] = React.useState("")
  const current = MODES.find((m) => m.id === mode) ?? MODES[0]!

  return (
    <OpsFrame>
      <OpsPageHead
        eyebrow="Operations"
        title="Scanning"
        sub="Scan AWBs and manifests — works offline with auto-sync"
      />

      {/* Console header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="size-2 bg-paper-violet animate-pulse motion-reduce:animate-none" />
          <div>
            <div className="paper-label">Hub Operations Console</div>
            <div className="font-paper-display font-bold text-ui-18 mt-0.5">
              {current.id}{" "}
              <span className="font-paper-mono font-normal text-paper-fg-3 text-ui-12 ml-1.5">
                · {current.sub}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OpsBadge>Total 0</OpsBadge>
          <OpsBadge>OK 0</OpsBadge>
          <OpsBadge>Err 0</OpsBadge>
          <OpsBadge>Rate 0%</OpsBadge>
          <button
            type="button"
            aria-label="Scanner settings"
            className="size-8 border border-paper-line bg-paper-card grid place-items-center text-paper-fg-2 hover:bg-paper-3 focus-visible:outline-none focus-visible:tac-focus-premium transition-colors duration-fast ease-linear"
          >
            <RiSettingsLine aria-hidden className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Mode pills */}
      <div className="grid grid-cols-4 gap-3 mb-3.5">
        {MODES.map((m) => {
          const Icon = m.icon
          return (
            <OpsButton
              key={m.id}
              variant={mode === m.id ? "primary" : "default"}
              size="lg"
              onClick={() => setMode(m.id)}
              className="justify-center py-3"
            >
              <Icon aria-hidden className="size-3.5" />
              {m.id}
            </OpsButton>
          )
        })}
      </div>

      {/* Manual + Camera input area + feed */}
      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <OpsButton>
              <RiGridLine aria-hidden className="size-3.5" />
              Manual
            </OpsButton>
            <OpsButton>
              <RiCameraLine aria-hidden className="size-3.5" />
              Camera
            </OpsButton>
          </div>
          <div className="paper-label mb-1.5">
            Scan or type AWB and press enter
          </div>
          <OpsFieldInput
            aria-label="Scan AWB"
            placeholder="TAC..."
            value={awb}
            onChange={(e) => setAwb(e.target.value.toUpperCase())}
          />
        </div>

        <OpsCard ticks className="min-h-[length:var(--spacing-chart-lg)] flex flex-col">
          <div className="paper-label">Scan Feed · Last 100</div>
          <div className="flex-1 grid place-items-center text-center text-paper-fg-3">
            <div>
              <div className="paper-label mb-1.5">Awaiting Scans…</div>
              <div className="font-paper-display text-ui-13">
                Use the scanner or type an AWB to begin.
              </div>
            </div>
          </div>
        </OpsCard>
      </div>

      <div className="flex items-center justify-between mt-3.5 font-paper-mono text-paper-fg-3 text-ui-11 tracking-badge">
        <span className="flex items-center gap-1.5">
          <RiSignalTowerLine aria-hidden className="size-3" />
          ONLINE · PENDING SYNC: 0 · FAILED: 0
        </span>
        <span className="flex items-center gap-1.5">
          <RiTimeLine aria-hidden className="size-3" />
          SESSION 00:04
        </span>
      </div>
    </OpsFrame>
  )
}

export { OpsScanningView }
