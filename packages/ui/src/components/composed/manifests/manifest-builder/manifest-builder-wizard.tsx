"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/primitives/alert-dialog"
import { RiArrowLeftLine, RiArrowRightLine } from "@workspace/ui/icons"

import { Wizard } from "@workspace/ui/components/primitives/wizard"
import {
  StepSetup,
  type ManifestSetupValue,
  isSetupValid,
  DEFAULT_SETUP_VALUE,
} from "./step-setup"
import {
  StepAddShipments,
  type ManifestShipmentRow,
  type ScanResult,
} from "./step-add-shipments"
import { StepReview } from "./step-review"

interface HubOption {
  value: string
  label: string
}

interface ManifestBuilderWizardProps {
  hubs: HubOption[]
  initialSetup?: Partial<ManifestSetupValue>
  initialRows?: ManifestShipmentRow[]
  /**
   * Called when the user advances from Step 1. Should create or upsert the
   * manifest server-side and return the manifest id used for subsequent
   * scan additions.
   */
  onSetupCommit?: (
    setup: ManifestSetupValue
  ) => Promise<{ manifestId: string }>
  /** Adds an AWB to the in-flight manifest (server-side validation lives here). */
  onAddAwb?: (
    manifestId: string,
    awb: string
  ) => Promise<{ result: ScanResult; reason?: string; row?: ManifestShipmentRow }>
  /** Removes an AWB from the in-flight manifest. */
  onRemoveAwb?: (manifestId: string, awb: string) => Promise<void>
  /** Save the manifest in the OPEN state (still editable). */
  onSaveOpen?: (manifestId: string) => Promise<void>
  /** Close the manifest (terminal — locked from edits). */
  onClose?: (manifestId: string) => Promise<void>
  /** Called on cancel + after-save navigation. */
  onExit?: () => void
  className?: string
}

const STEPS = [
  { id: "setup", label: "Manifest Setup" },
  { id: "shipments", label: "Add Shipments" },
  { id: "review", label: "Review & Finalize" },
]

export function ManifestBuilderWizard({
  hubs,
  initialSetup,
  initialRows = [],
  onSetupCommit,
  onAddAwb,
  onRemoveAwb,
  onSaveOpen,
  onClose,
  onExit,
  className,
}: ManifestBuilderWizardProps) {
  const [step, setStep] = React.useState(0)
  const [setup, setSetup] = React.useState<ManifestSetupValue>({
    ...DEFAULT_SETUP_VALUE,
    ...(initialSetup ?? {}),
  })
  const [rows, setRows] = React.useState<ManifestShipmentRow[]>(initialRows)
  const [manifestId, setManifestId] = React.useState<string | null>(null)
  const [committing, setCommitting] = React.useState(false)
  const [closing, setClosing] = React.useState(false)
  const [confirmClose, setConfirmClose] = React.useState(false)
  const [confirmCancel, setConfirmCancel] = React.useState(false)

  const hubLabels = React.useMemo(
    () =>
      Object.fromEntries(hubs.map((h) => [h.value, h.label])) as Record<
        string,
        string
      >,
    [hubs]
  )

  const routeBanner =
    setup.fromHubId && setup.toHubId
      ? `${hubLabels[setup.fromHubId] ?? setup.fromHubId} → ${hubLabels[setup.toHubId] ?? setup.toHubId}`
      : "—"

  const handleNextFromSetup = async () => {
    if (!isSetupValid(setup) || !onSetupCommit) return
    setCommitting(true)
    try {
      const { manifestId: id } = await onSetupCommit(setup)
      setManifestId(id)
      setStep(1)
    } finally {
      setCommitting(false)
    }
  }

  const handleScan = React.useCallback<
    React.ComponentProps<typeof StepAddShipments>["onScan"]
  >(
    async (awb) => {
      if (!manifestId || !onAddAwb)
        return { result: "ERROR", reason: "Manifest not initialized" }
      const r = await onAddAwb(manifestId, awb)
      if (r.result === "SUCCESS" && r.row) {
        setRows((prev) =>
          prev.some((p) => p.awbNumber === r.row!.awbNumber)
            ? prev
            : [r.row!, ...prev]
        )
      }
      return r
    },
    [manifestId, onAddAwb]
  )

  const handleRemove = async (awb: string) => {
    if (!manifestId || !onRemoveAwb) return
    await onRemoveAwb(manifestId, awb)
    setRows((prev) => prev.filter((p) => p.awbNumber !== awb))
  }

  const handleSaveOpen = async () => {
    if (!manifestId || !onSaveOpen) return
    await onSaveOpen(manifestId)
    onExit?.()
  }

  const handleCloseManifest = async () => {
    if (!manifestId || !onClose) return
    setClosing(true)
    try {
      await onClose(manifestId)
      setConfirmClose(false)
      onExit?.()
    } finally {
      setClosing(false)
    }
  }

  const tryCancel = () => {
    if (rows.length > 0) {
      setConfirmCancel(true)
    } else {
      onExit?.()
    }
  }

  return (
    <div
      data-slot="manifest-builder-wizard"
      className={cn("flex flex-col gap-8", className)}
    >
      <Wizard steps={STEPS} currentIndex={step} />

      {/*
        Steps are kept mounted via display:none + inert so Radix portals
        (Select / Combobox / DatePicker) inside step 1 don't get torn down
        when the user advances. This is the same pattern the legacy portal
        used to avoid the 'Cannot read properties of null' bugs that arise
        from re-mounting portal-rooted components mid-flow.
      */}
      <div className="grid gap-6">
        <div
          inert={step !== 0}
          className={cn(step !== 0 && "hidden")}
        >
          <StepSetup value={setup} onChange={setSetup} hubs={hubs} />
        </div>
        <div
          inert={step !== 1}
          className={cn(step !== 1 && "hidden")}
        >
          <StepAddShipments
            routeBanner={routeBanner}
            onScan={handleScan}
            rows={rows}
            onRemove={handleRemove}
          />
        </div>
        <div
          inert={step !== 2}
          className={cn(step !== 2 && "hidden")}
        >
          <StepReview setup={setup} rows={rows} hubLabels={hubLabels} />
        </div>
      </div>

      {/* Sticky action rail — stays in view as the form scrolls, so the
          primary action is always reachable in a long multi-step flow. */}
      <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background py-3">
        <Button variant="ghost" onClick={tryCancel}>
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              <RiArrowLeftLine />
              Back
            </Button>
          )}
          {step === 0 && (
            <Button
              onClick={handleNextFromSetup}
              disabled={!isSetupValid(setup) || committing}
            >
              Next
              <RiArrowRightLine />
            </Button>
          )}
          {step === 1 && (
            <Button onClick={() => setStep(2)} disabled={rows.length === 0}>
              Review
              <RiArrowRightLine />
            </Button>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={handleSaveOpen}>
                Save as Open
              </Button>
              <Button
                variant="destructive"
                onClick={() => setConfirmClose(true)}
              >
                Close Manifest
              </Button>
            </>
          )}
        </div>
      </footer>

      {/* Confirm close */}
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this manifest?</AlertDialogTitle>
            <AlertDialogDescription>
              Closing locks the loadlist. No further AWBs can be added or
              removed once the manifest is closed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseManifest}
              disabled={closing}
            >
              {closing ? "Closing…" : "Close manifest"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm cancel with content */}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard manifest changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {rows.length} shipment{rows.length === 1 ? "" : "s"} have been
              added to this manifest. Cancelling now discards your progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => onExit?.()}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
