# Decision: whatsapp_sends delivery-tracking mechanism (PHASE-0)

**Date:** 2026-05-17
**Author:** Claude Code (Opus 4.7) in PM-mode + Senior FSE + Big-Tech CTO + Designer
**Status:** ACCEPTED — implemented in PR feat/whatsapp-sends-102
**Scope:** the table that records every WhatsApp delivery attempt, its RLS, the
service-layer wiring, the retry-path scope, and the PII posture.
**Supersedes / cross-refs:**
- `docs/decisions/2026-05-16-audit-logs-mechanism.md` — the audit_logs PHASE-0
  decision; structural template, but with one critical contract inversion
  (see § D and § E below — sends are NOT destructive ops and the wrapper does
  NOT block on tracker failure).
- `docs/audits/2026-05-16-102-revalidation.md § 6 + § 8` — risk ranking that
  named this task as the lead.
- `docs/NEXT-SESSION-HANDOFF.md § 6 Option A` — pre-suggested PHASE-0 fork
  (extend `DESTRUCTIVE_OP_REGISTRY` vs introduce a parallel registry vs neither).
  This decision answers: **neither** — see § D.

---

## 0. TL;DR

| Question | Decision | One-line reason |
|---|---|---|
| **A. Row model** | **Append-only-per-attempt.** Every send attempt = one immutable row. Retry = new row. Forensic history preserved. | An audit table whose purpose is failure observability MUST preserve the history a retry would otherwise erase. |
| **B. Retry-path scope** | **Manual service-layer method only.** `retryWhatsappSend(send_id)` re-invokes the existing send path and writes a NEW attempt row. No operator UI built. No automation built. | The codebase has no job-runner infrastructure; automation is a multi-session build. #102 says "retry path," not "retry system." |
| **C. PII handling** | **Store `raw_response` verbatim (truncated to 2 KB, JSONB).** Store `phone` (E.164, unredacted). SELECT scope restricted to `SUPER_ADMIN / ADMIN / MANAGER` — exactly mirroring `audit_logs`'s tightest read scope. | Debugging a silent delivery failure requires the actual response body. The tight role scope IS the PII safeguard. |
| **D. Write location** | **Service-layer factory wrapper (`createTrackedWhatsAppService(db, config)`)** that wraps `createWhatsAppService(config)`. **`whatsapp_sends` does NOT use `withAudit`, the DESTRUCTIVE_OP_REGISTRY, or any other `audit_logs` machinery.** A WhatsApp send is not a destructive op; force-fitting the destructive-op registry would corrupt that registry's meaning. | The destructive-op registry exists for ops with "no audit = no destruction" semantics. WhatsApp sends are forward-only attempt-records; they need their own primitive. |
| **E. Transactionality** | **Queued-row-first, NEVER-blocking.** Write a `status='queued'` row BEFORE the API call. Update with the outcome AFTER. If the queued-row INSERT fails: log + Sentry-tag, then PROCEED with the send anyway. If the result UPDATE fails: log + Sentry-tag; the orphan `queued` row IS the observability signal. | A successful send with no tracking row is an observability hole. Blocking sends on tracker DB failure is worse — it converts an observability outage into a delivery outage. This is the load-bearing inversion vs. `withAudit`. |

The five decisions are interlocking. Changing A (e.g., to one-row-per-send with
mutating status) forces UPDATE-policy RLS + collapses retry-as-new-row into
retry-as-status-mutation + loses the immutable-history property. Changing B
(adding automation) forces a job-runner dependency that isn't budgeted and a
PR scope that exceeds 1500 LoC. Changing C (redacting `raw_response`) makes
the table useless for the silent-rejection debugging case (`message_wamid:
null`) that motivated it. Changing D (force-fitting `withAudit`) corrupts the
destructive-op-registry sentinel by adding an entry that the sentinel can't
verify (`withAudit` enforces audit-first/no-op-on-audit-fail; the wrapper
here enforces neither). Changing E (block-on-tracker-fail) is the failure
mode the previous handoff's discipline explicitly warns about
(`packages/services/src/shared/with-audit.ts § Why audit-first vs op-first` —
which applies to destructive ops, NOT delivery tracking).

---

## A. ROW MODEL — append-only-per-attempt

### Decision

Each call to `sendMessage` or `sendTemplate` inserts exactly one row into
`whatsapp_sends`. That row's status begins as `queued` and is **never
mutated** after the result lands — instead, on result, we **UPDATE the same
row's `status`/`wamid`/`raw_response`/`completed_at`** atomically as the
ONLY mutation. A retry of a previously-failed send inserts a NEW row with a
new `id` and `attempt_no = previous + 1`, linked to the original via
`original_send_id` (self-FK, nullable).

**Re-statement to remove ambiguity:** Each ATTEMPT is its own row. The
**within-attempt** lifecycle is `queued` → `sent | failed` (one UPDATE).
There is no `queued → sent → delivered` mutation chain — `delivered` would
require webhook callbacks that don't exist today (out of scope; if added
later, `delivered` becomes a separate row written by the webhook handler
linked via `wamid`). The **across-attempt** lifecycle is a chain of rows
linked by `original_send_id` and ordered by `attempt_no`.

### Schema implication

```sql
create table public.whatsapp_sends (
  id                uuid primary key default gen_random_uuid(),
  invoice_id        uuid references public.invoices(id) on delete set null,
  original_send_id  uuid references public.whatsapp_sends(id) on delete set null,
  attempt_no        integer not null default 1 check (attempt_no >= 1),
  phone             text not null,             -- E.164 (normalizePhone output)
  endpoint          text not null check (endpoint in ('sendmessage','sendtemplatemessage')),
  template_name     text,                       -- non-null iff endpoint='sendtemplatemessage'
  wamid             text,                       -- nullable: queued / failed sends have no WAMID
  status            text not null default 'queued'
                    check (status in ('queued','sent','failed')),
  raw_response      jsonb,                      -- truncated to 2 KB by the wrapper before write
  error_message     text,                       -- nullable: the WhatsAppResult.error string when status='failed'
  user_id           uuid references auth.users(id) on delete set null,
  queued_at         timestamptz not null default now(),
  completed_at      timestamptz                  -- set on the UPDATE that lands status='sent'|'failed'
);
```

### RLS implication (anticipates § C role rationale)

```sql
alter table public.whatsapp_sends enable row level security;

-- INSERT: anyone authenticated who could plausibly send (invoice path)
create policy whatsapp_sends_insert_finance on public.whatsapp_sends
  for insert with check (
    auth.uid() is not null
    and get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','INVOICE','FINANCE_STAFF'])
  );

-- UPDATE: SAME role scope; load-bearing for the queued -> sent|failed transition
--         AND for the retry attempt-no chain UPDATE if a writer changes original_send_id linkage.
--         The CHECK constraints + the application-layer never-update-after-completion
--         discipline are what enforce immutability of completed rows.
create policy whatsapp_sends_update_finance on public.whatsapp_sends
  for update using (
    auth.uid() is not null
    and get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','INVOICE','FINANCE_STAFF'])
  );

-- SELECT: tighter — phone + raw_response are PII; mirrors audit_logs.
create policy whatsapp_sends_select_admin on public.whatsapp_sends
  for select using (
    auth.uid() is not null
    and get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER'])
  );

-- DELETE: none. A delivery audit row is not deletable.
```

### Why not "one row per send with mutating status (queued→sent→delivered→failed)"?

| Property | Append-only-per-attempt (chosen) | One-row-per-send with mutating status (rejected) |
|---|---|---|
| Retry history | Preserved — every attempt is a row | Lost — UPDATE overwrites the prior outcome |
| Forensic reconstruction "what did attempt 1's raw_response look like vs attempt 3?" | Trivial: read all rows where `original_send_id = X` | Impossible — overwritten |
| Tamper-evidence | Each completed row is application-immutable (UPDATE is gated by application-side guard + the absence of any code path that touches completed rows) | Mutation is the whole API — completed-row-immutability is not a property of the model |
| RLS UPDATE policy | Required (for `queued → sent\|failed`); but the surface area is narrow | Required AND broad — every status transition is an UPDATE |
| Schema simplicity | +1 column (`original_send_id`), +1 column (`attempt_no`) | None — but loses information |
| Retry implementation | "Insert a new row" — single statement; no UPDATE | "UPDATE existing row" — but then a retry-of-a-retry needs an attempt counter anyway; the savings collapse |
| Fit with `audit_logs` philosophical lineage | Same family (append-only, forensic, no DELETE) | Different family (mutable record) |

The "lose attempt history" cost is the disqualifier. The reason `whatsapp_sends`
exists is the silent-failure debugging case — and silent failures recur.
Recording attempt N+1 without seeing what attempt N looked like makes the
table half-useful at exactly the moment it matters.

### What "append-only" really means here (precision)

It is not append-only at the DB-row level: each row receives ONE UPDATE (the
`queued → sent|failed` transition). True DB-level append-only would force a
two-row model (one row at queue time, a second row at completion time), which
doubles row count and complicates the wamid-linkage. The compromise:

- **Application-level append-only across attempts.** A retry NEVER overwrites
  prior attempts — it inserts a new row.
- **Application-level mutation within an attempt.** The `queued → sent|failed`
  UPDATE is the only mutation, gated by the wrapper's own code (no other code
  path writes to `whatsapp_sends`), and the table CHECK constraint on `status`
  prevents free-form mutation outside the three allowed values.

A future sentinel could verify "no UPDATE outside `whatsapp.service.ts` /
the tracked wrapper" the same way `audit-logs-no-update-delete.test.ts`
verifies the no-UPDATE invariant for `audit_logs`. That sentinel is OUT OF
SCOPE for this PR — filed as a follow-up if maintenance experience proves
it needed.

---

## B. RETRY-PATH SCOPE — manual service-layer method only

### Decision

Ship `retryWhatsappSend(originalSendId: string)` on the wrapper service. The
method:

1. Reads the original row from `whatsapp_sends`.
2. If the row is missing OR `status !== 'failed'`, returns an error (you
   don't retry a `queued` send — that's stuck; you don't retry a `sent` send
   — that succeeded).
3. Re-invokes the same endpoint with the same payload (reconstructed from
   the original row's persisted fields: `phone`, `endpoint`, plus the
   payload that the route should re-pass via the retry caller).
4. Writes a NEW row with `original_send_id = originalSendId` and
   `attempt_no = previous.attempt_no + 1`.

### What is OUT OF SCOPE (and where deferred)

| Item | Reason | Where filed |
|---|---|---|
| **Operator-facing retry UI** (a button on the invoice detail or a `/ops-console/whatsapp/failed` dashboard) | The retry capability is service-layer; the UI is a separate concern with its own design (which view? which permission gate? what optimistic state? which toast?). | Follow-up issue filed this PR — title: "Operator retry UI for failed WhatsApp sends" — `do not bundle` marker. |
| **Automated background retry job** (cron / queue / polling worker) | No job-runner infrastructure exists in the codebase. Adding one is a multi-session build (worker process, scheduling, deduplication, exponential backoff, observability). Out of scope per the brief's anti-pattern list. | Follow-up issue filed this PR — title: "Automated retry job for failed WhatsApp sends" — `do not bundle` marker. |
| **Webhook callbacks for delivery confirmation** (`delivered`, `read`, `failed_post_delivery` from Meta) | Requires public webhook endpoint, signature verification, replay protection. Adds a `delivered` status. Distinct surface from the retry path. | Filed as a separate follow-up; not blocking. |
| **Retry payload-replay schema** (the message/template content needed to retry — currently we'd need the caller to re-pass it) | The minimal retry signature this PR ships requires the caller (route or UI) to know the original payload. A fully self-contained `retryWhatsappSend(id)` that reads the original payload from the table would require either (a) persisting the entire request payload to `whatsapp_sends` (PII concern — message text can contain financial details) or (b) reconstructing from `invoice_id` (couples the retry path to invoice service shape). | Deferred. The retry method takes a `replayPayload` arg from the caller; the route is the orchestrator. |

### Why not automated?

The brief is explicit: *"If the codebase has no job-runner infrastructure,
automated retry is a multi-session build — do NOT build it."* Confirmed: no
job-runner exists (`grep -rn "queue\|cron\|worker\|bullmq\|inngest" packages/`
returns nothing relevant). The minimum viable automation = a Vercel Cron
endpoint + a poll-and-retry handler + idempotency keys + a "stop retrying
after N attempts" policy. That is its own PR.

---

## C. PII HANDLING — store verbatim, tight SELECT scope

### Decision

| Column | Stored as | PII class | Read scope |
|---|---|---|---|
| `phone` | E.164 digits (output of `normalizePhone`) | PII (subscriber identifier) | `SUPER_ADMIN / ADMIN / MANAGER` |
| `raw_response` | Verbatim WPBox response body, JSONB, **truncated to 2 KB** by the wrapper before INSERT | Potentially PII — WPBox echoes back partial message content + recipient identifiers in some error shapes | Same as above |
| `error_message` | The `WhatsAppResult.error` string | Generally non-PII (operational message), but may contain a partial body fragment in failure cases | Same as above |
| `template_name` | Plain text (the template ID like `invoice_notification_v2`) | Non-PII | Same as above |
| `invoice_id` | UUID | Non-PII but business-sensitive | Same as above |
| `wamid` | WhatsApp message identifier | Non-PII (opaque identifier) | Same as above |
| `user_id` | UUID of the operator | Non-PII; useful for forensic chain | Same as above |

### Why store `raw_response` verbatim (truncated)?

The motivating debugging case is **silent rejection**: WPBox returns `HTTP
200 + { status: "success", message_id: N, message_wamid: null }`. Without
the raw body, the operator can't distinguish "template requires HEADER but
we sent BODY only" from "recipient blocked us" from "template not approved"
— all surface the same `message_wamid: null`. The raw body has the
distinguishing fields.

Redacting `raw_response` would push the debugging burden onto a future
"parse this specific shape and store only these fields" decision tree — and
the WPBox API evolves; the redaction would silently drop new fields. Verbatim
storage + tight read scope is the right tradeoff.

### Why 2 KB truncation?

WPBox response bodies are normally under 1 KB. A 2 KB cap leaves headroom
for the largest realistic error envelope while preventing accidental
mega-payloads (e.g., a future API change that echoes the entire template
back). The wrapper truncates at the application layer before INSERT — the
DB column itself is `jsonb` with no length cap; the truncation is policy,
not schema. Recorded here so a future maintainer doesn't "fix" the
truncation thinking it's a bug.

The truncation strategy: if the raw body parses as JSON, store the parsed
object as-is (JSONB internalizes efficiently; size cap applied to the
serialized form). If it doesn't parse or exceeds 2 KB serialized, store
`{ truncated: true, head: <first 1900 chars of the text body> }`. Either
way the column always has a structured shape that a SELECT can inspect.

### Why the SELECT scope is `SUPER_ADMIN / ADMIN / MANAGER` (not `INVOICE / FINANCE_STAFF`)?

INSERT scope includes the operators who actually send (`INVOICE`,
`FINANCE_STAFF`) so they can write their own tracking rows. SELECT is
tighter — only the roles who would investigate a delivery problem
(`MANAGER` and above) need to read another operator's send history. This
mirrors `audit_logs` exactly, which is the right precedent (an
audit/forensic table; operators don't grep each other's audit trails).

If a use case emerges where, say, a `FINANCE_STAFF` operator needs to see
the status of their own sends (likely true for a future UI), the right
pattern is **a SECURITY DEFINER RPC** that filters to `user_id = auth.uid()`,
not a relaxation of the SELECT policy. That RPC can be added when the UI is
built (see § B's deferred UI follow-up).

---

## D. WRITE LOCATION — service-layer factory wrapper, NOT `withAudit`

### Decision

Introduce `createTrackedWhatsAppService(db, config)` in
`packages/services/src/whatsapp-tracked.service.ts`. The wrapper:

1. Takes a Supabase client + the existing `WhatsAppConfig`.
2. Internally constructs `createWhatsAppService(config)`.
3. Exposes the same `WhatsAppService` interface, plus a new
   `retryWhatsappSend(id, replayPayload)` method.
4. The wrapper's `sendMessage` and `sendTemplate` write tracking rows
   per the § E transactionality contract; `makeContact`, `getContact`,
   `getTemplates` pass through unchanged (not sends).

### Why a wrapper service, not `withAudit`?

`withAudit` is shaped for **destructive ops** with the "no audit = no
destruction" contract:

1. Caller fetches `beforeState`.
2. `withAudit` INSERTs the audit row.
3. **If INSERT fails: THROW. Destructive op NEVER runs.**
4. Op runs; failure preserves the audit row as forensic "attempt".

For a WhatsApp send, every step of that contract is wrong:

1. There is no `beforeState` — a send is not a mutation of a record.
2. The tracker INSERT failing must NOT block the send (per § E — the
   business cost of a tracker outage stopping all WhatsApp sends is worse
   than the cost of missing some observability).
3. The op-runs-after-tracker-write ordering is reasonable for the
   tracker, but the failure-mode handling is inverted.

Adding `whatsapp_send` to `DESTRUCTIVE_OP_REGISTRY` would corrupt the
registry's meaning — a send is not destructive — and the sentinel test
(`destructive-op-registry-coverage.test.ts`) would have to be relaxed to
accept "this entry doesn't use `withAudit`", which would defeat the
sentinel's purpose for the ACTUAL destructive ops it polices.

A separate primitive is the right call. The wrapper IS the primitive; the
audit table IS the registry of attempts.

### Why a factory wrapper and not a per-method static helper?

A `trackSend(db, ...args, () => svc.sendMessage(...))` per-call-site pattern
would:

1. Push the tracking-vs-not decision to every caller (today: one call
   site; tomorrow: any new caller).
2. Make it easy to forget — the LAW 6/7 violation pattern is "the call
   site decided not to wrap it."
3. Couple every caller to both the underlying `WhatsAppService` AND the
   tracking helper.

A factory wrapper:

1. Makes tracking the default (the consumer asks for the tracked
   service; non-tracked is the explicit choice).
2. Centralizes the truncation/snapshot logic.
3. Makes future migration to a different storage backend (or to a queued
   job-runner) a one-file change.

The one consumer today is `apps/dashboard/app/api/whatsapp/send-invoice/route.ts`;
the route swaps `createWhatsAppServiceFromEnv()` →
`createTrackedWhatsAppServiceFromEnv(db)` and gets tracking for free.

### Architecture flow check

```
UI (operator clicks "Send")
  → apps/dashboard/.../send-invoice/route.ts
    → packages/services/whatsapp-tracked.service.ts (NEW — this PR)
      → packages/services/whatsapp.service.ts (HTTP, unchanged)
      → packages/database (via the supplied SupabaseClient — tracking INSERT/UPDATE)
        → public.whatsapp_sends (NEW table)
```

LAW 6/7/8 respected: business logic in services; no Supabase in the route
handler beyond the existing auth/client-acquisition pattern; the wrapper IS
the service layer for tracked sends.

---

## E. TRANSACTIONALITY — queued-row-first, NEVER blocking

### Decision

Per `sendMessage` / `sendTemplate` call inside the tracked wrapper:

```
1. Build the queued-row payload from input (invoice_id, phone, endpoint,
   template_name?, user_id?, attempt_no=1, original_send_id=null).
2. INSERT the queued row.
   IF the INSERT errors:
     console.error + emitTaggedException with deterministic tags
       (whatsapp_send.tracking_failed=true; whatsapp_send.phase=queued_insert)
     fall through to step 3 — tracker outage MUST NOT block the send.
3. Invoke the underlying service: result = svc.sendMessage(...) /
   sendTemplate(...).
   (Whatever the result — ok/error/network-throw — we end up at step 4.)
4. IF the queued INSERT succeeded at step 2:
     UPDATE the row with the result:
       status = result.ok ? 'sent' : 'failed'
       wamid  = result.ok ? extractWamid(result.data) : null
       raw_response = truncateResponse(result.ok ? result.data : { error: result.error, rawResponse: result.rawResponse })
       error_message = result.ok ? null : result.error
       completed_at = now()
     IF the UPDATE errors:
       console.error + emitTaggedException (whatsapp_send.tracking_failed=true;
       phase=result_update); the orphan queued row IS the observability signal.
5. Return the result to the caller (the underlying service's result is
   passed through verbatim — the wrapper is purely additive).
```

### Why this ordering

| Failure mode | Without queued-row-first | With queued-row-first (chosen) |
|---|---|---|
| Send succeeds, tracker UPDATE fails | Untracked send (silent observability hole) | Orphan `queued` row in the DB — operator queries `WHERE status='queued' AND queued_at < now() - 5m` and sees the gap |
| Send crashes mid-flight (process killed; fetch throws) | Untracked attempt (worst case) | Orphan `queued` row that NEVER completed — same query catches it |
| Tracker INSERT fails, send succeeds | No row at all; send happened invisibly | No row; but Sentry tag fired so we know the tracker failed, and the send went through (correct trade-off — see "Why never-blocking" below) |
| Tracker INSERT fails, send fails | No row, no send, no record | Sentry tag for the tracker failure, plus the route handler's normal error response for the send failure |

The queued-row-first pattern converts the worst case (untracked send) into
the second-worst case (orphan `queued` row that's observable). The orphan
becomes the alert signal.

### Why NEVER blocking on tracker failure

This is the load-bearing inversion vs `withAudit`. The `withAudit` contract
("no audit = no destruction") is correct for destructive ops because:

- Destruction is reversal-impossible without audit.
- Blocking destruction on audit-DB outage trades a high-cost data-loss event
  for a high-availability cost — defensible trade.

For WhatsApp sends:

- A send is forward-only — once sent, the consequence (a notification
  delivered to a customer) is irreversible.
- Blocking sends on tracker-DB outage trades an observability gap for a
  delivery outage — and delivery outages affect customers (missed invoice
  notifications), while observability gaps affect internal forensics.
- The orphan-`queued`-row pattern is a strict improvement over "block the
  send" — both record the failure, but only one preserves business
  continuity.

The PR body's RLS rationale will state explicitly: this is a delivery
tracker, not a destructive-op auditor. The tracker is best-effort; the
send is the source of truth.

### Sentry posture

The wrapper emits Sentry-tagged exceptions via the existing
`emitTaggedException` helper on either tracker-write failure. The tag
contract:

```ts
export const WHATSAPP_SEND_TAG_KEYS = {
  trackingFailed: "whatsapp_send.tracking_failed",
  phase:          "whatsapp_send.phase",          // 'queued_insert' | 'result_update'
  endpoint:       "whatsapp_send.endpoint",       // 'sendmessage' | 'sendtemplatemessage'
  hasInvoiceId:   "whatsapp_send.has_invoice_id", // 'true' | 'false'
} as const
```

No PII goes through Sentry. `phone`, `raw_response`, `wamid`, `error_message`
are deterministically NOT tagged — same posture as `withAudit`'s PII-free
tag set.

---

## PHASE-A AUDIT — send-path × tracking-write × failure-mode

The wrapper governs every send. The matrix is small because there are
exactly TWO send methods on the underlying service, and the wrapper applies
the same transactionality contract to both.

| # | Send method | Outcome shape | Tracker INSERT (queued row) | Underlying API call | Tracker UPDATE (completion) | End row state | Operator-visible result |
|---|---|---|---|---|---|---|---|
| 1 | `sendMessage` | API 200 + valid WAMID | OK | OK (result.ok=true) | UPDATE `status='sent', wamid=<wamid>, completed_at=now()` | sent | result.ok=true |
| 2 | `sendMessage` | API 200 + `message_wamid: null` (silent rejection) | OK | OK (result.ok=false per WAMID-null guard in postSmart) | UPDATE `status='failed', error_message=<…>, raw_response=<…>, completed_at=now()` | failed | result.ok=false (operator sees error) |
| 3 | `sendMessage` | API 4xx | OK | OK (result.ok=false) | UPDATE `status='failed', error_message=<…>, raw_response=<truncated>, completed_at=now()` | failed | result.ok=false |
| 4 | `sendMessage` | API 5xx | OK | OK (result.ok=false) | UPDATE `status='failed', error_message=<…>, completed_at=now()` | failed | result.ok=false |
| 5 | `sendMessage` | fetch throws (network error) | OK | result.ok=false (network message) | UPDATE `status='failed', error_message='Network error: …', completed_at=now()` | failed | result.ok=false |
| 6 | `sendMessage` | Tracker INSERT fails, then API call succeeds | FAIL (Sentry-tagged; phase=queued_insert) | OK (result.ok=true) | SKIPPED (no row to update) | NO ROW | result.ok=true — send went through |
| 7 | `sendMessage` | Tracker INSERT OK, then result UPDATE fails | OK | OK (any outcome) | FAIL (Sentry-tagged; phase=result_update) | orphan `queued` (observability signal) | result passed through |
| 8 | `sendMessage` | Tracker INSERT OK, API call throws synchronously after queue | OK | THROW | UPDATE `status='failed', error_message='Unexpected throw: …'` | failed | exception re-thrown to caller |
| 9 | `sendTemplate` | All shapes 1-8 above | identical contract, `endpoint='sendtemplatemessage'`, `template_name=<input.templateName>` | — | — | — | — |
| 10 | `retryWhatsappSend` | retries an attempt-N=failed → attempt-N+1=sent | INSERT new row `attempt_no=N+1, original_send_id=<orig.id>` | OK / failure same as 1-5 | UPDATE per outcome | — | new attempt result returned |
| 11 | `retryWhatsappSend` | original is `sent` or `queued` (precondition fail) | NO INSERT (refused before any side effect) | NOT INVOKED | NOT INVOKED | unchanged | error: precondition |
| 12 | `retryWhatsappSend` | original is missing | NO INSERT | NOT INVOKED | NOT INVOKED | — | error: not found |

### Test coverage map (informs test-floor extension count)

Each row above → at least one test case. Total: 12+ cases (some rows split
into "with invoice_id" vs "without invoice_id"; `sendTemplate` doubles
rows 1-8). Estimated case count: **22-28 new cases** on top of the existing
47 in `whatsapp.service.test.ts`. New file:
`packages/services/src/__tests__/whatsapp-tracked.service.test.ts`. The
existing `whatsapp.service.test.ts` is NOT modified (the underlying service
is unchanged — only the wrapper is new).

---

## What this decision intentionally does NOT cover

| Out of scope | Why | Where it lives |
|---|---|---|
| `delivered` webhook callbacks | Requires a public webhook endpoint with HMAC verification; separate surface | Filed as a follow-up |
| Operator retry UI | The retry path is service-layer; UI is its own design + permission story | Follow-up issue |
| Automated background retry | No job-runner infrastructure; multi-session build | Follow-up issue |
| `#139` WAMID-null redundant fallback in `postSmart` | Tracked bug in underlying `whatsapp.service.ts`; not a tracker concern; do not touch | Existing issue |
| `#140` BASE-URL empty-string fallback | Same | Existing issue + bug-doc test |
| Cross-package sentinel "no UPDATE outside the wrapper for whatsapp_sends" | Maintenance discipline; not load-bearing for V1 | Follow-up if needed |
| Migration of the `apps/dashboard/app/api/whatsapp/test/route.ts` debug endpoint to use the wrapper | Debug-only; not financially-load-bearing | Out of scope |

---

## Cross-references

- AGENTS.md § 0 — skill resolver + four-step gate
- `packages/services/src/shared/with-audit.ts` — the contract this decision diverges from (intentionally) for non-destructive tracking
- `packages/services/src/shared/destructive-op-registry.ts` — the registry this decision DOES NOT extend
- `supabase/migrations/20260515000001_baseline_from_production.sql § audit_logs` — the RLS shape this decision mirrors for SELECT scoping
- `docs/audits/2026-05-16-102-revalidation.md § 6 + § 8` — the risk rank that named this task
- `docs/patterns/coderabbit-catalog.md` — 9 entries; preempted for the test extension
