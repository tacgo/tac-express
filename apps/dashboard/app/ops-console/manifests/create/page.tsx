import type { Metadata } from "next"

import {
  OpsFrame,
  OpsPageHead,
} from "@workspace/ui/components/composed/ops-console"

import { OpsCreateManifestLive } from "./ops-create-manifest-live"

export const metadata: Metadata = { title: "New Manifest — TAC Express Ops Console" }
export const dynamic = "force-dynamic"

// OpsPageHead is required (not optional) — the ManifestBuilderWizard step
// indicator is not an <h1>, so without OpsPageHead the page fails axe's
// `page-has-heading-one` rule (WCAG 2.4.6 / 1.3.1). See R0.1 audit findings.
export default function Page() {
  return (
    <OpsFrame>
      <OpsPageHead
        eyebrow="Operations"
        title="New Manifest"
        sub="Build a transit manifest — pick a route, scan in AWBs, save or close to lock the loadlist."
      />
      <OpsCreateManifestLive />
    </OpsFrame>
  )
}
