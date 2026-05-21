import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Icon } from "@workspace/ui/icons"
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
          <Button
            variant="ghost"
            asChild
            className="font-sans text-sm font-semibold tracking-wide text-foreground"
          >
            <Link href="/">
              <Icon name="arrowLeft" className="mr-2 h-4 w-4" />
              HOME
            </Link>
          </Button>
        </>
      }
    >
      <SignInPageClient redirectTo="/dashboard" />
    </SignInSplitLayout>
  )
}
