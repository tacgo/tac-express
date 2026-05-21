# `.archive/` — Legacy systems retired in the May 2026 consolidation

This directory holds artifacts from earlier skill / governance iterations that have been **superseded** by the consolidated single-system at `.claude/skills/`. Nothing in this folder is loaded by Claude Code, the audit scripts, or the test runner.

Files here are kept for **historical reference only** — you can read them to understand prior design intent, but do not point new code or skills at them.

---

## Contents

### `agents-legacy-stubs/` (formerly `.agents/skills/`)

9 pointer SKILL.md files that delegated to the canonical `.claude/skills/`. Created for compatibility with the GSD framework's `.agents/skills/` scanner. The canonical content always lived in `.claude/skills/` — these were just stubs.

If you ever need to reanimate them, the canonical equivalents are:

| Legacy stub | Canonical |
|---|---|
| `karpathy-coding` | `.claude/skills/tac-karpathy-discipline/` |
| `tac-express-auth` | `.claude/skills/tac-auth/` |
| `tac-express-conventions` | content absorbed into `tac-fourteen-laws` + conventions/ |
| `tac-express-onboarding` | `.claude/skills/tac-express-onboarding/` (current) |
| `tac-express-rules` | `.claude/skills/tac-fourteen-laws/` |
| `tac-express-stack` | content lives in `tac-express-onboarding` § Monorepo Layout |
| `tac-express-ui` | `.claude/skills/tac-ui-authoring/` + `tac-design-tokens/` |
| `gsd` | not preserved — GSD framework retired |
| `pr-review-and-merge` | `.claude/skills/tac-code-review/` |

### `agent-gsd-legacy/` (formerly `.agent/`)

The Get-Shit-Done (GSD) agentic framework — 24 agents, ~250 templates, hooks, settings.json. Self-contained framework targeting a different harness (Claude Code does NOT load these — `.agent/settings.json` was never wired into `.claude/settings.local.json`).

The framework was substantial but **dormant** since installation. The May 2026 consolidation chose a leaner Claude-Code-native model (skills + RESOLVER + conventions) over GSD's heavier 7-stage workflow (discovery → planning → execution → verification → integration → review → retrospective).

If a future task needs that level of process rigor, the templates in `get-shit-done/templates/` are still useful as patterns — but rewire them as Claude Code skills, not as a parallel framework.

---

## Why we consolidated

Three skill locations (`.claude/`, `.agents/`, `.agent/`) plus four governance docs (`AGENTS.md`, `CLAUDE.md`, `PROJECT-RULES.md`, `DESIGN_SYSTEM.md`) created drift risk: rules in one file disagreed with the others; agents had to scan three places to find the right skill; legacy stubs pointed to skills that had been renamed.

The new single system:

```
.claude/skills/                  ← all skills (Claude Code native)
  RESOLVER.md                    ← intent → skill dispatcher
  MANIFEST.json                  ← versioned manifest
  conventions/                   ← cross-cutting rules
    quality-gates.md
    architecture-flow.md
    premium-ui-quality.md
  tac-*/                         ← 20 specialist skills
  ui-ux-pro-max/                 ← third-party breadth (filtered via tac-uipro-bridge)

AGENTS.md                        ← single rules doc (absorbed PROJECT-RULES.md)
CLAUDE.md                        ← Claude Code entry (defers to AGENTS.md)
DESIGN_SYSTEM.md                 ← visual spec
docs/VIOLET-GRID-QUALITY.md      ← anti-template quality bar
docs/UI-AUDIT-BASELINE.md        ← measurable score baseline
```

One source of truth per concern. No duplicates, no drift.
