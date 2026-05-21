# Claude Code Plugin Policy

> **Status:** ACTIVE — governs how the 13 installed Claude Code plugins coexist with the bespoke `tac-*` skillpack.
> **Date established:** 2026-05-21
> **Authority:** PM decision · `CLAUDE.md §0.5` (mandatory GBrain dispatch) · `.claude/skills/RESOLVER.md §3.6` (tac-* precedence) · `AGENTS.md` (Fourteen Laws)

---

## What this document decides

Thirteen official Claude Code plugins were installed at the user/global level. They ship generic skills (brainstorming, TDD, code review, frontend design, skill authoring) and live tooling (MCP servers). This project already enforces a **bespoke, domain-bound skillpack** (`.claude/skills/tac-*`) with the Fourteen Laws, the Violet Grid design system, and hard quality gates (`pnpm audit:skills`, `pnpm test:routing-eval`).

The two systems overlap. This document is the **single source of truth for which plugin is allowed to do what** on a tac-express task, so a generic plugin can never silently override a project law.

**The governing rule (from `RESOLVER.md §3.6`):**

> A `tac-*` skill is **authoritative** for any tac-express task and always wins over an equivalent generic plugin skill. External plugins are a **fallback / pattern-source only** — used for an intent no `tac-*` skill covers, or to borrow a pattern applied *through* our conventions. An external plugin never overrides the mandatory `tac-*` dispatch from `CLAUDE.md §0.5`.

---

## The triage (all 13 plugins)

Each plugin is sorted into one of four tiers: **ADOPT** (use freely within its lane), **ON-DEMAND** (use when explicitly invoked or clearly warranted), **COEXIST/FALLBACK** (a `tac-*` skill owns the intent; the plugin is pattern-source only), **DEFER/GUARD** (do not activate without explicit user confirmation — it touches product or governance surfaces).

| # | Plugin | Tier | Lane / why |
|---|---|---|---|
| 1 | **context7** (MCP) | ADOPT | Live, current library docs. Use for any "how does X API work" lookup *after* brain-first (`conventions/brain-first.md`): codebase + skills + memory first, then context7 over web search. |
| 2 | **chrome-devtools-mcp** (MCP) | ADOPT | Real browser automation, screenshots, Lighthouse, perf traces, console/network capture. **Fills the flaky `Claude_Preview` gap.** Primary tool for verifying/auditing UI surfaces. |
| 3 | **vercel** (MCP/skill) | ADOPT | Deployment, preview URLs, env inspection. Read-only/diagnostic use is free; any deploy/promote/env-write requires explicit user confirmation (financial/irreversible boundary). |
| 4 | **pr-review-toolkit** | ADOPT | Specialist review sub-agents (silent-failure-hunter, type-design-analyzer, test-analyzer, comment-analyzer, code-simplifier). Complements `tac-code-review` — runs *alongside* it, never replaces the tac quality gates. |
| 5 | **security-guidance** | ADOPT | Security best-practice lookup. Advisory only; pairs with the prompt-injection / privacy rules already in force. |
| 6 | **firecrawl** (MCP) | ON-DEMAND | Web scraping / crawl. Use only when a task genuinely needs page extraction (e.g., porting a referenced template). Respect copyright + harmful-content rules. |
| 7 | **coderabbit** | ON-DEMAND | The repo already runs CodeRabbit in CI (`.coderabbit.yaml`, ASSERTIVE). The plugin is for local pre-push review when wanted; CI remains the gate of record. |
| 8 | **superpowers** | COEXIST/FALLBACK | Generic brainstorming/TDD/debug/review/skill-authoring. **`tac-*` equivalents win** (`tac-brainstorming`, `tac-tdd`, `tac-debug`, `tac-code-review`, `tac-skillify`). Borrow patterns (e.g., subagent-driven dev) *through* `conventions/subagent-routing.md` only. |
| 9 | **code-review** (generic) | COEXIST/FALLBACK | Superseded by `tac-code-review` + `pr-review-toolkit` for this repo. Fallback only for non-tac contexts. |
| 10 | **frontend-design** | DEFER/GUARD | Generic design opinions conflict with the Violet Grid (0rem radius, brutalist offsets, locked fonts/tokens, LAW 13). **Do not let it pick colors, fonts, radii, or styles.** `tac-design-tokens` + `tac-premium-patterns` own those decisions. Activate only with explicit user sign-off. |
| 11 | **claude-md-management** | DEFER/GUARD | Edits `CLAUDE.md` / agent-governance files. The authority chain is hand-curated and load-bearing. **Never let it rewrite `CLAUDE.md`, `AGENTS.md`, or `RESOLVER.md` automatically.** Confirm with user first. |
| 12 | **sentry** | ADOPTED (approved 2026-05-21) | Was DEFER/GUARD (a #102 deferral). **User approved re-adding on 2026-05-21 and it was implemented in PR #7** (`feat/sentry-dashboard-init`): dashboard-only via the DI-tagger architecture, `sendDefaultPii: false`, env DSN, `tracePropagationTargets` scoped to own origins, third-party/extension noise filtered, RBAC-gated `api/diagnostics/sentry` verification route. Privacy posture preserved. Alert-rule infra (SB-2 scripts/runbook) remains out of scope until separately requested. |
| 13 | **claude-code-setup** | N/A | Meta/onboarding tool for configuring Claude Code itself. Not relevant to product tasks. |

---

## Decision flow (every task)

```
1. CLAUDE.md §0.5 → read RESOLVER.md → load the matching tac-* skill.   (UNCHANGED — always first)
2. Does a tac-* skill own this intent?
     YES → tac-* is authoritative. A plugin may only ASSIST (pattern / live tooling), never override.
     NO  → may an ADOPT/ON-DEMAND plugin cover it cleanly? Use it, still honoring the Fourteen Laws + conventions.
3. Is the plugin in DEFER/GUARD? → STOP. Confirm with the user before activating.
4. Apply cross-cutting conventions regardless (quality-gates, architecture-flow, premium-ui-quality, brain-first).
```

---

## What's explicitly NOT allowed

- **No plugin overrides a Law.** A generic skill suggesting `npm install`, raw Tailwind colors, rounded-full, soft shadows, or a component in `apps/web/` is wrong here — the Fourteen Laws win.
- **No automatic governance edits.** `claude-md-management` may not rewrite the authority-chain files without explicit user approval.
- **No generic design takeover.** `frontend-design` may not select colors/fonts/radii/styles. Those are owned by `tac-design-tokens` and the preset alignment (`b5Fxrc2eNU`, theme + fonts only).
- **No silent product changes.** Sentry re-add, Vercel deploy/promote/env-write, and any irreversible action keep the existing explicit-permission boundary.
- **CI stays the gate of record.** Local `coderabbit`/`pr-review-toolkit` runs are advisory; the merge gate is CI + the five tac quality gates.

---

## Adopted-tooling notes

- **chrome-devtools-mcp is now the primary UI-verification tool.** Where the conversation previously relied on the flaky `Claude_Preview` dev server (which kept exiting), use chrome-devtools-mcp: `navigate_page` → `take_snapshot` / `take_screenshot`, plus `performance_start_trace` / `lighthouse_audit` for measurable UI scoring that feeds `tac-ui-rubric`.
- **context7 sits behind brain-first.** Check the codebase, the skills, and memory first; reach for context7 when the answer is genuinely a current third-party API detail.

---

## Review trigger

Re-evaluate this policy when: a new plugin is installed, a plugin moves tiers in practice, or a DEFER/GUARD plugin is approved by the user for a specific task (record the approval here).

### Recorded approvals

- **2026-05-21 — `sentry`** moved DEFER/GUARD → ADOPTED. User approved re-adding Sentry; implemented in PR #7 (`feat/sentry-dashboard-init`), dashboard-only, privacy-preserving (`sendDefaultPii: false`, env DSN, own-origin trace propagation, third-party noise filtered). Alert-rule provisioning (SB-2) remains out of scope until separately requested.

**Last reviewed: 2026-05-21.**
