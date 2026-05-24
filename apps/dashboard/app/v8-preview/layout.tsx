import type { ReactNode } from "react"
import { Plus_Jakarta_Sans, Inter, IBM_Plex_Sans } from "next/font/google"

import { cn } from "@workspace/ui/lib/utils"

import { V8Chrome } from "./v8-chrome"
import "./v8.css"

/**
 * V8 spike layout — owns the scoped design system (`.dashboard-v8` + the three
 * fonts) and the shared shell (V8Chrome), so the overview and the invoice
 * workflow render as one navigable dashboard. Isolated from production v7.
 */

const head = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-v8-head",
})
const body = Inter({ subsets: ["latin"], variable: "--font-v8-body" })
const metric = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-v8-metric",
})

export default function V8PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        head.variable,
        body.variable,
        metric.variable,
        "dashboard-v8"
      )}
    >
      <V8Chrome>{children}</V8Chrome>
    </div>
  )
}
