# CodeRabbit Pattern Catalog

> Consolidated pattern catalog from CodeRabbit findings across the 2026-05-15→2026-05-16 two-day arc. Originally scattered across per-PR retros + test-file docstrings; landed here as a single canonical artifact in PR following #123.
>
> **Mandatory pre-read** for any PR that writes tests, mock-builders, file-anchor sentinels, regex parsers, or marker comments. AGENTS.md § 0 references this file.

---

## How to read this

Each entry has the same shape:

- **Pattern:** one-line rule
- **Category:** one of {test-assertion-strength, code-reference-stability, type-safety, abstraction-timing}
- **Originating PR:** the PR where CodeRabbit flagged this; cross-reference for the original finding text
- **Why it matters:** the bug class the pattern prevents
- **Code example:** ≤10 lines showing the pattern correctly applied
- **Bot-side learning:** if CodeRabbit recorded this as a long-term learning in their memory, noted here

If a pattern listed below has been recorded as a CodeRabbit learning, future PRs in this repo will inherit it automatically — but writing the pattern correctly the first time saves the review round.

---

## Category: test-assertion-strength

### 1. Value-contract over call-existence

- **Pattern:** If a test asserts a side-effect that's a VALUE (filter predicate, update payload, guard arg, default fallback), the test MUST capture and assert the value via `mockImplementation` arg-capture. Asserting only that the call happened is the bot-catch pattern.
- **Originating PRs:** #123 (introduced in 4 rounds against `invoice.service.test.ts`)
- **Why it matters:** Bare `expect(db.from).toHaveBeenCalledWith("invoices")` passes even when the WHERE clause is wrong, the update payload is missing fields, the default is the wrong number, or the guard predicate was silently dropped. The classic bug shape is dropping the `.eq("status", "DRAFT")` guard on `issueInvoice` — the test still passes; production silently allows ISSUE on PAID/CANCELLED rows.
- **Bot-side learning:** ✓ recorded — CodeRabbit now flags ALL tests in the same describe block that lack value-capture, not just the first instance found.

```ts
// WRONG — passes if .eq is dropped, if status is "EXPIRED", if guard is missing entirely
expect(db.from).toHaveBeenCalledWith("invoices")

// RIGHT — captures the actual value(s) sent to the DB
let updatePayload, eqCalls = []
vi.mocked(db.from).mockImplementation((_table) => {
  const builder = makeBuilder({ data: null, error: null })
  builder.update = vi.fn((arg) => { updatePayload = arg; return builder })
  builder.eq = vi.fn((col, val) => { eqCalls.push({ col, val }); return builder })
  return builder as unknown as never
})
await service.issueInvoice("inv-1")
expect(updatePayload?.status).toBe("ISSUED")
expect(eqCalls).toContainEqual({ col: "status", val: "DRAFT" })  // the load-bearing guard
```

### 2. Multi-step path: `toHaveBeenNthCalledWith` + `toHaveBeenCalledTimes(N)`

- **Pattern:** When a service method touches multiple tables in sequence, the test must assert the EXACT call order AND count. `toHaveBeenCalledWith` alone proves only that each table was touched somewhere; it doesn't catch a regression that skips an intermediate step.
- **Originating PR:** #118 (payment.service.test.ts `recordPayment` fallback path)
- **Why it matters:** Service methods like `createInvoice` chain shipments → customers → invoices. A regression that skips the customer lookup wouldn't be caught by `toHaveBeenCalledWith("invoices")` — both tables still got touched.

```ts
// WRONG — passes even if customer lookup is skipped
expect(db.from).toHaveBeenCalledWith("shipments")
expect(db.from).toHaveBeenCalledWith("customers")
expect(db.from).toHaveBeenCalledWith("invoices")

// RIGHT — pins the exact insert → select → update flow
expect(db.from).toHaveBeenCalledTimes(3)
expect(db.from).toHaveBeenNthCalledWith(1, "shipments")
expect(db.from).toHaveBeenNthCalledWith(2, "customers")
expect(db.from).toHaveBeenNthCalledWith(3, "invoices")
```

### 3. `statSync(...).isFile()` for file invariants

- **Pattern:** Use `statSync(path).isFile()` (or equivalent), not bare `existsSync()`, when the test invariant is "this thing is a file." `existsSync` returns `true` for directories too.
- **Originating PR:** #121 (`audit-doc-references.test.ts`)
- **Why it matters:** A future audit doc edit that accidentally references a directory path (e.g., `[..](docs/runbooks/)` instead of `[..](docs/runbooks/sentry.md)`) would pass `existsSync` but break every downstream consumer expecting file contents.

```ts
// WRONG
expect(existsSync(path)).toBe(true)

// RIGHT
expect(existsSync(path)).toBe(true)
expect(statSync(path).isFile()).toBe(true)
```

### 4. Sweep the whole describe block, not one site at a time

- **Pattern:** When CodeRabbit (or any review) teaches a new value-capture / assertion pattern, audit the WHOLE file for sibling tests that need the same fix — don't fix only the named site.
- **Originating PR:** #123 round 4 (the markPaid explicit-paidAt symmetric case I missed in my own first sweep)
- **Why it matters:** Bot review cost compounds when each round only fixes the named instance. Sweeping siblings together collapses N rounds into 1.
- **Bot-side learning:** ✓ recorded — CodeRabbit now proactively flags ALL similar instances in describe blocks on first pass.

```ts
// When CodeRabbit says "this test asserts call existence not value" for
// `it("defaults pageSize", ...)`, also audit:
//   - sibling tests in the same describe (markPaid explicit-paidAt)
//   - parallel describe blocks (cancelInvoice, issueInvoice guards)
//   - any test using `.toBeUndefined()` / `.toMatchObject({})` shape
// Fix the class in one push, not the instance over N pushes.
```

---

## Category: code-reference-stability

### 5. No hardcoded line numbers in marker comments

- **Pattern:** Marker comments that point to other code MUST use stable symbol references (function names, distinctive code expressions), NOT absolute line numbers.
- **Originating PR:** #120 (the `RBAC-EMISSION SILENT-BY-DESIGN` marker referenced "line 189" which had already drifted to 193+ by PR #117's pino migration)
- **Why it matters:** Any edit to a file shifts line numbers. A "see line 189" comment becomes a "see line 193, but it's actually about the gate now at line 196" wild goose chase within months.

```ts
// WRONG
// The MANAGER block-gate at line 189 is the canonical RBAC site.

// RIGHT
// The MANAGER block-gate above (the `!role || !isManagerOrAbove(role)`
// check that returns 403 before we reach this branch) is the canonical
// RBAC adoption site for this route.
```

### 6. Anchor-scoped windows for file-level assertions

- **Pattern:** Sentinel tests that assert "the marker X appears in file Y" should scope to a ±N-char window around a stable anchor symbol, NOT file-level `toContain`. File-level checks pass even if the marker is moved to an unrelated section of the same file (spoofing).
- **Originating PR:** #120 (`silent-by-design.test.ts`)
- **Why it matters:** A marker like `SENTRY-SILENT-BY-DESIGN` is load-bearing at a specific call site. File-level `toContain` would pass if a future contributor deleted the marker from the actual silent-by-design site and copy-pasted it into an unrelated comment block elsewhere in the file.

```ts
// Extract a ±800-char window around a stable anchor (a function signature,
// distinctive expression, etc.) and assert markers within THAT window:
function localContext(source: string, anchor: string, radius = 800): string {
  const idx = source.indexOf(anchor)
  if (idx < 0) return ""
  return source.slice(Math.max(0, idx - radius), idx + anchor.length + radius)
}
const context = localContext(source, "async getSLABreaches(")
expect(context).toContain("SENTRY-SILENT-BY-DESIGN")
```

### 7. Generalize regex beyond current data shape

- **Pattern:** When writing regexes to parse documents or source text (audit-doc references, link extraction, marker detection), generalize the pattern broadly — don't hardcode current-data-shape prefixes.
- **Originating PR:** #121 (`audit-doc-references.test.ts` — original regex matched only `../../path` but the audit doc had legitimate `../path` links the regex silently ignored)
- **Why it matters:** Documents grow over time. A regex tuned to "the data we have today" silently miscounts as the data evolves.

```ts
// WRONG — only catches `../../` prefix; missed `../runbooks/sentry.md` references
const LINK_TARGETS = Array.from(audit.matchAll(/\]\(\.\.\/\.\.\/([^)]+)\)/g), m => m[1])

// RIGHT — any `./` or `../`-prefixed relative target, plus optional #fragment/title
const LINK_TARGETS = Array.from(audit.matchAll(
  /\[[^\]]+\]\(((?:\.{1,2}\/)[^)#\s]+)(?:#[^) \t]+)?(?:\s+"[^"]*")?\)/g,
), m => m[1])
// And resolve from the document's own directory, not REPO_ROOT
expect(existsSync(resolve(AUDIT_DOC_DIR, target))).toBe(true)
```

---

## Category: type-safety

### 8. Enum exhaustiveness via `satisfies` + `Exclude<>`

- **Pattern:** For TypeScript string-union types (no runtime representation), pin exhaustiveness with `satisfies readonly T[]` + an `Exclude<T, (typeof list)[number]>` extends-never check. Fails at COMPILE time when a new union member is added without an entry. Do NOT derive from `Object.values()` for assertion matrices — that fails silently at runtime if the matrix is wrong-but-non-empty.
- **Originating PR:** #118 (`payment.service.test.ts` PaymentMethod sentinel)
- **Why it matters:** Hardcoded matrices (per project law) for role/permission/status enums need a forcing function that breaks when the enum changes. For string-unions (no runtime), the compile-time `Exclude` check IS that function — no runtime guard exists.

```ts
import type { PaymentMethod } from "../payment.service"

const ALL_METHODS = [
  "CASH", "UPI", "BANK_TRANSFER", "CHEQUE",
  "CARD", "NEFT_RTGS", "WALLET", "OTHER",
] as const satisfies readonly PaymentMethod[]
type _Missing = Exclude<PaymentMethod, (typeof ALL_METHODS)[number]>
const _allCovered: _Missing extends never ? true : never = true
void _allCovered  // reference to silence no-unused-vars; the type-check IS the assertion
```

For runtime enums (e.g., `enum InvoiceStatus`), `Object.values(Enum)` is acceptable as a SECOND sentinel alongside the compile-time check — see `invoice.service.test.ts`'s dual-sentinel for `InvoiceStatus`.

---

## Category: abstraction-timing

### 9. Abstract on second use, not first

- **Pattern:** Extract a shared helper / factory / wrapper on the SECOND call site, not the first. The first call site proves the pattern's shape; the second site triggers extraction because (a) duplication is now real and (b) the extracted API can be designed against two known use cases instead of one hypothetical.
- **Originating PR:** #123 (the `makeDb` extraction landed in commit 1 of #123 because `invoice.service.test.ts` was the second consumer of payment.service.test.ts's inline pattern; CodeRabbit's nitpick proposing `makeBuilderSpy` extraction was DECLINED with this exact rationale)
- **Why it matters:** Pre-abstracting on one use case bakes in assumptions that the second use case will inevitably violate, forcing a rewrite OR an awkward generic. Waiting for the second use means the abstraction is constraint-driven, not speculative.
- **Bot-side learning:** ✓ recorded — CodeRabbit will NOT re-flag the `makeBuilderSpy` duplication at the next service-test PR until shipment.service.ts adds a SECOND consumer.

```ts
// Move from inline → shared helper when the SECOND consumer appears.
// For makeDb specifically: extraction was triggered by invoice.service.test.ts
// needing the same shape that was inline in payment.service.test.ts (PR #118).
//
// The followon makeBuilderSpy extraction is deferred to:
//   shipment.service.test.ts (next session) — the SECOND consumer of
//   invoice.service.test.ts's inline mockImplementation pattern.
```

---

## Categorical summary

| Category | Entries | Failure shape prevented |
|---|---|---|
| test-assertion-strength | 4 | Tests pass on broken value contracts, missing guards, silently dropped predicates |
| code-reference-stability | 3 | Comments and tests rot when source-file line numbers / paths / regex inputs change |
| type-safety | 1 | Enum drift goes uncaught at compile time |
| abstraction-timing | 1 | Premature abstractions force rewrites on second use |

**Total: 9 entries** across 2 days of bot review. Each prevents a specific bug shape with a specific code-or-test pattern. Five entries are now permanent learnings in CodeRabbit's memory for this repo — future PRs inherit the catalog as automatic review checks.

---

## Maintenance

When a NEW pattern emerges from a future CodeRabbit finding:
1. Add an entry here following the same shape (Pattern / Category / Originating PR / Why / Example / Bot-side learning).
2. If the failure shape doesn't fit any existing category, add a new category in `## Categorical summary` and re-section the file accordingly.
3. Reference the originating PR — never paraphrase the finding from memory; future readers need to be able to read the actual review thread.
4. Update AGENTS.md § 0 if the new pattern requires per-task agent-side discipline (most entries don't — they're test-pattern rules that the agent applies when writing tests).
