"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import {
  PrintButton,
  PRINT_PAGE_SIZES,
} from "@workspace/ui/components/primitives/print-button"
import {
  ManifestPrintView,
  type ManifestPrintViewLine,
} from "@workspace/ui/components/composed/manifests/manifest-print-view"
import { RiArrowLeftLine } from "@workspace/ui/icons"
import type { Manifest } from "@workspace/types"

interface PrintManifestClientProps {
  manifest: Manifest
  lines: ManifestPrintViewLine[]
}

export function PrintManifestClient({
  manifest,
  lines,
}: PrintManifestClientProps) {
  const router = useRouter()
  const ref = React.useRef<HTMLDivElement>(null)

  return (
    <div className="min-h-screen bg-background p-6">
      <div
        className="mx-auto mb-6 flex items-center justify-between gap-3 print:hidden"
        style={{ width: "210mm" }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          aria-label="Back"
        >
          <RiArrowLeftLine aria-hidden="true" />
          <span className="ml-1.5">Back</span>
        </Button>
        <div className="flex flex-col items-center">
          <p className="font-mono text-ui-10 tracking-widest text-muted-foreground uppercase">
            Cargo Manifest · A4
          </p>
          <p className="font-mono text-sm font-semibold text-foreground">
            {manifest.manifestNumber}
          </p>
        </div>
        <PrintButton
          contentRef={ref}
          documentTitle={`TAC-Manifest-${manifest.manifestNumber}`}
          pageStyle={PRINT_PAGE_SIZES.A4}
          size="sm"
        >
          Print A4
        </PrintButton>
      </div>

      <div data-print-target="manifest" className="flex justify-center">
        <ManifestPrintView ref={ref} manifest={manifest} lines={lines} />
      </div>
    </div>
  )
}
