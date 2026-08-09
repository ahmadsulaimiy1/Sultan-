/* SHRS LOCAL STORE — the durable, encrypted, policy-governed device database.
 *
 * Phase 1 of the offline-first directive. Everything above this layer (instant
 * navigation, the sync engine, offline search, the certificate manifest) reads
 * and writes through here and nowhere else, so that the rules in
 * shrs-offline-policy.js are enforced in one place instead of being remembered
 * in twenty.
 *
 * IndexedDB, not localStorage. localStorage is synchronous, string-only, size-
 * limited and unencryptable; it stays where it belongs — UI preferences. A
 * student record does not go in it.
 *
 * THREE PROPERTIES THIS MODULE IS RESPONSIBLE FOR, and which the layers above
 * are therefore allowed to assume:
 *
 *   1. NOTHING FORBIDDEN IS EVER WRITTEN. Every write is redacted through the
 *      policy allowlist first. A safeguarding note cannot reach a device by
 *      being passed to the wrong function, because the wrong function strips
 *      it too.
 *   2. NOTHING EXPIRED IS EVER READ. Reads check the offline session clock and
 *      the record's own retention clock and return null rather than stale
 *      data. Fail closed is the default and there is no flag to turn it off.
 *   3. NOTHING IS READABLE WITHOUT THE SESSION. Records are encrypted with a
 *      key derived from the live session and held only in memory. Logging out,
 *      expiry, or a revoked trust version leaves ciphertext nobody can open.
 */
import {
  SCOPE, LIFETIMES, STORAGE, REVOCATION, NEVER_QUEUED_OPERATIONS,
  redactForCache, POLICY_VERSION,
} from './shrs-offline-policy.js';

const DB_NAME = 'shrs';
/* Bump on any schema change. The upgrade path below is additive and ordered;
 * migrations must never assume they run from empty, because a device that has
 * been offline for a month arrives at whatever version it last saw. */
const DB_VERSION = 1;

const STORE = {
  records: 'records',     // keyPath 'key' = `${entity}:${id}`
  documents: 'documents',
  queue: 'queue',
  meta: 'meta',
};

let dbPromise = null;
/** The AES key. In memory only — never persisted, by design. */
let cryptoKey = null;
let sessionOpenedAt = 0;

/* ── Opening and migration ───────────────────────────────────────────────── */

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const from = event.oldVersion;
      // v1 — initial shape.
      if (from < 1) {
        const records = db.createObjectStore(STORE.records, { keyPath: 'key' });
        records.createIndex('entity', 'entity');
        records.createIndex('accessedAt', 'accessedAt');
        records.createIndex('syncedAt', 'syncedAt');

        const documents = db.createObjectStore(STORE.documents, { keyPath: 'key' });
        documents.createIndex('accessedAt', 'accessedAt');

        const queue = db.createObjectStore(STORE.queue, { keyPath: 'operationId' });
        queue.createIndex('syncState', 'syncState');
        queue.createIndex('createdAt', 'createdAt');

        db.createObjectStore(STORE.meta, { keyPath: 'key' });
      }
      // Future migrations append here as `if (from < 2) { … }`.
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // A blocked upgrade means another tab holds an older version open. Reject
    // rather than hang; the caller degrades to online-only, which is correct.
    req.onblocked = () => reject(new Error('shrs-local-store: upgrade blocked by another tab'));
  });
  return dbPromise;
}

function tx(db, storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* ── Encryption at rest ──────────────────────────────────────────────────── */

/* The key is derived from a per-session secret the server issues at login and
 * the client never persists. That is the whole mechanism by which logging out
 * makes cached records unreadable: the key simply ceases to exist, and what is
 * left on disk is ciphertext with no opener.
 *
 * PBKDF2 rather than a raw import because the session secret is not uniformly
 * random key material, and a salt bound to the device keeps two devices under
 * the same account from producing the same key. */
export async function unlock(sessionSecret, deviceSalt) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey(
    'raw', enc.encode(sessionSecret), 'PBKDF2', false, ['deriveKey'],
  );
  cryptoKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(deviceSalt), iterations: 150_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  sessionOpenedAt = Date.now();
  await setMeta('sessionOpenedAt', sessionOpenedAt);
  await setMeta('policyVersion', POLICY_VERSION);
}

/** Drops the key. Cached records become unreadable immediately, before the
 *  purge below has even finished running. */
export function lock() {
  cryptoKey = null;
  sessionOpenedAt = 0;
}

async function seal(value) {
  if (!cryptoKey) throw new Error('shrs-local-store: locked');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, bytes);
  return { iv: Array.from(iv), cipher: Array.from(new Uint8Array(cipher)) };
}

async function open(sealed) {
  if (!cryptoKey || !sealed) return null;
  try {
    const iv = new Uint8Array(sealed.iv);
    const cipher = new Uint8Array(sealed.cipher);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, cipher);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    // A failed decrypt is corruption or a key change. Either way the record is
    // gone, not "probably still fine" — the caller refetches from the server.
    return null;
  }
}

/* ── The offline session clock ───────────────────────────────────────────── */

/** True only while the offline session is inside its ceiling. Every read goes
 *  through this. There is deliberately no override. */
export function sessionValid() {
  if (!cryptoKey || !sessionOpenedAt) return false;
  return (Date.now() - sessionOpenedAt) < LIFETIMES.offlineSessionMs;
}

export function sessionExpiresAt() {
  return sessionOpenedAt ? sessionOpenedAt + LIFETIMES.offlineSessionMs : 0;
}

/* ── Records ─────────────────────────────────────────────────────────────── */

const keyOf = (entity, id) => `${entity}:${id}`;

/**
 * Writes a server record to the device — redacted, stamped and encrypted.
 * `entity` must be one the policy knows; an unknown entity caches nothing,
 * because the allowlist returns false for every field.
 */
export async function putRecord(entity, id, data, meta = {}) {
  if (!sessionValid()) return false;
  const permitted = redactForCache(entity, data);
  if (!Object.keys(permitted).length) return false;

  const db = await openDb();
  const now = Date.now();
  const row = {
    key: keyOf(entity, id),
    entity,
    id: String(id),
    // Metadata stays in the clear so sweeps and eviction can run without the
    // key. It is timestamps and sync state — nothing about a child.
    syncedAt: meta.syncedAt || now,
    accessedAt: now,
    syncState: meta.syncState || 'synced',
    recordVersion: meta.recordVersion || null,
    sealed: await seal(permitted),
  };
  await wrap(tx(db, STORE.records, 'readwrite').put(row));
  await enforceScope(entity);
  return true;
}

/**
 * Reads a record. Returns null — never stale data — if the session has expired,
 * the retention window has passed, or decryption fails.
 * Callers get `{ data, syncedAt, stale }` so the UI can stamp freshness.
 */
export async function getRecord(entity, id) {
  if (!sessionValid()) return null;
  const db = await openDb();
  const row = await wrap(tx(db, STORE.records).get(keyOf(entity, id)));
  if (!row) return null;

  if ((Date.now() - row.syncedAt) > LIFETIMES.recordRetentionMs) {
    await deleteRecord(entity, id);
    return null;
  }
  const data = await open(row.sealed);
  if (!data) { await deleteRecord(entity, id); return null; }

  // Touch for LRU. Fire-and-forget: a failed touch must not fail a read.
  row.accessedAt = Date.now();
  wrap(tx(db, STORE.records, 'readwrite').put(row)).catch(() => {});

  return { data, syncedAt: row.syncedAt, syncState: row.syncState, stale: false };
}

export async function deleteRecord(entity, id) {
  const db = await openDb();
  await wrap(tx(db, STORE.records, 'readwrite').delete(keyOf(entity, id)));
}

/** Enforces SCOPE caps by evicting the least recently accessed. */
async function enforceScope(entity) {
  const cap = entity === 'student' ? SCOPE.maxStudentRecords
    : entity === 'certificate' ? SCOPE.maxCertificateRecords
      : null;
  if (!cap) return;
  const db = await openDb();
  const rows = await wrap(tx(db, STORE.records).index('entity').getAll(entity));
  if (rows.length <= cap) return;
  rows.sort((a, b) => a.accessedAt - b.accessedAt);
  const store = tx(db, STORE.records, 'readwrite');
  for (const row of rows.slice(0, rows.length - cap)) store.delete(row.key);
}

/* ── The outbound queue ──────────────────────────────────────────────────── */

/**
 * Queues a mutation for synchronisation. Carries every field the directive
 * (§8) requires, and refuses outright the operations that must never be
 * deferred — issuing a certificate consumes a permanent number and cannot be
 * replayed from a phone that has been in a drawer for two days.
 */
export async function enqueue(op) {
  if (NEVER_QUEUED_OPERATIONS.includes(op.type)) {
    return { queued: false, reason: 'requires-live-connection', type: op.type };
  }
  if (!sessionValid()) return { queued: false, reason: 'session-expired' };

  const db = await openDb();
  const entry = {
    operationId: op.operationId || crypto.randomUUID(),
    type: op.type,
    recordId: op.recordId ?? null,
    userId: op.userId ?? null,
    deviceId: await deviceId(),
    createdAt: Date.now(),
    syncState: 'pending',
    retryCount: 0,
    serverAck: null,
    // The payload may contain what the user typed; it is sealed like a record.
    sealed: await seal(op.payload ?? {}),
  };
  await wrap(tx(db, STORE.queue, 'readwrite').put(entry));
  return { queued: true, operationId: entry.operationId };
}

export async function pendingOperations() {
  if (!sessionValid()) return [];
  const db = await openDb();
  const rows = await wrap(tx(db, STORE.queue).index('syncState').getAll('pending'));
  const out = [];
  for (const row of rows) {
    const payload = await open(row.sealed);
    if (payload) out.push({ ...row, payload, sealed: undefined });
  }
  return out.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Records the outcome of one delivery attempt.
 *
 * `lastAttemptAt` and `retryCount` together are what the sync engine reads to
 * honour SYNC.retryBackoffMs — without the timestamp, "wait thirty seconds
 * before trying again" has nothing to measure from, and a device that reloads
 * mid-backoff would hammer a server that is already struggling.
 *
 * opts.countRetry is separate from the state because a transient failure goes
 * back to 'pending' (it will be tried again) while still consuming an attempt.
 * Only 'failed' is terminal.
 */
export async function markOperation(operationId, syncState, serverAck = null, opts = {}) {
  const db = await openDb();
  const row = await wrap(tx(db, STORE.queue).get(operationId));
  if (!row) return;
  row.syncState = syncState;
  row.serverAck = serverAck;
  row.lastAttemptAt = Date.now();
  if (syncState === 'failed' || opts.countRetry) row.retryCount += 1;
  await wrap(tx(db, STORE.queue, 'readwrite').put(row));
}

/**
 * Removes a queued operation outright. Used only when a human has explicitly
 * discarded a conflicted or failed edit — the engine itself never deletes an
 * operation it could not deliver, because a silently dropped institutional
 * write is exactly the failure this whole layer exists to prevent.
 */
export async function removeOperation(operationId) {
  const db = await openDb();
  await wrap(tx(db, STORE.queue, 'readwrite').delete(operationId));
}

/** Every queued operation regardless of state, newest last. For the UI that
 *  has to show a person what is waiting, what failed, and what conflicted. */
export async function allOperations() {
  if (!sessionValid()) return [];
  const db = await openDb();
  const rows = await wrap(tx(db, STORE.queue).getAll());
  const out = [];
  for (const row of rows) {
    const payload = await open(row.sealed);
    out.push({ ...row, payload: payload || null, sealed: undefined });
  }
  return out.sort((a, b) => a.createdAt - b.createdAt);
}

/* ── Meta, device identity, sweeps, purge ────────────────────────────────── */

export async function setMeta(key, value) {
  const db = await openDb();
  await wrap(tx(db, STORE.meta, 'readwrite').put({ key, value }));
}

export async function getMeta(key) {
  const db = await openDb();
  const row = await wrap(tx(db, STORE.meta).get(key));
  return row ? row.value : null;
}

/** A stable per-device identifier for the sync log. Not a secret and not tied
 *  to a person — it exists so an administrator can see which device holds
 *  pending changes, which is the §19 requirement. */
export async function deviceId() {
  let id = await getMeta('deviceId');
  if (!id) { id = crypto.randomUUID(); await setMeta('deviceId', id); }
  return id;
}

/**
 * Retention sweep: destroys anything past its clock. Runs on open, on
 * reconnect, and on a timer. Does not need the key — it reads only the
 * cleartext timestamps.
 */
export async function sweep() {
  const db = await openDb();
  const now = Date.now();
  let removed = 0;

  const records = await wrap(tx(db, STORE.records).getAll());
  const rStore = tx(db, STORE.records, 'readwrite');
  for (const row of records) {
    if ((now - row.syncedAt) > LIFETIMES.recordRetentionMs) { rStore.delete(row.key); removed += 1; }
  }

  const docs = await wrap(tx(db, STORE.documents).getAll());
  const dStore = tx(db, STORE.documents, 'readwrite');
  for (const row of docs) {
    if ((now - row.savedAt) > LIFETIMES.documentRetentionMs) { dStore.delete(row.key); removed += 1; }
  }
  return removed;
}

/**
 * Total destruction of portal data. Called on logout, on offline-session
 * expiry, and — the case that matters — the instant a reconnect reports a
 * trust-version mismatch, before any sync moves a single byte.
 *
 * The outbound queue goes too. A revoked user's pending edits are not
 * institutional records waiting to be saved; they are changes by someone whose
 * authority was withdrawn.
 */
export async function purgeAll(reason = 'unspecified') {
  lock();
  const db = await openDb();
  for (const name of [STORE.records, STORE.documents, STORE.queue]) {
    await wrap(tx(db, name, 'readwrite').clear());
  }
  await setMeta('lastPurge', { at: Date.now(), reason });
  return true;
}

/**
 * Called on every reconnect BEFORE synchronising, per REVOCATION policy.
 * The server's current trust version is compared with the one this device
 * last saw; any mismatch means access was withdrawn while the device was away.
 */
export async function reconcileTrust(serverTrustVersion) {
  const known = await getMeta('trustVersion');
  if (known !== null && known !== serverTrustVersion) {
    await purgeAll('trust-version-mismatch');
    return { purged: true };
  }
  await setMeta('trustVersion', serverTrustVersion);
  return { purged: false };
}

/** Storage pressure, for the §15 indicator and for refusing new caches. */
export async function storageStatus() {
  if (!navigator.storage?.estimate) return { supported: false };
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  const budget = STORAGE.maxRecordBytes + STORAGE.maxDocumentBytes;
  return {
    supported: true,
    usage,
    quota,
    budget,
    percentOfBudget: budget ? Math.round((usage / budget) * 100) : 0,
    pressured: budget ? (usage / budget) * 100 >= STORAGE.warnAtPercent : false,
  };
}

/**
 * Recovery (§20). Local storage is never the authoritative copy, so recovery is
 * simply: destroy whatever is here and let the sync engine refill it from the
 * server. Called when the schema is unreadable, decryption fails wholesale, or
 * the policy version on the device predates the one now in force.
 */
export async function recover(reason) {
  try { await purgeAll(`recovery:${reason}`); } catch { /* fall through */ }
  try {
    dbPromise = null;
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    });
  } catch { /* the server remains the source of truth either way */ }
  return { recovered: true, reason };
}
