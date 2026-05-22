"use client"

import { Icon, Reveal, V2Button, type V2IconName } from "./primitives"
import {
  statsContent,
  servicesContent,
  networkContent,
  workflowContent,
  ctaContent,
} from "../_content"

/* ── Stats band ─────────────────────────────────────────────────────────── */
export function V2Stats() {
  return (
    <section className="v2-bg-2 px-5 py-14 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {statsContent.items.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.07}>
            <div>
              <div className="v2-display v2-size-stat v2-accent">{s.value}</div>
              <div className="mt-2 font-semibold">{s.label}</div>
              <div className="v2-muted mt-1 text-sm">{s.note}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ── Services grid ──────────────────────────────────────────────────────── */
export function V2Services() {
  return (
    <section id={servicesContent.id} className="v2-section px-5 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <span className="v2-eyebrow">{servicesContent.eyebrow}</span>
            <h2 className="v2-h2 v2-size-h2 mt-4">{servicesContent.heading}</h2>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="v2-lead">{servicesContent.lead}</p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {servicesContent.items.map((item, i) => (
            <Reveal key={item.title} delay={(i % 3) * 0.08}>
              <article className="v2-card v2-card-hover h-full p-7">
                <span className="v2-icon-tile">
                  <Icon name={item.icon as V2IconName} size={22} />
                </span>
                <h3 className="v2-h3 v2-size-h3 mt-5">{item.title}</h3>
                <p className="v2-muted mt-2.5 text-sm leading-relaxed">{item.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Network (asymmetric: copy + region chips) ──────────────────────────── */
export function V2Network() {
  return (
    <section id={networkContent.id} className="v2-section px-5 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <Reveal>
          <span className="v2-eyebrow">{networkContent.eyebrow}</span>
          <h2 className="v2-h2 v2-size-h2 mt-4">{networkContent.heading}</h2>
          <p className="v2-lead mt-6">{networkContent.lead}</p>
          <div className="mt-8">
            <V2Button href="/services" variant="ghost">
              Explore the network
              <Icon name="arrowUpRight" size={16} />
            </V2Button>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="v2-card p-8">
            <div className="v2-eyebrow">Corridor coverage</div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {networkContent.regions.map((r) => (
                <span key={r} className="v2-chip">
                  <Icon name="pin" size={14} className="v2-accent" />
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

/* ── Workflow (numbered steps) ──────────────────────────────────────────── */
export function V2Workflow() {
  return (
    <section id={workflowContent.id} className="v2-section v2-bg-2 px-5 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <span className="v2-eyebrow">{workflowContent.eyebrow}</span>
          <h2 className="v2-h2 v2-size-h2 mt-4">{workflowContent.heading}</h2>
        </Reveal>

        <div className="mt-12 grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {workflowContent.steps.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.08}>
              <div className="v2-bg-surface h-full p-7" style={{ borderRadius: "var(--v2-radius)" }}>
                <div className="v2-num">{s.step}</div>
                <h3 className="v2-h3 v2-size-h3 mt-4">{s.title}</h3>
                <p className="v2-muted mt-2 text-sm leading-relaxed">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Closing CTA ────────────────────────────────────────────────────────── */
export function V2Cta() {
  return (
    <section className="v2-section px-5 sm:px-8">
      <Reveal>
        <div
          className="mx-auto flex max-w-5xl flex-col items-center gap-7 p-10 text-center sm:p-16"
          style={{
            background: "var(--v2-accent-soft)",
            borderRadius: "var(--v2-radius)",
            boxShadow: "var(--v2-shadow)",
          }}
        >
          <h2 className="v2-h2 v2-size-h2 max-w-2xl">{ctaContent.heading}</h2>
          <p className="v2-lead max-w-xl">{ctaContent.body}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <V2Button href={ctaContent.primary.href}>
              {ctaContent.primary.label}
              <Icon name="arrow" size={17} />
            </V2Button>
            <V2Button href={ctaContent.secondary.href} variant="ghost">
              <Icon name="pin" size={17} />
              {ctaContent.secondary.label}
            </V2Button>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
