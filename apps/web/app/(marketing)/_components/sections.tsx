"use client"

import type React from "react"
import Link from "next/link"
import {
  RiTruckLine,
  RiPlaneLine,
  RiBox3Line,
  RiShieldCheckLine,
  RiMoneyDollarCircleLine,
  RiMapLine,
  RiArrowRightUpLine,
  RiArrowRightLine,
  RiMapPinLine,
} from "@workspace/ui/icons"
import { Button } from "@workspace/ui/components/button"
import { Reveal } from "./primitives"
import {
  statsContent,
  servicesContent,
  networkContent,
  workflowContent,
  codContent,
  pricingContent,
  testimonialsContent,
  ctaContent,
} from "../_content"

type IconComp = React.ComponentType<{ className?: string }>

const serviceIconMap: Record<string, IconComp> = {
  truck: RiTruckLine,
  plane: RiPlaneLine,
  box: RiBox3Line,
  shield: RiShieldCheckLine,
  coins: RiMoneyDollarCircleLine,
  route: RiMapLine,
}

/* ── Stats band ─────────────────────────────────────────────────────── */
export function V2Stats() {
  return (
    <section className="border-y border-border bg-muted px-5 py-14 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {statsContent.items.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.07}>
            <div className="border-l-2 border-primary pl-5">
              <div className="t-data text-primary">{s.value}</div>
              <div className="mt-2 font-semibold text-foreground">{s.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.note}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ── Services grid ──────────────────────────────────────────────────── */
export function V2Services() {
  return (
    <section id={servicesContent.id} className="px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <span className="tac-mono-label">
              {servicesContent.eyebrow}
            </span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
              {servicesContent.heading}
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="t-body text-muted-foreground">{servicesContent.lead}</p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {servicesContent.items.map((item, i) => {
            const IconEl = serviceIconMap[item.icon] ?? RiBox3Line
            return (
              <Reveal key={item.title} delay={(i % 3) * 0.08}>
                <article className="group h-full border border-border bg-card p-7 shadow-sm transition-all duration-150 hover:border-primary/40 hover:shadow">
                  <span aria-hidden="true" className="inline-flex h-10 w-10 items-center justify-center border border-border bg-muted text-primary transition-colors duration-150 group-hover:border-primary/40 group-hover:bg-primary/10">
                    <IconEl className="size-5" />
                  </span>
                  <h3 className="mt-5 t-h4 text-foreground">{item.title}</h3>
                  <p className="mt-2.5 t-body-sm text-muted-foreground">{item.body}</p>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ── Network ────────────────────────────────────────────────────────── */
export function V2Network() {
  return (
    <section id={networkContent.id} className="px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <Reveal>
          <span className="tac-mono-label">
            {networkContent.eyebrow}
          </span>
          <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            {networkContent.heading}
          </h2>
          <p className="mt-6 t-body text-muted-foreground">{networkContent.lead}</p>
          <div className="mt-8">
            <Button asChild variant="ghost">
              <Link href="/services">
                Explore the network
                <RiArrowRightUpLine className="ml-1.5 size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="border border-border bg-card p-8 shadow-sm">
            <div className="tac-mono-label">
              Corridor coverage
            </div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {networkContent.regions.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1.5 border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  <RiMapPinLine className="size-3.5 text-primary" aria-hidden="true" />
                  {r}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ── Workflow ────────────────────────────────────────────────────────── */
export function V2Workflow() {
  return (
    <section id={workflowContent.id} className="border-y border-border bg-muted px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <span className="tac-mono-label">
            {workflowContent.eyebrow}
          </span>
          <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            {workflowContent.heading}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {workflowContent.steps.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.08}>
              <div className="h-full border border-border bg-card p-7">
                <div className="font-mono text-3xl font-bold tabular-nums text-primary/30">{s.step}</div>
                <h3 className="mt-4 t-h4 text-foreground">{s.title}</h3>
                <p className="mt-2 t-body-sm text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── COD settlement ─────────────────────────────────────────────────── */
export function V2Cod() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <Reveal className="lg:col-span-5">
            <span className="tac-mono-label">
              {codContent.eyebrow}
            </span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
              {codContent.heading}
            </h2>
            <div className="mt-8">
              <Button asChild variant="ghost">
                <Link href={codContent.ctaHref}>
                  {codContent.ctaLabel}
                  <RiArrowRightUpLine className="ml-1.5 size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </Reveal>

          <div className="lg:col-span-7">
            <Reveal delay={0.1}>
              <p className="t-body text-muted-foreground">{codContent.lead}</p>
            </Reveal>

            <div className="mt-8 grid gap-px sm:grid-cols-3">
              {codContent.stats.map((s, i) => (
                <Reveal key={s.label} delay={0.12 + i * 0.06}>
                  <div className="border border-border bg-card p-6" style={{ borderLeft: "3px solid var(--primary)" }}>
                    <div className="font-mono text-2xl font-bold tabular-nums text-primary">{s.value}</div>
                    <div className="mt-1.5 text-sm font-semibold text-foreground">{s.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{s.note}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-px sm:grid-cols-3">
          {codContent.steps.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.08}>
              <div className="h-full border border-border bg-muted p-7">
                <div className="font-mono text-3xl font-bold tabular-nums text-primary/30">{s.step}</div>
                <h3 className="mt-4 t-h4 text-foreground">{s.title}</h3>
                <p className="mt-2 t-body-sm text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Pricing reference ──────────────────────────────────────────────── */
export function V2Pricing() {
  return (
    <section className="border-y border-border bg-muted px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <span className="tac-mono-label">
              {pricingContent.eyebrow}
            </span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
              {pricingContent.heading}
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="t-body-sm text-muted-foreground">{pricingContent.note}</p>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="mt-12 overflow-x-auto">
            <table
              className="w-full border-collapse border border-border"
              aria-label="Reference corridor tariffs"
            >
              <thead>
                <tr className="border-b border-border bg-card">
                  {["Lane", "Service", "Transit", "First 500 g", "Per 500 g above"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground ${i >= 2 ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pricingContent.tiers.map((row) => (
                  <tr
                    key={`${row.lane}-${row.service}`}
                    className="border-b border-border bg-background transition-colors hover:bg-muted"
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono text-sm font-semibold text-primary">{row.lane}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{row.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="border border-border bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                        {row.service}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-foreground">
                      {row.transit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-foreground">
                      {row.upTo500g}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-foreground">
                      {row.per500gAbove}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-8">
            <Button asChild>
              <Link href={pricingContent.ctaHref}>
                {pricingContent.ctaLabel}
                <RiArrowRightLine className="ml-1.5 size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ── Testimonials ───────────────────────────────────────────────────── */
export function V2Testimonials() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <span className="tac-mono-label">
            {testimonialsContent.eyebrow}
          </span>
          <h2 className="mt-4 max-w-xl font-serif text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            {testimonialsContent.heading}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonialsContent.items.map((item, i) => (
            <Reveal key={item.company} delay={i * 0.08}>
              <figure className="flex h-full flex-col border border-border bg-card p-7 shadow-sm">
                <blockquote className="flex-1 t-body-sm text-muted-foreground">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 border-t border-border pt-5">
                  <div className="t-mono font-bold text-primary">{item.metric}</div>
                  <div className="mt-1.5 text-sm font-semibold text-foreground">{item.author}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{item.company}</div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Closing CTA ────────────────────────────────────────────────────── */
export function V2Cta() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:py-28">
      <Reveal>
        <div
          className="mx-auto flex max-w-5xl flex-col items-center gap-7 border border-border p-10 text-center sm:p-16"
          style={{ borderTop: "2px solid var(--primary)", background: "var(--overlay-primary-soft)" }}
        >
          <h2 className="max-w-2xl font-serif text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            {ctaContent.heading}
          </h2>
          <p className="max-w-xl t-body text-muted-foreground">{ctaContent.body}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href={ctaContent.primary.href}>
                {ctaContent.primary.label}
                <RiArrowRightLine className="ml-1.5 size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={ctaContent.secondary.href}>
                <RiMapPinLine className="mr-1.5 size-4" aria-hidden="true" />
                {ctaContent.secondary.label}
              </Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
