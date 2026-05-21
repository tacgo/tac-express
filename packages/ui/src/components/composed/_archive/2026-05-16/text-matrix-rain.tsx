"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

export interface TextMatrixRainProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: string
  duration?: number
  repeatInterval?: number
}

const MATRIX_CHARS = "0123...ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ"

export function TextMatrixRain({
  children,
  duration = 1800,
  repeatInterval = 8000,
  className,
  ...props
}: TextMatrixRainProps) {
  const [displayText, setDisplayText] = React.useState(children)

  React.useEffect(() => {
    const finalText = String(children)
    const charCount = finalText.length
    if (charCount === 0) return

    let isCancelled = false
    let animationFrameId: number

    const lockTimes = Array.from({ length: charCount }).map((_, i) => {
      const delay = (duration / charCount) * i
      return Date.now() + delay + Math.random() * 80
    })

    const tick = () => {
      if (isCancelled) return
      
      const now = Date.now()
      let allLocked = true
      let newText = ""

      for (let i = 0; i < charCount; i++) {
        const char = finalText.charAt(i)
        const lockTime = lockTimes[i]
        
        if (char === " " || char === "\n") {
          newText += char
        } else if (lockTime !== undefined && now >= lockTime) {
          newText += char
        } else {
          allLocked = false
          newText += MATRIX_CHARS.charAt(Math.floor(Math.random() * MATRIX_CHARS.length))
        }
      }

      setDisplayText(newText)

      if (!allLocked) {
        animationFrameId = requestAnimationFrame(tick)
      }
    }

    animationFrameId = requestAnimationFrame(tick)

    let repeatTimer: ReturnType<typeof setTimeout> | null = null
    if (repeatInterval > 0) {
      repeatTimer = setInterval(() => {
        const now = Date.now()
        for (let i = 0; i < charCount; i++) {
          const delay = (duration / charCount) * i
          lockTimes[i] = now + delay + Math.random() * 80
        }
        animationFrameId = requestAnimationFrame(tick)
      }, repeatInterval)
    }

    return () => {
      isCancelled = true
      cancelAnimationFrame(animationFrameId)
      if (repeatTimer) clearInterval(repeatTimer)
    }
  }, [children, duration, repeatInterval])

  return (
    <span className={cn("inline", className)} aria-label={children} {...props}>
      {displayText}
    </span>
  )
}
