# Subagent Routing Convention

How to decide between native Agent subagents and inline work in the main loop.

Adopted from GBrain (https://github.com/garrytan/gbrain/blob/master/skills/conventions/subagent-routing.md),
adapted to the Claude Code Agent tool (no Minions runtime here).

## Inline vs Agent (decision table)

| Condition | Action |
|---|---|
| Single tool call, < 30s | Inline, always |
| 1–3 file reads, target known | Inline (`Read` directly) |
| Read-only query against the brain (codebase + memory) | Inline |
| User is waiting in real-time for the answer | Inline |
| Open-ended search across the repo (>3 likely queries) | `Agent subagent_type=Explore` |
| Multi-step research (audit a branch, survey ship-readiness) | `Agent subagent_type=general-purpose` |
| Implementation plan (architecture, multi-file change) | `Agent subagent_type=Plan` |
| Question about Claude Code / SDK / API itself | `Agent subagent_type=claude-code-guide` |
| Output likely > 5K tokens of raw tool results | Agent (protect main context) |
| Independent parallel tasks (e.g., "lint AND typecheck AND grep for X") | Multiple Agents in ONE message |

**Rule of thumb:** if the work would burn >20% of your remaining context with raw
tool output, delegate to an Agent and ask for a < 200-word report.

## Parallel Agent rule

When you need multiple independent things, send a SINGLE message with multiple
`Agent` tool calls so they execute concurrently. Sequential Agent spawns waste
wall-clock.

```
GOOD: One message with: Agent(Explore "find all date pickers")
                      + Agent(Explore "find all forms")
                      + Agent(Plan  "design Phase 5 wizard")

BAD:  Three messages, each with one Agent — 3x the latency
```

## Briefing the Agent (mandatory)

Subagents have NO conversation memory. Every prompt must:

1. State the goal and why (one sentence).
2. Give the file paths / line numbers / what's already been ruled out.
3. Bound the response ("under 200 words", "list-of-files only").
4. Include the brain-first hint: *"Read `.claude/skills/conventions/brain-first.md`
   before any external lookup."*

A terse "find the bug" prompt produces shallow generic work — the same Agent with
a self-contained brief produces precise findings.

## What NOT to delegate

- Anything with a known target (use `Read` / `Grep` / `Edit` directly).
- Anything where you'd review the Agent's output and redo half of it.
- Anything that requires *understanding* the conversation history — that's *your*
  job; don't push synthesis onto the Agent.
- Anything destructive (deletes, force-pushes, migrations). The user's
  confirmation is required and Agents shouldn't be the gate.

## Trust-but-verify

An Agent's summary describes what it *intended* to do. When an Agent writes or
edits code, **check the diff yourself** before reporting the work as done. The
GBrain convention is the same: cross-modal review catches what one model misses.

## Background mode

Use `run_in_background: true` only when:

- The Agent's results are not needed for your next step (e.g., "while it audits
  the branch, I'll update the CHANGELOG").
- The Agent is genuinely long-running (multi-minute research / build watch).

Otherwise default to foreground — you usually need the result to proceed.

## Reference

- Source: GBrain `skills/conventions/subagent-routing.md`
- Tool docs: see the Agent tool's full schema at the top of each session
- Memory: `feedback_macroscope_value.md` (cross-tool review pattern)
