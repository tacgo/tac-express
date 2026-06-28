import type { Metadata } from "next"

import { PageShell } from "@workspace/ui/components/composed/page-shell"

import { OpsCreateManifestLive } from "./ops-create-manifest-live"

export const metadata: Metadata = {
  title: "New Manifest — TAC Express Ops Console",
}
export const dynamic = "force-dynamic"

// h1 required: ManifestBuilderWizard step indicator is not an <h1>,
// so the inline header below satisfies WCAG 2.4.6 / 1.3.1. See R0.1 audit findings.
export default function Page() {
  return (
    <PageShell>
      <header className="border-b border-border pb-4">
        <p className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
          Operations
        </p>
        <h1 className="mt-0.5 font-sans text-2xl font-bold text-foreground">
          New Manifest
        </h1>
        <p className="t-body-sm mt-1 text-muted-foreground">
          Build a transit manifest — pick a route, scan in AWBs, save or close
          to lock the loadlist.
        </p>
      </header>
      <OpsCreateManifestLive />
    </PageShell>
  )
}
