import * as React from "react"
import { cn } from "../../lib/utils"

interface TacWordmarkProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function TacWordmark({ size = "md", className }: TacWordmarkProps) {
  const sizeClasses = {
    sm: {
      text: "text-xl",
      iconSize: "w-4 h-4",
      iconMargin: "ml-1 mt-0.5",
      iconStroke: "4"
    },
    md: {
      text: "text-2xl",
      iconSize: "w-5 h-5",
      iconMargin: "ml-1 mt-1",
      iconStroke: "4"
    },
    lg: {
      text: "text-3xl sm:text-4xl",
      iconSize: "w-6 h-6 sm:w-8 h-8",
      iconMargin: "ml-1.5 mt-1.5",
      iconStroke: "4.5"
    }
  }

  const active = sizeClasses[size]

  return (
    <div className={cn("flex items-center transition-transform duration-300 group-hover:scale-105", className)}>
      <span className={cn("font-sans font-black italic text-primary tracking-tighter uppercase", active.text)}>
        TAC
      </span>
      <span className={cn("font-sans font-bold italic text-primary tracking-tighter uppercase ml-1.5", active.text)}>
        E<span className="text-accent-warning">X</span>PRESS
      </span>
      <div className={cn("flex items-center justify-center text-accent-warning", active.iconSize, active.iconMargin)}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active.iconStroke}
          strokeLinecap="square"
          strokeLinejoin="miter"
          className="w-full h-full transform translate-x-0 group-hover:translate-x-1 transition-transform duration-200"
        >
          <polyline points="2,12 20,12" />
          <polyline points="12,4 20,12 12,20" />
        </svg>
      </div>
    </div>
  )
}
