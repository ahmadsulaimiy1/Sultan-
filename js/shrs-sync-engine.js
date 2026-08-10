/* Sultan Hanafi Royal Schools — the outbound sync engine.
 *
 * Phase 2 made the application readable offline. This is the other half: what
 * happens to something a person DID offline. It is deliberately the most
 * conservative component in the estate, because the failure modes here are not
 * cosmetic — a duplicated institutional write, a silently overwritten record,
 * or a queued action that vanishes are all worse than the action simply not
 * being possible offline.
 *
 * Four rules govern it.
 *
 *   1. NOTHING IS QUEUED THAT WAS NOT DECLARED. An operation must appear in
 *      OPERATIONS below, with its endpoint, its kind, and its conflict rule
 *      written down. An undeclared type is refused at the door. This is what
 *      stops the queue from quietly becoming a generic remote-write channel.
 *
 *   2. EVERY DELIVERY IS IDEMPOTENT. Each operation carries a stable
 *      operationId, sent as Idempotency-Key. A registry entry may only be
 *      marked replay-safe when the server genuinely makes it so — for
 *      adhkar.complete that is a real unique constraint in the database, not
 *      an assumption. A retry after a timeout must never produce a second row.
 *
 *   3. THE SERVER WINS, AND THE PERSON IS TOLD. There is no last-writer-wins
 *      anywhere in here. A conflict is a terminal state that stops the
 *      operation, keeps what the person typed, and hands the decision to a
 *      human. The engine never resolves an institutional disagreement by
 *      itself.
 *
 *   4. NOTHING IS EVER SILENTLY DROPPED. An operation ends as synced,
 *      conflict, or failed — and the last two are surfaced. Only an explicit
 *      human discard removes one.
 *
 * Revocation is checked BEFORE any data moves, in either direction, per
 * REVOCATION.checkTrustVersionBeforeSync.
 */
import { SYNC, REVOCATION, NEVER_QUEUED_OPERATIONS } from './shrs-offline-policy.js';
import * as store from './shrs-local-store.js';

/* ── 1. The registry ──────────────────────────────────────────────────────
 *
 * kind:
 *   'additive'  the write creates a row under a key the server owns
 *               ((guardian, period, date) for adhkar). It cannot overwrite an
 *               existing value, so there is nothing for it to conflict WITH.
 *   'edit'      the write changes a record that may have moved on the server
 *               since the device last saw it. Requires baseUpdatedAt at queue
 *               time — without it there is no way to detect a conflict, and an
 *               undetectable conflict is a silent overwrite.
 *
 * replaySafe: the SERVER guarantees a repeat delivery is harmless. Stated per
 * entry with the reason, because "probably fine" is how duplicate institutional
 * records get created.
 */
export const OPERATIONS = {
  'adhkar.complete': {
    method: 'POST',
    path: '/api/portal/adhkar',
    kind: 'additive',
    // UNIQUE (guardian_id, period, completion_date) with ON CONFLICT DO
    // NOTHING. Replaying this a hundred times produces one row.
    replaySafe: true,
    replaySafeBecause: 'unique (guardian_id, period, completion_date), ON CONFLICT DO NOTHING',
    conflict: 'impossible',
    // completionDate is carried explicitly: a completion queued on Tuesday and
    // delivered on Thursday belongs to Tuesday. Letting the server stamp the
    // date would quietly move a person's record to the day their signal
    // returned.
    body: (payload) => ({ period: payload.period, completionDate: payload.completionDate }),
  },

  'message.reply': {
    method: 'POST',
    path: '/api/portal/messages/reply',
    kind: 'additive',
    // A message is appended to a thread; there is no existing value for it to
    // overwrite, so there is nothing for it to conflict WITH. The thread being
    // closed is not a conflict either — it is a refusal, and the server
    // returns 409 for it, which this engine already treats as terminal.
    replaySafe: true,
    // NOT "probably fine". functions/api/portal/messages/reply.js records the
    // Idempotency-Key in sync_operations and replays the stored response, so a
    // retry after a lost reply returns the first answer rather than posting a
    // second message into a parent's thread. The one remaining window — the
    // request dying between the insert and the record — is named in that file
    // rather than left as an assumption.
    replaySafeBecause: 'sync_operations replay guard, scoped to (key, actor)',
    conflict: 'impossible',
    body: (payload) => ({ threadId: payload.threadId, body: payload.body }),
  },

  'emergency.contact.save': {
    method: 'POST',
    path: '/api/portal/emergency-contacts',
    // An EDIT, and the first one in this registry. A contact slot already
    // holds something; delivering Tuesday's correction on Friday must not
    // erase Wednesday's. So baseUpdatedAt is mandatory at queue time — see
    // queue() below, which refuses without it rather than sending blind.
    kind: 'edit',
    replaySafe: true,
    replaySafeBecause: 'upsert keyed by (guardian_id, contact_order), plus the sync_operations replay guard',
    // Real, and exercised: the server compares updated_at and returns 409 with
    // its own row attached, so the interface can show a person both versions.
    // The engine does not choose between them. That is the whole rule.
    conflict: 'server-wins-and-tell-the-person',
    body: (payload) => ({
      order: payload.order,
      fullName: payload.fullName,
      relationship: payload.relationship,
      phone: payload.phone,
      email: payload.email || '',
      baseUpdatedAt: payload.baseUpdatedAt,
    }),
  },
};

export const SYNC_OUTCOME = {
  SYNCED: 'synced',
  CONFLICT: 'conflict',
  FAILED: 'failed',
  PENDING: 'pending',
};

/* ── 2. Queueing ─────────────────────────────────────────────────────────── */

/**
 * Queues one declared operation. Returns {queued:false, reason} rather than
 * throwing, because every caller here is a user action that needs a sentence
 * to show, not a stack trace.
 */
export async function queue(type, payload, opts = {}) {
  if (NEVER_QUEUED_OPERATIONS.includes(type)) {
    return { queued: false, reason: 'requires-live-connection', type };
  }
  const spec = OPERATIONS[type];
  if (!spec) return { queued: false, reason: 'operation-not-declared', type };
  if (spec.kind === 'edit' && !opts.baseUpdatedAt) {
    // Refusing here rather than queueing blind. An edit with no base version
    // cannot be checked against the server's current version, and a write that
    // cannot be checked is a write that can silently destroy someone else's.
    return { queued: false, reason: 'edit-requires-base-version', type };
  }

  const result = await store.enqueue({
    type,
    recordId: opts.recordId ?? null,
    userId: opts.userId ?? null,
    payload: { ...payload, __baseUpdatedAt: opts.baseUpdatedAt ?? null },
  });
  if (result.queued) {
    report();
    if (navigator.onLine) sync();
  }
  return result;
}

/* ── 3. The run ──────────────────────────────────────────────────────────── */

let running = false;
let lastRunAt = 0;
let lastResult = null;

export function isRunning() { return running; }
export function lastRun() { return { at: lastRunAt, result: lastResult }; }

/**
 * Drains the queue. Single-flight: a second call while one is in progress
 * returns the same promise rather than sending anything twice.
 */
let inFlight = null;
export function sync(options = {}) {
  if (inFlight) return inFlight;
  inFlight = runSync(options).finally(() => { inFlight = null; });
  return inFlight;
}

async function runSync(options) {
  if (!navigator.onLine) return finish({ skipped: 'offline' });
  if (!store.sessionValid()) return finish({ skipped: 'locked' });

  running = true;
  report();

  try {
    // Revocation first, before a single record moves in either direction.
    const gate = await checkAuthorisation(options);
    if (!gate.ok) return finish({ skipped: gate.reason });

    const queued = await store.pendingOperations();
    const outcome = { attempted: 0, synced: 0, conflicts: 0, failed: 0, deferred: 0 };

    // Sequential, in creation order. Institutional writes are not raced: if a
    // person edited the same record twice offline, the second edit must land
    // on top of the first, and parallel delivery cannot promise that.
    for (const op of queued) {
      if (!navigator.onLine) { outcome.deferred += 1; continue; }
      if (backoffRemaining(op) > 0) { outcome.deferred += 1; continue; }

      if (op.retryCount >= SYNC.maxRetries) {
        await store.markOperation(op.operationId, SYNC_OUTCOME.FAILED, { reason: 'retries-exhausted' });
        outcome.failed += 1;
        continue;
      }

      outcome.attempted += 1;
      const res = await deliver(op);
      if (res.state === SYNC_OUTCOME.SYNCED) outcome.synced += 1;
      else if (res.state === SYNC_OUTCOME.CONFLICT) outcome.conflicts += 1;
      else if (res.state === SYNC_OUTCOME.FAILED) outcome.failed += 1;
      else outcome.deferred += 1;

      // An authorisation failure is not transient and is not per-operation:
      // every remaining delivery would fail the same way. Stop, and leave the
      // rest pending rather than burning their retry budget.
      if (res.stopRun) break;
    }

    return finish(outcome);
  } catch (err) {
    return finish({ error: (err && err.message) || 'sync-failed' });
  } finally {
    running = false;
    lastRunAt = Date.now();
    report();
  }
}

function finish(result) {
  lastResult = result;
  return result;
}

/* ── 4. Revocation gate ──────────────────────────────────────────────────── */

/**
 * The device asks who it is before it says anything. A rejected session or a
 * bumped trust_version purges everything on this device before any queued
 * write is delivered — an operation queued under an authorisation that has
 * since been withdrawn must not be carried out.
 *
 * Fails CLOSED on a definite rejection (401/403). A transient network failure
 * is not a rejection and does not purge: losing a signal is not the same as
 * losing authorisation, and treating it as such would wipe a working device
 * every time a train entered a tunnel.
 */
async function checkAuthorisation(options) {
  if (!REVOCATION.checkTrustVersionBeforeSync) return { ok: true };
  const probe = options.probeUrl || '/api/portal/me';
  let res;
  try {
    res = await fetch(probe, { credentials: 'same-origin', headers: { accept: 'application/json' } });
  } catch (e) {
    return { ok: false, reason: 'probe-unreachable' };
  }

  if (res.status === 401 || res.status === 403) {
    await store.purgeAll('session-rejected-on-sync');
    return { ok: false, reason: 'session-rejected' };
  }
  if (!res.ok) return { ok: false, reason: 'probe-failed-' + res.status };

  let body = null;
  try { body = await res.json(); } catch (e) { body = null; }

  // trustVersion is only acted on when the server actually sends it. Inventing
  // a value here — or assuming 1 — would either purge working devices or
  // pretend a check happened that did not.
  const serverTrust = body && (body.trustVersion ?? (body.user && body.user.trustVersion));
  if (typeof serverTrust === 'number') {
    const verdict = await store.reconcileTrust(serverTrust);
    if (verdict && verdict.purged) return { ok: false, reason: 'trust-version-changed' };
  }
  return { ok: true, trustChecked: typeof serverTrust === 'number' };
}

/* ── 5. Delivery ─────────────────────────────────────────────────────────── */

function backoffRemaining(op) {
  if (!op.retryCount) return 0;
  const steps = SYNC.retryBackoffMs;
  const wait = steps[Math.min(op.retryCount - 1, steps.length - 1)];
  const since = Date.now() - (op.lastAttemptAt || 0);
  return Math.max(0, wait - since);
}

async function deliver(op) {
  const spec = OPERATIONS[op.type];
  if (!spec) {
    // A type that was declared when it was queued and is not declared now —
    // a build removed it. Terminal, and visible, rather than retried for ever.
    await store.markOperation(op.operationId, SYNC_OUTCOME.FAILED, { reason: 'operation-no-longer-declared' });
    return { state: SYNC_OUTCOME.FAILED };
  }

  const headers = {
    'content-type': 'application/json',
    accept: 'application/json',
    // The stable identity of this operation across every retry. Rule 2.
    'Idempotency-Key': op.operationId,
    'X-SHRS-Operation': op.type,
    'X-SHRS-Queued-At': String(op.createdAt),
  };
  const base = op.payload && op.payload.__baseUpdatedAt;
  if (base) headers['X-SHRS-Base-Version'] = String(base);

  const payload = { ...op.payload };
  delete payload.__baseUpdatedAt;

  let res;
  try {
    res = await fetch(spec.path, {
      method: spec.method,
      credentials: 'same-origin',
      headers,
      body: JSON.stringify(spec.body ? spec.body(payload) : payload),
    });
  } catch (e) {
    // No response at all: the network went, or the server did. Transient by
    // definition — back to pending, one attempt consumed.
    await store.markOperation(op.operationId, SYNC_OUTCOME.PENDING, { reason: 'unreachable' }, { countRetry: true });
    return { state: SYNC_OUTCOME.PENDING };
  }

  if (res.ok) {
    let ack = null;
    try { ack = await res.json(); } catch (e) { ack = { ok: true }; }
    await store.markOperation(op.operationId, SYNC_OUTCOME.SYNCED, ack);
    return { state: SYNC_OUTCOME.SYNCED };
  }

  if (res.status === 409) {
    // The record moved under us. Rule 3: this is where the engine stops and a
    // person decides. What they typed stays in the queue as a draft; nothing
    // is overwritten in either direction.
    // The server's WHOLE reply, under a name that says so. It was called
    // `serverView` and nested as serverAck.serverView.serverView — which is
    // exactly how a future interface ends up showing a person the wrong field.
    let serverResponse = null;
    try { serverResponse = await res.json(); } catch (e) { serverResponse = null; }
    await store.markOperation(op.operationId, SYNC_OUTCOME.CONFLICT, {
      reason: 'server-record-changed',
      serverResponse,
      // Recorded for the reader: an additive operation should never reach
      // here, so if it does the registry entry is wrong, not the data.
      unexpectedForKind: spec.conflict === 'impossible' ? spec.kind : null,
    });
    return { state: SYNC_OUTCOME.CONFLICT };
  }

  if (res.status === 401 || res.status === 403) {
    await store.markOperation(op.operationId, SYNC_OUTCOME.PENDING, { reason: 'not-authorised' });
    return { state: SYNC_OUTCOME.PENDING, stopRun: true };
  }

  if (res.status >= 400 && res.status < 500) {
    // The server understood and refused. A malformed operation will never
    // become valid by being sent again, so it is terminal and surfaced rather
    // than retried until the budget runs out.
    let detail = null;
    try { detail = await res.json(); } catch (e) { detail = null; }
    await store.markOperation(op.operationId, SYNC_OUTCOME.FAILED, { reason: 'rejected-' + res.status, detail });
    return { state: SYNC_OUTCOME.FAILED };
  }

  // 5xx — the server is having a bad time. Transient.
  await store.markOperation(op.operationId, SYNC_OUTCOME.PENDING, { reason: 'server-error-' + res.status }, { countRetry: true });
  return { state: SYNC_OUTCOME.PENDING };
}

/* ── 6. What needs a human ───────────────────────────────────────────────── */

export async function conflicts() {
  const all = await store.allOperations();
  return all.filter((o) => o.syncState === SYNC_OUTCOME.CONFLICT);
}

export async function failures() {
  const all = await store.allOperations();
  return all.filter((o) => o.syncState === SYNC_OUTCOME.FAILED);
}

/** Explicit human discard. The only path by which an undelivered operation
 *  leaves the queue. */
export async function discard(operationId) {
  await store.removeOperation(operationId);
  report();
  return { discarded: operationId };
}

/**
 * Explicit human re-submission of a conflicted edit, on top of the server's
 * current version. Deliberately NOT automatic and deliberately NOT a
 * "force" — the caller must pass the base version they have now looked at,
 * which means someone has seen what the server says before overwriting it.
 */
export async function resubmit(operationId, baseUpdatedAt) {
  const all = await store.allOperations();
  const op = all.find((o) => o.operationId === operationId);
  if (!op) return { resubmitted: false, reason: 'not-found' };
  if (op.syncState !== SYNC_OUTCOME.CONFLICT) return { resubmitted: false, reason: 'not-in-conflict' };
  const spec = OPERATIONS[op.type];
  if (spec && spec.kind === 'edit' && !baseUpdatedAt) {
    return { resubmitted: false, reason: 'edit-requires-base-version' };
  }
  await store.removeOperation(operationId);
  const payload = { ...op.payload };
  delete payload.__baseUpdatedAt;
  return queue(op.type, payload, {
    recordId: op.recordId,
    userId: op.userId,
    baseUpdatedAt: baseUpdatedAt || null,
  });
}

/* ── 7. Telling the interface ────────────────────────────────────────────── */

export async function status() {
  const all = await store.allOperations();
  const count = (state) => all.filter((o) => o.syncState === state).length;
  return {
    syncing: running,
    pending: count(SYNC_OUTCOME.PENDING),
    conflicts: count(SYNC_OUTCOME.CONFLICT),
    failed: count(SYNC_OUTCOME.FAILED),
    synced: count(SYNC_OUTCOME.SYNCED),
    lastRunAt,
  };
}

export async function report() {
  const s = await status();
  if (window.SHRS_CONNECTIVITY && window.SHRS_CONNECTIVITY.setSync) {
    window.SHRS_CONNECTIVITY.setSync({ syncing: s.syncing, pending: s.pending });
  }
  document.dispatchEvent(new CustomEvent('shrs:sync-report', { detail: s }));
  return s;
}

/* ── 8. When it runs ─────────────────────────────────────────────────────── */

let scheduled = false;

export function start() {
  if (scheduled) return;
  scheduled = true;

  if (SYNC.onAppOpen) sync();

  if (SYNC.onReconnect) {
    window.addEventListener('online', () => { sync(); });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastRunAt >= SYNC.onFocusAfterMs) sync();
  });

  // Only while the tab is actually being looked at. A background tab polling
  // a school's server every fifteen minutes, on every device in the school,
  // is a load the institution has no reason to pay for.
  setInterval(() => {
    if (document.visibilityState === 'visible') sync();
  }, SYNC.whileActiveEveryMs);
}
