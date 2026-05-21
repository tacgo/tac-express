import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cookie Policy — TAC Express",
  description: "How TAC Express uses cookies on the marketing site and dashboard.",
}

export default function CookiesPage() {
  return (
    <article className="bg-background px-6 py-24">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="tac-mono-label">Legal / Cookies</p>
          <h1 className="mt-2 text-balance text-4xl font-bold">Cookie Policy</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Effective 30 April 2026
          </p>
        </header>

        <section className="space-y-4 leading-relaxed text-foreground">
          <p>
            TAC Express uses three categories of cookies: strictly necessary (session, CSRF, hub
            preference), preference (theme, density), and analytics (privacy-respecting page-view
            counts via Plausible).
          </p>
          <p>
            We do not use third-party advertising trackers. The dashboard never sets analytics
            cookies for warehouse staff terminals.
          </p>
          <p>
            You can clear cookies at any time via your browser. Opting out of preference cookies will
            reset theme and density to defaults each session.
          </p>
        </section>
      </div>
    </article>
  )
}
