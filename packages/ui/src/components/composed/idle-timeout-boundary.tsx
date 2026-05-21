"use client"

import * as React from "react"

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
import { useIdleTimeout } from "@workspace/ui/hooks/use-idle-timeout"

interface IdleTimeoutBoundaryProps {
  /** Idle threshold in minutes. Default 30. */
  idleMinutes?: number
  /** Warning window in seconds before forced logout. Default 30. */
  warningSeconds?: number
  /** Called when the user is forcibly signed out. */
  onLogout: () => void
  /** Cross-tab activity sync key. Default `tac-idle-activity`. */
  storageKey?: string
  /** Disable the boundary (e.g. on /track public route). */
  disabled?: boolean
  children?: React.ReactNode
}

export function IdleTimeoutBoundary({
  idleMinutes = 30,
  warningSeconds = 30,
  onLogout,
  storageKey = "tac-idle-activity",
  disabled,
  children,
}: IdleTimeoutBoundaryProps) {
  const [warningOpen, setWarningOpen] = React.useState(false)
  const [secondsLeft, setSecondsLeft] = React.useState(0)
  const tickRef = React.useRef<number | null>(null)

  const handleWarn = React.useCallback((msUntilLogout: number) => {
    setSecondsLeft(Math.ceil(msUntilLogout / 1000))
    setWarningOpen(true)
  }, [])

  const handleIdle = React.useCallback(() => {
    setWarningOpen(false)
    onLogout()
  }, [onLogout])

  useIdleTimeout({
    idleAfterMs: idleMinutes * 60 * 1000,
    warningLeadMs: warningSeconds * 1000,
    onWarn: handleWarn,
    onIdle: handleIdle,
    storageKey,
    disabled,
  })

  // Drive the visible countdown while the warning is open.
  React.useEffect(() => {
    if (!warningOpen) {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current)
        tickRef.current = null
      }
      return
    }
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [warningOpen])

  const dismiss = () => {
    setWarningOpen(false)
    // Bump activity so the timer resets without the user having to mousemove.
    try {
      window.localStorage.setItem(storageKey, String(Date.now()))
    } catch {
      /* quota — ignore */
    }
  }

  return (
    <>
      {children}
      <AlertDialog open={warningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Still there?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll be signed out in{" "}
              <span className="font-mono font-semibold text-foreground">
                {secondsLeft}s
              </span>{" "}
              for security. Move your mouse or click below to stay signed in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onLogout}>Sign out</AlertDialogCancel>
            <AlertDialogAction onClick={dismiss}>Stay signed in</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
