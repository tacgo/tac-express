"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Form primitives — Violet-Grid v7 form composition vocabulary.
 *
 * Phase 4a of the NextAdmin refactor. These are presentational wrappers
 * around react-hook-form / zod (LAW: forms must use those at the
 * behavior layer). They standardize:
 *   FormCard     — outer card surface (sharp, brutalist shadow)
 *   FormSection  — titled group with optional description
 *   FormGrid     — responsive 1-col / 2-col field grid
 *   FormField    — label + control slot + hint or error
 *   FormFooter   — right-aligned action row above an optional separator
 *
 * Consumers stay responsible for `useForm` + `zodResolver` + the
 * `<form onSubmit={handleSubmit(...)}>` wrapper. These primitives don't
 * own validation or submission state — they only own layout + token
 * compliance. See `composed/forms/v7-customer-form.tsx` for a reference
 * consumer.
 */

// Editorial rhythm (v8 ops spike, translated to Violet Grid): a form is a
// primary surface — 32px padding (p-card-pad-lg) and 32px between sections
// (gap-8) for calm, scannable density. Identity unchanged: sharp corners,
// bg-card, brutalist offset shadow.
const formCardVariants = cva(
  "flex flex-col gap-8 border border-border bg-card text-card-foreground p-card-pad-lg shadow-brutal-sm"
)

interface FormCardProps
  extends React.FormHTMLAttributes<HTMLFormElement>,
    VariantProps<typeof formCardVariants> {
  /** Optional max-width: `sm` 28rem, `md` 40rem, `lg` 56rem, `full`. */
  maxWidth?: "sm" | "md" | "lg" | "full"
}

function FormCard({
  className,
  maxWidth = "md",
  children,
  ...props
}: FormCardProps) {
  return (
    <form
      data-slot="form-card"
      data-max-width={maxWidth}
      className={cn(
        formCardVariants(),
        maxWidth === "sm" && "max-w-md",
        maxWidth === "md" && "max-w-2xl",
        maxWidth === "lg" && "max-w-4xl",
        className
      )}
      {...props}
    >
      {children}
    </form>
  )
}

interface FormSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode
  description?: React.ReactNode
}

function FormSection({
  title,
  description,
  className,
  children,
  ...props
}: FormSectionProps) {
  const reactId = React.useId()
  const headingId = title ? `${reactId}-heading` : undefined
  return (
    <section
      data-slot="form-section"
      aria-labelledby={headingId}
      className={cn("flex flex-col gap-4", className)}
      {...props}
    >
      {(title || description) && (
        <header className="flex flex-col gap-1">
          {title ? (
            <h3
              id={headingId}
              className="t-overline text-muted-foreground"
            >
              {title}
            </h3>
          ) : null}
          {description ? (
            <p className="t-caption text-muted-foreground">{description}</p>
          ) : null}
        </header>
      )}
      {children}
    </section>
  )
}

interface FormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 1 = single column always; 2 = single on mobile, two on sm+. */
  cols?: 1 | 2
}

function FormGrid({ cols = 2, className, children, ...props }: FormGridProps) {
  return (
    <div
      data-slot="form-grid"
      data-cols={cols}
      className={cn(
        "grid gap-6",
        cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Caps the field control to a reading measure so a field's width signals its
 * expected input length — a PIN never looks like a 68-char name. Maps to the
 * `--spacing-field-*` tokens. `full` (default) keeps the control at cell width.
 */
const CONTROL_WIDTH: Record<NonNullable<FormFieldProps["controlWidth"]>, string> =
  {
    code: "max-w-field-code",
    sm: "max-w-field-sm",
    md: "max-w-field-md",
    lg: "max-w-field-lg",
    full: "",
  }

interface FormFieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "id"> {
  /** Field id — shared by the input and the label's `htmlFor`. */
  fieldId: string
  label: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  /**
   * Semantic control width — caps the input so its width communicates the
   * expected input length. `code` 8ch · `sm` 16ch · `md` 24ch · `lg` 40ch ·
   * `full` (default) = cell width.
   */
  controlWidth?: "code" | "sm" | "md" | "lg" | "full"
}

function FormField({
  fieldId,
  label,
  hint,
  error,
  required,
  controlWidth = "full",
  className,
  children,
  ...props
}: FormFieldProps) {
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  const widthClass = CONTROL_WIDTH[controlWidth]
  return (
    <div
      data-slot="form-field"
      data-has-error={error ? "true" : undefined}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      <label
        htmlFor={fieldId}
        className="t-caption text-muted-foreground"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive ml-1">
            *
          </span>
        ) : null}
      </label>
      {widthClass ? <div className={widthClass}>{children}</div> : children}
      {error ? (
        <p id={errorId} role="alert" className="t-caption text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="t-caption text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

interface FormFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When true, draws a 1px top border separating actions from the form body. */
  separator?: boolean
}

function FormFooter({
  separator = true,
  className,
  children,
  ...props
}: FormFooterProps) {
  return (
    <div
      data-slot="form-footer"
      className={cn(
        "flex items-center justify-end gap-2",
        separator && "border-t border-border pt-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { FormCard, FormSection, FormGrid, FormField, FormFooter, formCardVariants }
export type {
  FormCardProps,
  FormSectionProps,
  FormGridProps,
  FormFieldProps,
  FormFooterProps,
}
