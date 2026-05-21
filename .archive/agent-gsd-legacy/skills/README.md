# .agent/skills — GSD System Skills

> **This directory contains the GSD (Get Shit Done) workflow system.**
> It is managed by the GSD agent system (v1.34.2) and contains ~68 skills.

---

## ⚠️ Do Not Edit Manually

Files in this directory (`gsd-*/SKILL.md`) are managed by GSD and should not be edited manually. They are backward-compatible and consumed by the `gsd` skill in `.agents/skills/gsd/SKILL.md`.

---

## Directory Layout

```
.agent/skills/
  gsd-execute-phase/SKILL.md
  gsd-plan-phase/SKILL.md
  gsd-new-project/SKILL.md
  gsd-verify-work/SKILL.md
  gsd-ship/SKILL.md
  gsd-debug/SKILL.md
  gsd-quick/SKILL.md
  gsd-fast/SKILL.md
  gsd-map-codebase/SKILL.md
  gsd-discuss-phase/SKILL.md
  gsd-progress/SKILL.md
  gsd-resume-work/SKILL.md
  gsd-next/SKILL.md
  gsd-help/SKILL.md
  ... (68 total)
```

---

## Usage

Invoke GSD via the gateway skill:

```
Load: .agents/skills/gsd/SKILL.md
Then use: /gsd-* commands
```

## Project Skills (separate location)

Project-specific skills live in `.agents/skills/` (with an **s**), NOT here:

```
.agents/skills/
  tac-express-onboarding/    ← Load FIRST every session
  tac-express-rules/         ← Fourteen Laws + ADRs
  tac-express-stack/         ← Tech stack reference
  tac-express-auth/          ← Supabase auth patterns
  tac-express-ui/            ← Design tokens + components
  tac-express-conventions/   ← File naming + imports
  karpathy-coding/           ← Coding discipline
  gsd/                       ← This gateway
```
