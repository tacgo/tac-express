"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { flushSync } from "react-dom"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Icon } from "@workspace/ui/icons"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  /** View transition duration in ms (default: 400) */
  duration?: number
}

/**
 * AnimatedThemeToggler — theme toggle with View Transitions API circle reveal.
 * Uses native document.startViewTransition — zero dependencies.
 * Falls back to instant toggle if API unavailable.
 * Icons via @workspace/ui/icons (Remix Icon) — LAW 2 compliant.
 */
export function AnimatedThemeToggler({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) {
  const { setTheme, resolvedTheme } = useTheme()
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = React.useCallback(() => {
    const button = buttonRef.current
    const next = resolvedTheme === "dark" ? "light" : "dark"

    if (!button || typeof document.startViewTransition !== "function") {
      setTheme(next)
      return
    }

    const { top, left, width, height } = button.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight

    const maxRadius = Math.hypot(
      Math.max(x, viewportWidth - x),
      Math.max(y, viewportHeight - y)
    )

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setTheme(next)
      })
    })

    const ready = transition?.ready
    if (ready && typeof ready.then === "function") {
      ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${maxRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        )
      })
    }
  }, [resolvedTheme, setTheme, duration])

  return (
    <Button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      variant="outline"
      size="icon"
      className={cn(
        "relative rounded-none shrink-0 border border-border shadow-none bg-transparent hover:bg-muted focus-visible:ring-0 transition-colors duration-200",
        className
      )}
      aria-label="Toggle theme"
      {...props}
    >
      {mounted ? (
        resolvedTheme === "dark" ? (
          <Icon name="moon" className="size-4" />
        ) : (
          <Icon name="sun" className="size-4" />
        )
      ) : (
        <Icon name="sun" className="size-4 opacity-0" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
