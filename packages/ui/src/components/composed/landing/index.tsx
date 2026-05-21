import { CorridorHero } from "./corridor-hero"
import { WhyTac } from "./why-tac"
import { NetworkReach } from "./network-reach"
import { OpsPipeline } from "./ops-pipeline"
import { PlatformCta } from "./platform-cta"
import { ControlTower } from "./control-tower"
import { Capabilities } from "./capabilities"
import { SupportResources } from "./support-resources"
import { Faq } from "./faq"

/**
 * <LandingPage> — the public marketing landing for TAC Express.
 *
 * Section order mirrors the source template's composition, re-mapped to the
 * logistics domain and rendered entirely in the Violet Grid design system:
 *
 *   1. Corridor hero (tracking)   2. Why TAC (features)   3. Network reach
 *   4. Ops pipeline (how-it-works) 5. Platform CTA        6. Control tower
 *   7. Capabilities               8. Support & resources  9. FAQ
 *
 * Nav anchors live on the hero (#tracking), Why TAC (#features), and Ops
 * pipeline (#how-it-works) to match PublicNav. The page chrome (nav, <main>,
 * footer) is provided by apps/web/app/(public)/layout.tsx — this component
 * renders the section stack only.
 */
export function LandingPage() {
  return (
    <>
      <CorridorHero />
      <WhyTac />
      <NetworkReach />
      <OpsPipeline />
      <PlatformCta />
      <ControlTower />
      <Capabilities />
      <SupportResources />
      <Faq />
    </>
  )
}
