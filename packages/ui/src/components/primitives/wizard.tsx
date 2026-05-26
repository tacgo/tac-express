"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckLine,
  type RemixiconComponentType,
} from "@workspace/ui/icons"

/**
 * Wizard — canonical multi-step indicator primitive for TAC Express.
 *
 * Pairs with <WizardActions> for the canonical back/next/submit row.
 * The consumer owns step state — this primitive is presentational.
 *
 * Logistics best-practice defaults:
 *   - Click-back to completed steps via `onStepClick`. Operators backtrack
 *     constantly; this is industry standard (DHL MyDHL+, FedEx Ship Manager).
 *   - "Step N / M" overline gives explicit position context above each label.
 *   - aria-current="step" on the active step for assistive tech.
 *   - data-state on each step exposes done/active/pending for downstream styling.
 */

interface WizardStep {
  id: string
  label: string
  description?: string
  /** Optional icon rendered next to the label (e.g. RiUserLine for an "Identity" step). */
  icon?: RemixiconComponentType
}

interface WizardProps extends Omit<
  React.HTMLAttributes<HTMLOListElement>,
  "children"
> {
  steps: WizardStep[]
  currentIndex: number
  /**
   * Called when the user clicks a step. Steps are clickable when `idx <= currentIndex`.
   * Omit to disable click-navigation entirely.
   */
  onStepClick?: (index: number) => void
}

function Wizard({
  steps,
  currentIndex,
  onStepClick,
  className,
  ...props
}: WizardProps) {
  const total = steps.length
  // Defensive: a wizard with no steps shouldn't render anything (avoids
  // rendering an empty <ol> with malformed accessibility tree).
  if (total <= 0) return null
  const clamped = Math.max(0, Math.min(currentIndex, total - 1))
  const activeStep = steps[clamped]!
  const ActiveIcon = activeStep.icon
  const progressPct = ((clamped + 1) / total) * 100

  return (
    <>
      {/*
        Mobile (< sm): the full segmented bar can't fit N labelled steps on a
        phone — labels truncate to a single char and later steps clip. Instead
        show a compact "Step N / M" + active label + progress track. The full
        bar takes over from sm up.
      */}
      <div
        data-slot="wizard-compact"
        aria-label={`Step ${clamped + 1} of ${total}: ${activeStep.label}`}
        className="border border-border bg-card p-3 shadow-brutal-sm sm:hidden"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-2xs tracking-widest text-primary uppercase">
            Step {clamped + 1} / {total}
          </span>
          <span className="font-mono text-2xs text-muted-foreground tabular-nums">
            {Math.round(progressPct)}%
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          {ActiveIcon ? (
            <ActiveIcon
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
          ) : null}
          <span className="truncate font-sans text-sm font-medium text-foreground">
            {activeStep.label}
          </span>
        </div>
        <div className="mt-2 h-1 w-full bg-muted" aria-hidden="true">
          <div
            className="h-full bg-primary transition-[width] duration-[var(--duration-base)] ease-[var(--ease-smooth)]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <ol
        data-slot="wizard"
        className={cn(
          "hidden w-full overflow-hidden border border-border bg-card shadow-brutal-sm sm:flex",
          className
        )}
        {...props}
      >
        {steps.map((step, idx) => {
          const isActive = idx === clamped
          const isCompleted = idx < clamped
          const clickable = typeof onStepClick === "function" && idx <= clamped
          const Icon = step.icon

          return (
            <li
              key={step.id}
              data-slot="wizard-step"
              data-state={
                isActive ? "active" : isCompleted ? "done" : "pending"
              }
              className={cn(
                "group/step relative min-w-0 flex-1 border-r border-border last:border-r-0",
                isActive && "bg-primary/5"
              )}
              aria-current={isActive ? "step" : undefined}
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick?.(idx)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left",
                  "transition-colors duration-[var(--duration-fast)] ease-linear",
                  "focus:outline-none focus-visible:outline-1 focus-visible:[outline-offset:var(--outline-offset-inset)] focus-visible:outline-primary",
                  clickable ? "hover:bg-accent/50" : "cursor-default"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center border font-mono text-xs font-semibold tabular-nums",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isActive &&
                      !isCompleted &&
                      "border-primary bg-card text-primary",
                    !isActive &&
                      !isCompleted &&
                      "border-border bg-card text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <RiCheckLine className="size-3.5" aria-hidden="true" />
                  ) : (
                    idx + 1
                  )}
                </span>

                <div className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      "font-mono text-2xs tracking-widest uppercase",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    Step {idx + 1} / {total}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 truncate font-sans text-sm font-medium",
                      isActive || isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {Icon ? <Icon className="size-3.5" /> : null}
                    {step.label}
                  </span>
                  {step.description ? (
                    <span className="mt-0.5 truncate font-sans text-2xs text-muted-foreground">
                      {step.description}
                    </span>
                  ) : null}
                </div>
              </button>

              {isActive ? (
                <span
                  aria-hidden="true"
                  className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary"
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </>
  )
}

interface WizardActionsProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> {
  currentIndex: number
  totalSteps: number
  /**
   * Called when the user clicks the back button at step > 0.
   * Typically `onIndexChange(currentIndex - 1)`. May return a Promise —
   * the primitive intentionally discards the return value (fire-and-forget);
   * consumers that need awaited completion should manage their own loading
   * state via `isSubmitting` / `nextDisabled`.
   */
  onBack: () => void | Promise<void>
  /**
   * Called when the user clicks the back button at step 0. When provided the
   * button is labelled "CANCEL" — typically dismiss the wizard / close an
   * inline panel. When omitted, step-0 BACK renders as a disabled button —
   * appropriate for full-page routes that have no in-flow cancel target.
   * Async permitted; see `onBack` notes.
   */
  onCancel?: () => void | Promise<void>
  /**
   * Called when the user clicks the forward button. At the final step the
   * button is labelled with `finalLabel` — typically `onSubmit()`. Otherwise
   * "NEXT →" — typically `onIndexChange(currentIndex + 1)`.
   * Async permitted; see `onBack` notes.
   */
  onNext: () => void | Promise<void>
  isSubmitting?: boolean
  /** Override final-step detection. Otherwise `currentIndex === totalSteps - 1`. */
  isFinalStep?: boolean
  /** Final-step submit-button label. Default `"SUBMIT"`. Pass e.g. `"CREATE INVOICE"`. */
  finalLabel?: string
  /** Label shown while `isSubmitting` is true. Default `"SUBMITTING…"`. */
  submittingLabel?: string
  /** Show "Step N of M" between buttons. Default `true`. */
  showStepCounter?: boolean
  /** Disable the next/submit button regardless of submission state. */
  nextDisabled?: boolean
}

function WizardActions({
  currentIndex,
  totalSteps,
  onBack,
  onCancel,
  onNext,
  isSubmitting = false,
  isFinalStep,
  finalLabel = "SUBMIT",
  submittingLabel = "SUBMITTING…",
  showStepCounter = true,
  nextDisabled = false,
  className,
  ...props
}: WizardActionsProps) {
  // Defensive: a wizard with no steps would render "Step 1 of 0" and break
  // final-step detection. Bail out so consumers with degenerate state don't
  // surface broken UI.
  if (totalSteps <= 0) return null

  // Clamp currentIndex to [0, totalSteps - 1] so out-of-range input from a
  // misbehaving consumer doesn't surface garbage like "Step 100 of 4" or
  // misclassify the final step.
  const safeIndex = Math.max(0, Math.min(currentIndex, totalSteps - 1))

  const final = isFinalStep ?? safeIndex === totalSteps - 1
  const isFirst = safeIndex === 0
  const cancellable = typeof onCancel === "function"
  const backDisabled = isFirst && !cancellable

  // Fire-and-forget at the primitive boundary: consumers manage loading
  // state via isSubmitting / nextDisabled. We still capture failures so
  // an async consumer that rejects won't surface as a global
  // unhandledrejection event in Sentry — the primitive doesn't render the
  // error itself, but it does ensure it's logged. The consumer remains
  // responsible for surfacing user-facing error state (toast, inline).
  //
  // The call must fire SYNCHRONOUSLY (test-visible click handler), so we
  // invoke immediately and only attach .catch when a Promise is returned.
  const fireAndForget = (fn?: () => void | Promise<void>) => {
    if (!fn) return
    try {
      const result = fn()
      if (result instanceof Promise) {
        result.catch((error: unknown) => {
          console.error("[WizardActions] action handler rejected", error)
        })
      }
    } catch (error: unknown) {
      // Sync throw from the handler — same containment policy.
      console.error("[WizardActions] action handler threw", error)
    }
  }

  const handleBackClick = () => {
    if (isFirst) {
      fireAndForget(onCancel)
    } else {
      fireAndForget(onBack)
    }
  }

  const handleNextClick = () => {
    fireAndForget(onNext)
  }

  return (
    <div
      data-slot="wizard-actions"
      className={cn("flex items-center justify-between gap-3", className)}
      {...props}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleBackClick}
        disabled={backDisabled}
      >
        {!isFirst ? <RiArrowLeftLine aria-hidden="true" /> : null}
        <span
          className={cn(
            "font-mono tracking-wider uppercase",
            !isFirst && "ml-1.5"
          )}
        >
          {isFirst && cancellable ? "CANCEL" : "BACK"}
        </span>
      </Button>

      {showStepCounter ? (
        <div
          data-slot="wizard-step-counter"
          aria-live="polite"
          className="font-mono text-2xs tracking-widest text-muted-foreground uppercase"
        >
          Step {safeIndex + 1} of {totalSteps}
        </div>
      ) : null}

      <Button
        type="button"
        size="sm"
        onClick={handleNextClick}
        disabled={isSubmitting || nextDisabled}
      >
        <span className="mr-1.5 font-mono tracking-wider uppercase">
          {isSubmitting ? submittingLabel : final ? finalLabel : "NEXT"}
        </span>
        {final ? (
          <RiCheckLine aria-hidden="true" />
        ) : (
          <RiArrowRightLine aria-hidden="true" />
        )}
      </Button>
    </div>
  )
}

export { Wizard, WizardActions }
export type { WizardStep, WizardProps, WizardActionsProps }
