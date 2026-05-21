import type { Metadata } from "next"

import { SignInPageClient } from "@workspace/ui/components/composed/auth/sign-in-page-client"
import { SignInSplitLayout } from "@workspace/ui/components/composed/auth/sign-in-split-layout"
import { AnimatedThemeToggler } from "@workspace/ui/components/composed/animated-theme-toggler"

// WCAG 2.4.2 — every page needs a non-empty title. Auth surfaces are
// noindex but the title still surfaces in browser tab + screen-reader nav.
export const metadata: Metadata = {
  title: "Sign in · TAC Express",
  description:
    "Sign in to the TAC Express ops console. Restricted to authorised dispatch and operations personnel.",
  robots: { index: false, follow: false },
}

export default function SignInPage() {
  return (
    <SignInSplitLayout
      heading="Mission control access"
      eyebrow="TAC EXPRESS · OPS CONSOLE"
      description="Restricted to authorised dispatch and operations personnel. Contact your administrator if you cannot sign in."
      imageCaption="DISPATCH · LIVE"
      topRightSlot={<AnimatedThemeToggler />}
    >
      <SignInPageClient redirectTo="/home" />
    </SignInSplitLayout>
  )
}
