"use client"

import * as React from "react"
import Lottie from "lottie-react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@workspace/ui/lib/utils"
import loginAnimation from "./login.lottie.json"

interface SignInSplitLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: string
  eyebrow?: string
  description?: string
  imageCaption?: string
  children: React.ReactNode
  topRightSlot?: React.ReactNode
}

function SignInSplitLayout({
  heading = "Sign in",
  eyebrow = "TAC EXPRESS · OPS CONSOLE",
  description = "Restricted to authorised personnel. Contact your administrator if you cannot access your account.",
  imageCaption = "DISPATCH · LIVE",
  children,
  topRightSlot,
  className,
  ...rest
}: SignInSplitLayoutProps) {
  const reduced = useReducedMotion()

  return (
    <div
      data-slot="sign-in-split-layout"
      className={cn("relative min-h-screen w-full bg-background", className)}
      {...rest}
    >
      {topRightSlot ? (
        <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
          {topRightSlot}
        </div>
      ) : null}

      {/* L-bracket markers */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-10 h-5 w-5 border-l-2 border-t-2 border-primary"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 z-10 h-5 w-5 border-b-2 border-r-2 border-border"
      />

      <div className="relative z-20 mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-8 sm:px-6">
        <div className="grid w-full grid-cols-1 overflow-hidden border border-border bg-card shadow md:grid-cols-2">
          {/* LEFT — animation panel */}
          <div className="relative hidden overflow-hidden border-b border-border bg-card md:block md:border-b-0 md:border-r">
            {/* Brand wordmark */}
            <div className="absolute left-5 top-5 z-10 flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block size-1.5 bg-primary tac-blink motion-reduce:animate-none"
              />
              <span className="t-overline text-foreground">TAC EXPRESS</span>
            </div>

            {/* Lottie animation */}
            {/* eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md */}
            <div className="flex h-full min-h-[360px] items-center justify-center px-6 py-10">
              <Lottie
                animationData={loginAnimation}
                loop
                autoplay
                // eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md
                className="size-full max-w-[320px]"
                rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
              />
            </div>

            {/* Hazard band along the inner edge */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-1 tac-hazard-stripes md:block"
            />

            {/* Caption tag */}
            <div className="absolute bottom-5 left-5 z-10 flex items-center gap-2 border border-border bg-background px-2 py-1">
              <span aria-hidden className="inline-block size-1.5 bg-accent-success" />
              <span className="tac-tag text-foreground">{imageCaption}</span>
            </div>
          </div>

          {/* RIGHT — form panel */}
          <motion.div
            className="relative flex flex-col justify-center bg-card px-6 py-10 sm:px-8"
            initial={reduced ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Mono ID label */}
            <span className="tac-mono-label absolute right-5 top-5 hidden text-muted-foreground md:inline-block">
              SECTOR · AUTH-01
            </span>

            <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <span className="t-overline text-primary">{eyebrow}</span>
                <h1 className="t-h2 text-foreground">{heading}</h1>
                <p className="t-body-sm text-muted-foreground">{description}</p>
              </div>

              {children}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export { SignInSplitLayout }
export type { SignInSplitLayoutProps }
