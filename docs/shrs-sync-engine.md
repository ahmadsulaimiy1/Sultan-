# The SHRS Outbound Sync Engine — Phase 4

**Status:** built, adversarially tested in a real browser, 31/31 checks passing.
**Date:** 9 August 2026
**Files:** `js/shrs-sync-engine.js`, `js/shrs-local-store.js` (queue additions),
`functions/api/portal/adhkar.js`, `scripts/test-sync-engine.mjs`.

Phase 3 made the application usable with no signal. Phase 4 is what happens to
something a person **did** while it was gone.

This is the most conservative component in the estate, deliberately. The
failure modes here are not cosmetic: a duplicated institutional write, a
silently overwritten record, or a queued action that quietly vanishes are each
worse than the action simply not having been possible offline.

---

## 1. Four rules

**1. Nothing is queued that was not declared.**
An operation must appear in `OPERATIONS` with its endpoint, its kind, and its
conflict rule written down. An undeclared type is refused at the door. This is
what stops the outbound queue from quietly becoming a generic remote-write
channel — the single most dangerous thing an offline layer can turn into.

**2. Every delivery is idempotent.**
Each operation carries a stable `operationId`, sent as `Idempotency-Key` on
every attempt including retries. A registry entry may only be marked
`replaySafe` when the server genuinely makes it so, with the reason recorded —
for `adhkar.complete` that is a real `UNIQUE (guardian_id, period,
completion_date)` with `ON CONFLICT DO NOTHING`, not an assumption.

**3. The server wins, and the person is told.**
There is no last-writer-wins anywhere in this engine. A `409` is a **terminal**
state: the operation stops, what the person typed is kept, the server's version
is recorded beside it, and a human decides. The engine never settles an
institutional disagreement by itself.

**4. Nothing is ever silently dropped.**
Every operation ends as `synced`, `conflict`, or `failed`, and the last two are
surfaced. The only path by which an undelivered operation leaves the queue is
an explicit human discard.

## 2. What it refuses

| Attempt | Result |
|---|---|
| An operation not in the registry | `operation-not-declared` |
| `certificate.issue`, `payment.record`, `user.role.change`, … | `requires-live-connection` — the Phase 1 never-queued list |
| An **edit** with no base version | `edit-requires-base-version` |

The third refusal matters most. An edit queued without the `updated_at` the
device saw cannot be checked against the server's current version — and a write
that cannot be checked is a write that can silently destroy someone else's.

## 3. Failure taxonomy

The engine distinguishes four things that look alike from the outside:

| Response | Meaning | What happens |
|---|---|---|
| 2xx | Accepted | `synced` |
| **409** | The record moved | `conflict` — terminal, never retried, handed to a human |
| **4xx** (other) | The server understood and refused | `failed` — terminal and surfaced. A malformed operation never becomes valid by being sent again |
| **401 / 403** | Not authorised | The whole run **stops**. Every remaining operation would fail identically, so their retry budgets are not burned |
| **5xx / no response** | Transient | back to `pending`, one attempt consumed, retried under `SYNC.retryBackoffMs` (30s → 2m → 8m → 30m, four attempts) |

Retries are bounded. Exhaustion is a **visible failure**, not a silent one.

## 4. The revocation gate

Before a single byte moves in either direction, the device asks who it is
(`REVOCATION.checkTrustVersionBeforeSync`). A rejected session or a changed
`trust_version` purges everything on the device **before** any queued write is
delivered — an operation queued under an authorisation that has since been
withdrawn must not be carried out.

It fails **closed** on a definite rejection and **open on nothing**: a probe
that cannot be reached is not a rejection, and does not purge. Losing a signal
is not the same as losing authorisation, and treating them alike would wipe a
working device every time a train entered a tunnel. Both behaviours are
asserted in the test.

`trustVersion` is acted on only when the server actually sends it. Inventing or
assuming a value would either purge working devices or pretend a check happened
that did not.

## 5. Ordering

Deliveries are **sequential, in creation order**. If a person edited the same
record twice offline, the second edit must land on top of the first, and
parallel delivery cannot promise that.

## 6. One real server change

`functions/api/portal/adhkar.js` now accepts an optional `completionDate`.

A completion queued on a phone with no signal belongs to the day it happened,
not the day the signal returned — without this, every offline completion would
silently move to the reconnection date and a person's streak would be a fiction.

The window is bounded on purpose: never the future, never further back than the
seven days the offline store keeps a record for. Outside that, the server's own
date stands, because an unbounded client-supplied date is a way to fabricate a
streak.

## 7. What only a human may do

- `discard(operationId)` — the only route out of the queue for an undelivered
  operation.
- `resubmit(operationId, baseUpdatedAt)` — re-submits a conflicted edit on top
  of the server's current version. Deliberately **not** a "force": the caller
  must supply the base version they have now looked at, which means someone has
  seen what the server says before overwriting it.

## 8. The acceptance run

`npm run test:sync` — real Chromium, real IndexedDB, real WebCrypto, and a
scriptable HTTP server that genuinely answers 409, genuinely returns 500, and
genuinely destroys the socket mid-request. **31/31.**

Covered: the three refusals · queue offline, deliver on reconnection · delivery
order · the correct date carried · stable idempotency keys · a connection lost
mid-delivery · a retry producing exactly one row · 409 → conflict, both versions
kept, never retried · 4xx terminal · 5xx transient · the backoff window honoured
· retries bounded and exhaustion visible · an authorisation failure halting the
run without burning the queue's budget · probe unreachable **not** purging ·
trust-version change purging before anything is sent · rejected session purging
· human discard · and a closing accounting that every held operation is in a
state a person can be shown.

### What the run taught, honestly

**A destroyed socket can be re-driven by the browser itself.** In the
connection-lost test the server was spoken to five times for one operation.
That number is genuinely outside the engine's control — which is exactly why
rule 2 exists. What the engine controls, and what makes it harmless, is that
all five carried the same key and the server recorded **one** row. The
assertion was corrected from "exactly two deliveries" to "one key, one row",
because the first version was asserting something that was never the engine's
to promise.

**The harness's first version failed three checks for a reason that was not the
engine's.** An "edit without base version" case was written against an
*additive* operation, so it queued legitimately and skewed every count after
it. Blocks that count deliveries exactly now clear the queue first. Recorded
here because a test that fails for the wrong reason is more dangerous than one
that fails for the right one — it invites a fix to code that was correct.

## 9. Scope, stated plainly

One operation is registered today: `adhkar.complete`. That is not the engine
being unfinished — it is rule 1 working. Each additional operation needs its
endpoint's replay behaviour and conflict semantics established before it is
declared, and that is a per-endpoint piece of work, not a switch. The engine,
the refusals, the failure taxonomy, the revocation gate and the conflict rules
are complete and tested; the registry grows one verified entry at a time.

`start()` is exported but not yet called from a page. Wiring it into the portal
shell is a Phase 5 step, once there is a surface that shows a person their
pending, conflicted and failed operations — an engine that queues work with
nowhere to display it would breach rule 4 in spirit while honouring it in code.

## 10. Standing constraints honoured

- No certificate operation can be queued at all.
- No cryptographic secret is present in any client file.
- Nothing fails open: a rejection purges, an unreachable probe does not.
- No institutional record is overwritten by an offline edit without a human.
- Every queued payload is sealed at rest by the Phase 1 store.
