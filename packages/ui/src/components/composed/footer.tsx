import * as React from "react"
import Link from "next/link"
import { TacWordmark } from "@workspace/ui/components/primitives/tac-wordmark"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import { Icon } from "@workspace/ui/icons"

export function Footer() {
  return (
    <footer className="bg-card pt-24 pb-12 border-t-2 border-primary-medium">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
          
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center mb-6 group">
              <TacWordmark size="md" />
            </Link>
            <p className="t-body-sm text-foreground/80 leading-relaxed">
              Domestic Cargo Specialists <br />
              Imphal &amp; New Delhi
            </p>
          </div>

          <div>
            <h4 className="t-overline text-foreground mb-6">Services</h4>
            <ul className="flex flex-col gap-3 text-sm font-semibold text-foreground/80">
              <li><Link href="#features" className="hover:text-primary transition-colors">Air Cargo</Link></li>
              <li><Link href="#features" className="hover:text-primary transition-colors">Surface Cargo</Link></li>
              <li><Link href="#features" className="hover:text-primary transition-colors">Packaging</Link></li>
              <li><Link href="#tracking" className="hover:text-primary transition-colors">Track a Shipment</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="t-overline text-foreground mb-6">Company</h4>
            <ul className="flex flex-col gap-3 text-sm font-semibold text-foreground/80">
              <li><Link href="#" className="hover:text-primary transition-colors">About TAC Express</Link></li>
              <li><Link href="#how-it-works" className="hover:text-primary transition-colors">How It Works</Link></li>
              <li><Link href="mailto:contact@tacexpress.in" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Expanding to Northeast India</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="t-overline text-foreground mb-6">Legal</h4>
            <ul className="flex flex-col gap-3 text-sm font-semibold text-foreground/80">
              <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Data Processing Addendum</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border py-10 grid gap-6 md:grid-cols-2 md:items-center mb-2">
          <div>
            <Label htmlFor="footer-newsletter" className="t-overline text-foreground">
              Corridor updates
            </Label>
            <p className="t-body-sm text-muted-foreground mt-2 max-w-sm">
              New lanes, transit times, and service notes across the North-East — a few times a month.
            </p>
          </div>
          <form action="/contact" className="flex w-full max-w-sm gap-2 md:ml-auto">
            <Input
              id="footer-newsletter"
              type="email"
              name="email"
              placeholder="you@company.com"
              aria-label="Email address"
              className="flex-1"
            />
            <Button
              type="submit"
              className="shrink-0 rounded-none font-mono font-bold text-xs tracking-paper-20 uppercase"
            >
              <Icon name="mail" aria-hidden className="mr-2 w-4 h-4" />
              Subscribe
            </Button>
          </form>
        </div>

        <div className="border-t-2 border-primary-subtle pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-foreground/70 font-mono font-medium">
          <div>
            &copy; {new Date().getFullYear()} Tapan Associate Cargo. All rights reserved.
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end">
            {["Imphal", "New Delhi", "Northeast India"].map((loc) => (
              <span
                key={loc}
                className="border border-primary-medium tac-mono-label px-2.5 py-1"
              >
                {loc}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}


