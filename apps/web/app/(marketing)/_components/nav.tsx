"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { RiMenuLine, RiCloseLine, RiArrowRightLine, RiSunLine, RiMoonClearLine } from "@workspace/ui/icons"
import { navContent } from "../_content"

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="size-9" />

  return (
    <button
      type="button"
      aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex size-9 items-center justify-center border border-border bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:tac-focus-premium"
    >
      {resolvedTheme === "dark" ? (
        <RiSunLine className="size-4" aria-hidden="true" />
      ) : (
        <RiMoonClearLine className="size-4" aria-hidden="true" />
      )}
    </button>
  )
}

export function V2Nav() {
  const [scrolled, setScrolled] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 transition-all duration-500 sm:px-8",
          scrolled
            ? "border-b border-border bg-background"
            : "border-b border-transparent bg-transparent",
        )}
        style={{ height: scrolled ? 62 : 76 }}
      >
        <Link
          href="/"
          className="font-serif text-lg font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:tac-focus-premium"
          aria-label="TAC Express home"
        >
          {navContent.brand.split(" ")[0]}
          <span className="text-primary"> {navContent.brand.split(" ")[1]}</span>
        </Link>

        <nav className="hidden items-center gap-9 text-sm font-medium lg:flex">
          {navContent.links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:tac-focus-premium"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={navContent.secondary.href}>{navContent.secondary.label}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={navContent.primary.href}>
              {navContent.primary.label}
              <RiArrowRightLine className="ml-1.5 size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex size-9 items-center justify-center border border-border bg-background text-foreground lg:hidden focus-visible:outline-none focus-visible:tac-focus-premium"
        >
          {open ? (
            <RiCloseLine className="size-5" aria-hidden="true" />
          ) : (
            <RiMenuLine className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {open && (
        <div className="border-b border-border bg-background lg:hidden">
          <div className="mx-auto max-w-6xl px-5 py-4 sm:px-8">
            <nav className="flex flex-col gap-0.5">
              {navContent.links.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:tac-focus-premium"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href={navContent.secondary.href}>{navContent.secondary.label}</Link>
              </Button>
              <Button asChild size="sm" className="w-full">
                <Link href={navContent.primary.href}>{navContent.primary.label}</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
