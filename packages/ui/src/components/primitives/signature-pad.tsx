"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { RiBrushLine, RiCloseLine } from "@workspace/ui/icons"

interface SignaturePadProps {
  width?: number
  height?: number
  className?: string
  onChange?: (dataUrl: string | null) => void
  strokeColor?: string
  strokeWidth?: number
  background?: string
  disabled?: boolean
  ariaLabel?: string
}

function SignaturePad({
  width = 400,
  height = 160,
  className,
  onChange,
  strokeColor = "currentColor",
  strokeWidth = 2,
  background = "transparent",
  disabled,
  ariaLabel = "Signature pad",
}: SignaturePadProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const drawing = React.useRef(false)
  const lastPoint = React.useRef<{ x: number; y: number } | null>(null)
  const [empty, setEmpty] = React.useState(true)

  const getCtx = () => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext("2d")
  }

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    // High-DPI scaling
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = strokeWidth
    ctx.strokeStyle = strokeColor
    if (background !== "transparent") {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, width, height)
    }
  }, [width, height, strokeColor, strokeWidth, background])

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    lastPoint.current = pointFromEvent(e)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return
    const ctx = getCtx()
    if (!ctx || !lastPoint.current) return
    const next = pointFromEvent(e)
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(next.x, next.y)
    ctx.stroke()
    lastPoint.current = next
    if (empty) setEmpty(false)
  }

  const onPointerUp = () => {
    drawing.current = false
    lastPoint.current = null
    const canvas = canvasRef.current
    if (canvas && !empty) {
      onChange?.(canvas.toDataURL("image/png"))
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (background !== "transparent") {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, width, height)
    }
    setEmpty(true)
    onChange?.(null)
  }

  return (
    <div
      data-slot="signature-pad"
      className={cn("flex flex-col gap-2", className)}
    >
      <div className="relative inline-block border border-border bg-background">
        <canvas
          ref={canvasRef}
          aria-label={ariaLabel}
          role="img"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className={cn(
            "block touch-none",
            disabled && "cursor-not-allowed opacity-60"
          )}
        />
        {empty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            <RiBrushLine className="mr-2 size-3.5" />
            Sign here
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          disabled={disabled || empty}
          className="font-mono text-ui-10 uppercase tracking-widest"
        >
          <RiCloseLine className="size-3" />
          Clear
        </Button>
      </div>
    </div>
  )
}

export { SignaturePad }
