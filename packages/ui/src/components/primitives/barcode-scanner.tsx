"use client"

import * as React from "react"
import { BrowserMultiFormatReader } from "@zxing/browser"
import type { IScannerControls } from "@zxing/browser"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  RiCameraLine,
  RiVolumeMuteLine,
  RiVolumeUpLine,
  RiFlashlightLine,
  RiZoomInLine,
  RiZoomOutLine,
  RiCloseLine,
} from "@workspace/ui/icons"

interface BarcodeScannerProps {
  /** Called for every successful, non-duplicate decode. */
  onDecode?: (text: string) => void
  /** ms to ignore the same code as a duplicate. Default 2000. */
  duplicateDebounceMs?: number
  /** Initial soundOn state. Default true. */
  soundOn?: boolean
  /** Beep frequency in Hz. */
  beepHz?: number
  /** Beep duration in ms. */
  beepMs?: number
  className?: string
  /** Render a paused overlay; useful for parent-driven gating. */
  paused?: boolean
  /** Optional aria-label override. */
  ariaLabel?: string
}

function BarcodeScanner({
  onDecode,
  duplicateDebounceMs = 2000,
  soundOn: soundOnInit = true,
  beepHz = 1200,
  beepMs = 100,
  className,
  paused = false,
  ariaLabel = "Barcode scanner viewport",
}: BarcodeScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const controlsRef = React.useRef<IScannerControls | null>(null)
  const audioRef = React.useRef<AudioContext | null>(null)
  const lastScan = React.useRef<{ code: string; at: number } | null>(null)
  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = React.useState<string | undefined>()
  const [error, setError] = React.useState<string | null>(null)
  const [soundOn, setSoundOn] = React.useState(soundOnInit)
  const [torchOn, setTorchOn] = React.useState(false)
  const [zoom, setZoom] = React.useState<{ min: number; max: number; step: number; value: number } | null>(null)

  const beep = React.useCallback(() => {
    if (!soundOn) return
    try {
      const ctx =
        audioRef.current ??
        new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      audioRef.current = ctx
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = beepHz
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      osc.start()
      osc.stop(ctx.currentTime + beepMs / 1000)
    } catch {
      /* ignore */
    }
  }, [soundOn, beepHz, beepMs])

  // Enumerate cameras on mount
  React.useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((d) => {
        setDevices(d)
        if (d.length > 0) {
          // Prefer rear-facing camera by label keyword
          const rear =
            d.find((dev) =>
              /back|rear|environment/i.test(dev.label)
            ) ?? d[0]
          if (rear) setActiveDeviceId(rear.deviceId)
        }
      })
      .catch((err) => setError((err as Error).message))
  }, [])

  // Start / stop scanning when device changes or pause toggles
  React.useEffect(() => {
    if (!activeDeviceId || paused) return

    const reader = new BrowserMultiFormatReader()
    let cancelled = false

    reader
      .decodeFromVideoDevice(activeDeviceId, videoRef.current!, (result) => {
        if (cancelled || !result) return
        const code = result.getText()
        const now = performance.now()
        if (
          lastScan.current?.code === code &&
          now - lastScan.current.at < duplicateDebounceMs
        ) {
          return
        }
        lastScan.current = { code, at: now }
        beep()
        onDecode?.(code)
      })
      .then((controls) => {
        if (cancelled) {
          controls.stop()
          return
        }
        controlsRef.current = controls
        // Probe capabilities for torch + zoom
        const stream = videoRef.current?.srcObject as MediaStream | null
        const track = stream?.getVideoTracks()[0]
        const caps = track?.getCapabilities() as
          | (MediaTrackCapabilities & {
              torch?: boolean
              zoom?: { min: number; max: number; step: number }
            })
          | undefined
        if (caps?.zoom) {
          setZoom({
            min: caps.zoom.min,
            max: caps.zoom.max,
            step: caps.zoom.step ?? 0.1,
            value: caps.zoom.min,
          })
        }
      })
      .catch((err) => setError((err as Error).message))

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [activeDeviceId, paused, duplicateDebounceMs, onDecode, beep])

  const cycleCamera = () => {
    if (devices.length < 2) return
    const idx = devices.findIndex((d) => d.deviceId === activeDeviceId)
    const next = devices[(idx + 1) % devices.length]
    if (next) setActiveDeviceId(next.deviceId)
  }

  const toggleTorch = async () => {
    const stream = videoRef.current?.srcObject as MediaStream | null
    const track = stream?.getVideoTracks()[0]
    if (!track) return
    try {
      const caps = track.getCapabilities() as MediaTrackCapabilities & {
        torch?: boolean
      }
      if (!caps.torch) return
      const next = !torchOn
      await track.applyConstraints({
        // torch is not yet in the standard MediaTrackConstraintSet typings.
        advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
      })
      setTorchOn(next)
    } catch {
      /* ignore */
    }
  }

  const setZoomValue = async (val: number) => {
    const stream = videoRef.current?.srcObject as MediaStream | null
    const track = stream?.getVideoTracks()[0]
    if (!track || !zoom) return
    try {
      await track.applyConstraints({
        // zoom is not yet in the standard MediaTrackConstraintSet typings.
        advanced: [{ zoom: val } as unknown as MediaTrackConstraintSet],
      })
      setZoom({ ...zoom, value: val })
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      data-slot="barcode-scanner"
      className={cn(
        "relative aspect-video w-full overflow-hidden border border-border bg-black",
        className
      )}
      role="region"
      aria-label={ariaLabel}
    >
      <video
        ref={videoRef}
        className="size-full object-cover"
        muted
        playsInline
      />
      {/* Crosshair / scan line overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-2/3 w-2/3 border border-white/30">
          <span className="absolute -top-1 -left-1 size-3 border-t-2 border-l-2 border-primary" />
          <span className="absolute -top-1 -right-1 size-3 border-t-2 border-r-2 border-primary" />
          <span className="absolute -bottom-1 -left-1 size-3 border-b-2 border-l-2 border-primary" />
          <span className="absolute -bottom-1 -right-1 size-3 border-b-2 border-r-2 border-primary" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-primary/70 shadow-[0_0_12px] shadow-primary" />
        </div>
      </div>
      {/* Toolbar */}
      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={cycleCamera}
            disabled={devices.length < 2}
            aria-label="Switch camera"
            className="h-7 w-7"
          >
            <RiCameraLine className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant={torchOn ? "default" : "outline"}
            size="icon"
            onClick={toggleTorch}
            aria-label="Toggle torch"
            className="h-7 w-7"
          >
            <RiFlashlightLine className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSoundOn((v) => !v)}
            aria-label={soundOn ? "Mute scan beep" : "Unmute scan beep"}
            className="h-7 w-7"
          >
            {soundOn ? (
              <RiVolumeUpLine className="size-3.5" />
            ) : (
              <RiVolumeMuteLine className="size-3.5" />
            )}
          </Button>
        </div>
        {zoom && (
          <div className="flex items-center gap-1 bg-background/80 px-2 py-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                setZoomValue(Math.max(zoom.min, zoom.value - zoom.step))
              }
              aria-label="Zoom out"
              className="h-6 w-6"
            >
              <RiZoomOutLine className="size-3" />
            </Button>
            <span className="font-mono text-paper-10 uppercase tracking-widest">
              {zoom.value.toFixed(1)}×
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                setZoomValue(Math.min(zoom.max, zoom.value + zoom.step))
              }
              aria-label="Zoom in"
              className="h-6 w-6"
            >
              <RiZoomInLine className="size-3" />
            </Button>
          </div>
        )}
      </div>
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/90 px-4 text-center font-mono text-paper-11 uppercase tracking-widest text-destructive">
          <RiCloseLine className="size-6" />
          {error}
        </div>
      )}
    </div>
  )
}

export { BarcodeScanner }
