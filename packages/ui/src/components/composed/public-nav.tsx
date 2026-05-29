"use client"

import * as React from "react"
import Link from "next/link"
import { Icon } from "@workspace/ui/icons"
import { Button } from "@workspace/ui/components/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@workspace/ui/components/primitives/sheet"
import { AnimatedThemeToggler } from "@workspace/ui/components/composed/animated-theme-toggler"
import { cn } from "@workspace/ui/lib/utils"
import { useSession } from "@workspace/ui/hooks/use-session"
import { TacWordmark } from "@workspace/ui/components/primitives/tac-wordmark"

const _rawDashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL
if (!_rawDashboardUrl && process.env.NODE_ENV === "production") {
  // Emit once at module load time — visible in Vercel function logs and
  // Sentry breadcrumbs without crashing the nav for every page request.
  console.error(
    "[public-nav] NEXT_PUBLIC_DASHBOARD_URL is not set. " +
      "Sign-in CTA and /dashboard redirect will be broken in production.",
  )
}
const DASHBOARD_URL = _rawDashboardUrl ?? "http://localhost:3001"

export function PublicNav() {
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const { user } = useSession()

  React.useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background border-b border-border shadow-sm"
          : "bg-transparent border-b border-transparent py-2"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <TacWordmark size="md" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-bold tracking-widest uppercase">
          <Link href="#features" className="text-foreground/90 hover:text-primary transition-colors relative after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-200">
            Services
          </Link>
          <Link href="#how-it-works" className="text-foreground/90 hover:text-primary transition-colors relative after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-200">
            How it Works
          </Link>
          <Link href="#tracking" className="text-foreground/90 hover:text-primary transition-colors relative after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-200">
            Track Shipment
          </Link>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <AnimatedThemeToggler />
          {!user ? (
            <>
              <Button variant="ghost" className="hover:bg-muted font-medium transition-colors" asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button className="rounded-none shadow-brutal-sm hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all" asChild>
                <Link href="/sign-in">
                  Dashboard <Icon name="arrowRight" className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </>
          ) : (
            <Button className="rounded-none shadow-brutal-sm hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all border border-border bg-card text-foreground" asChild>
              <Link href={DASHBOARD_URL}>
                Dashboard <Icon name="arrowRight" className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden flex items-center gap-2">
          {mounted && (
            <>
              <AnimatedThemeToggler />
              <Sheet>
                <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu" className="text-foreground">
                  <Icon name="menu" className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="border-l border-border bg-card">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex flex-col gap-8 mt-8">
                  <Link href="/" className="flex items-center gap-3 group">
                    <TacWordmark size="sm" />
                  </Link>
                  <nav className="flex flex-col gap-4 text-sm font-bold tracking-widest uppercase mt-4">
                    <Link href="#features" className="text-foreground/90 hover:text-primary pl-3 border-l-2 border-transparent hover:border-primary transition-colors">
                      Services
                    </Link>
                    <Link href="#how-it-works" className="text-foreground/90 hover:text-primary pl-3 border-l-2 border-transparent hover:border-primary transition-colors">
                      How it Works
                    </Link>
                    <Link href="#tracking" className="text-foreground/90 hover:text-primary pl-3 border-l-2 border-transparent hover:border-primary transition-colors">
                      Track Shipment
                    </Link>
                  </nav>
                  <div className="flex flex-col gap-3 mt-4">
                    {!user ? (
                      <>
                        <Button variant="outline" className="w-full justify-center rounded-none" asChild>
                          <Link href="/sign-in">Sign In</Link>
                        </Button>
                        <Button className="w-full justify-center rounded-none shadow-brutal-sm border border-border" asChild>
                          <Link href="/sign-in">Go to Dashboard</Link>
                        </Button>
                      </>
                    ) : (
                      <Button className="w-full justify-center rounded-none shadow-brutal-sm border border-border" asChild>
                        <Link href={DASHBOARD_URL}>Go to Dashboard</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

