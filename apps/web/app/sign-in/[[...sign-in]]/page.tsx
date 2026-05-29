import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { RiArrowLeftLine } from "@workspace/ui/icons"
import { AnimatedThemeToggler } from "@workspace/ui/components/composed/animated-theme-toggler"
import { SignInPageClient } from "@workspace/ui/components/composed/auth/sign-in-page-client"
import { SignInSplitLayout } from "@workspace/ui/components/composed/auth/sign-in-split-layout"

export default function SignInPage() {
  return (
    <SignInSplitLayout
      heading="Operator sign in"
      eyebrow="TAC EXPRESS · OPS CONSOLE"
      description="Restricted to authorised TAC Express staff. Contact your administrator if you cannot access your account."
      imageCaption="DISPATCH · LIVE"
      topRightSlot={
        <>
          <AnimatedThemeToggler />
          <Button variant="ghost" asChild size="sm" className="tac-mono-label-base text-foreground gap-1.5">
            <Link href="/">
              <RiArrowLeftLine className="size-3.5" aria-hidden="true" />
              Home
            </Link>
          </Button>
        </>
      }
    >
      <SignInPageClient redirectTo="/dashboard" />
    </SignInSplitLayout>
  )
}
