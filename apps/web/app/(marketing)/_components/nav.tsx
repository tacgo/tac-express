"use client"

import * as React from "react"
import Link from "next/link"
import { Icon, V2Button } from "./primitives"
import { navContent } from "../_content"

export function V2Nav() {
  const [scrolled, setScrolled] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 transition-all duration-500 sm:px-8"
        style={{
          height: scrolled ? 62 : 76,
          background: scrolled ? "color-mix(in srgb, var(--v2-bg) 88%, transparent)" : "transparent",
          borderBottom: `1px solid ${scrolled ? "var(--v2-line)" : "transparent"}`,
          backdropFilter: scrolled ? "saturate(140%) blur(10px)" : "none",
        }}
      >
        <Link href="/" className="v2-display text-lg tracking-tight" aria-label="TAC Express home">
          {navContent.brand.split(" ")[0]}
          <span className="v2-accent"> {navContent.brand.split(" ")[1]}</span>
        </Link>

        <nav className="hidden items-center gap-9 text-sm font-medium lg:flex">
          {navContent.links.map((l) => (
            <Link key={l.label} href={l.href} className="v2-navlink">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <V2Button href={navContent.secondary.href} variant="ghost">
            {navContent.secondary.label}
          </V2Button>
          <V2Button href={navContent.primary.href}>
            {navContent.primary.label}
            <Icon name="arrow" size={16} />
          </V2Button>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="v2-chip lg:hidden"
          style={{ padding: "0.5rem", borderRadius: 10 }}
        >
          <Icon name={open ? "close" : "menu"} size={20} />
        </button>
      </div>

      {open && (
        <div className="lg:hidden">
          <div
            className="mx-4 mt-2 flex flex-col gap-1 p-3"
            style={{
              background: "var(--v2-surface)",
              border: "1px solid var(--v2-line)",
              borderRadius: "var(--v2-radius)",
              boxShadow: "var(--v2-shadow)",
            }}
          >
            {navContent.links.map((l) => (
              <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="v2-menu-link">
                {l.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <V2Button href={navContent.secondary.href} variant="ghost">
                {navContent.secondary.label}
              </V2Button>
              <V2Button href={navContent.primary.href}>{navContent.primary.label}</V2Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
