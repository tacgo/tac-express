"use client"

import { Icon, Reveal, V2Button, type V2IconName } from "./primitives"
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

/* ── Stats band ─────────────────────────────────────────────────────────── */
export function V2Stats() {
  return (
    <section className="v2-bg-2 px-5 py-14 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {statsContent.items.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.07}>
            <div>
              <div className="v2-mono v2-size-stat v2-accent">{s.value}</div>
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

/* ── COD settlement spotlight ───────────────────────────────────────────── */
export function V2Cod() {
  return (
    <section className="v2-section px-5 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Asymmetric header: 5 col headline / 7 col body */}
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <Reveal className="lg:col-span-5">
            <span className="v2-eyebrow">{codContent.eyebrow}</span>
            <h2 className="v2-h2 v2-size-h2 mt-4">{codContent.heading}</h2>
            <div className="mt-8">
              <V2Button href={codContent.ctaHref} variant="ghost">
                {codContent.ctaLabel}
                <Icon name="arrowUpRight" size={16} />
              </V2Button>
            </div>
          </Reveal>

          <div className="lg:col-span-7">
            <Reveal delay={0.1}>
              <p className="v2-lead">{codContent.lead}</p>
            </Reveal>

            {/* KPI strip */}
            <div className="mt-8 grid gap-px sm:grid-cols-3">
              {codContent.stats.map((s, i) => (
                <Reveal key={s.label} delay={0.12 + i * 0.06}>
                  <div className="v2-cod-stat">
                    <div className="v2-mono v2-cod-stat-value v2-accent">{s.value}</div>
                    <div className="v2-cod-stat-label">{s.label}</div>
                    <div className="v2-cod-stat-note">{s.note}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        {/* 3-step process */}
        <div className="mt-14 grid gap-px sm:grid-cols-3">
          {codContent.steps.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.08}>
              <div className="v2-bg-surface h-full p-7">
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

/* ── Pricing reference ──────────────────────────────────────────────────── */
export function V2Pricing() {
  return (
    <section className="v2-section v2-bg-2 px-5 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <span className="v2-eyebrow">{pricingContent.eyebrow}</span>
            <h2 className="v2-h2 v2-size-h2 mt-4">{pricingContent.heading}</h2>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="v2-lead">{pricingContent.note}</p>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="mt-12 v2-price-table-wrap">
            <table className="v2-price-table" aria-label="Reference corridor tariffs">
              <thead>
                <tr>
                  <th className="v2-price-th">Lane</th>
                  <th className="v2-price-th">Service</th>
                  <th className="v2-price-th v2-price-num">Transit</th>
                  <th className="v2-price-th v2-price-num">First 500 g</th>
                  <th className="v2-price-th v2-price-num">Per 500 g above</th>
                </tr>
              </thead>
              <tbody>
                {pricingContent.tiers.map((row) => (
                  <tr key={`${row.lane}-${row.service}`} className="v2-price-row">
                    <td className="v2-price-td">
                      <span className="v2-mono v2-accent">{row.lane}</span>
                      <span className="v2-price-desc">{row.description}</span>
                    </td>
                    <td className="v2-price-td">
                      <span className="v2-price-badge">{row.service}</span>
                    </td>
                    <td className="v2-price-td v2-price-num v2-mono">{row.transit}</td>
                    <td className="v2-price-td v2-price-num v2-mono">{row.upTo500g}</td>
                    <td className="v2-price-td v2-price-num v2-mono">{row.per500gAbove}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-8">
            <V2Button href={pricingContent.ctaHref}>
              {pricingContent.ctaLabel}
              <Icon name="arrow" size={16} />
            </V2Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ── Testimonials ───────────────────────────────────────────────────────── */
export function V2Testimonials() {
  return (
    <section className="v2-section px-5 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <span className="v2-eyebrow">{testimonialsContent.eyebrow}</span>
          <h2 className="v2-h2 v2-size-h2 mt-4 max-w-xl">{testimonialsContent.heading}</h2>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonialsContent.items.map((item, i) => (
            <Reveal key={item.company} delay={i * 0.08}>
              <figure className="v2-testimonial h-full">
                <blockquote className="v2-testimonial-quote">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="v2-testimonial-meta">
                  <span className="v2-mono v2-accent v2-testimonial-metric">{item.metric}</span>
                  <span className="v2-testimonial-author">{item.author}</span>
                  <span className="v2-testimonial-company">{item.company}</span>
                </figcaption>
              </figure>
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
