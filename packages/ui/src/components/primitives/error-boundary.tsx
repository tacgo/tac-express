"use client"

import * as React from "react"
import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode
  onError?: (error: Error, info: React.ErrorInfo) => void
  className?: string
}

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback({ error, reset: this.reset })
      }
      return (
        <div
          role="alert"
          data-slot="error-boundary"
          className={cn(
            "tac-fui-panel border-l-4 border-l-destructive p-6",
            this.props.className,
          )}
        >
          <p className="tac-mono-label text-destructive">Error</p>
          <h3 className="mt-1 text-base font-semibold text-foreground">Something broke</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-4 inline-flex items-center justify-center border border-border bg-background px-3 py-1.5 text-sm font-medium tac-fui-hover"
          >
            Reset
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export { ErrorBoundary }
