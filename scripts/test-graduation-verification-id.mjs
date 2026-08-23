/**
 * Does getOrCreateVerificationId() actually stay collision-safe under
 * concurrency, the way its ON CONFLICT DO NOTHING claims it does?
 *
 *     node scripts/test-graduation-verification-id.mjs
 *
 * The original implementation computed the Permanent Verification ID as
 * COUNT(DISTINCT verification_id)+1 with no UNIQUE constraint anywhere
 * backing it — the one identifier scheme in the 2026-08-23 institutional-
 * identifier audit that could collide SILENTLY: two students' first
 * documents, issued concurrently in the same graduation_session, could
 * both read the same count before either committed and mint the SAME
 * "permanent" verification ID for two different children.
 *
 * There is no real database here. The stub below is an in-memory
 * implementation of the exact two tables and the exact SQL shapes the
 * real function issues (INSERT ... ON CONFLICT DO NOTHING, UPDATE ...
 * RETURNING), with the same race window a real Postgres client and two
 * concurrent requests would have — so a version of the function that
 * reintroduces a check-then-act race fails this test, not just a
 * re-implementation that agrees with itself.
 */
import { getOrCreateVerificationId } from '../functions/_lib/graduation-document-no.js';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (ok) { console.log(`  ok    ${name}`); return; }
  failures++;
  console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
};

// An in-memory stand-in for the two tables, with a real (if coarse) lock
// per graduation_session on the UPDATE ... RETURNING step and per
// graduation_record_id on the INSERT ... ON CONFLICT step — mirroring
// Postgres row-level locking, not the application's own bookkeeping.
function makeStubSql() {
  const seqRows = new Map();      // graduation_session -> next_seq
  const idRows = new Map();       // graduation_record_id -> row
  const byVerificationId = new Set();
  const seqLocks = new Map();     // graduation_session -> queue of pending resolvers
  const idLocks = new Map();      // graduation_record_id -> queue

  async function withLock(map, key, fn) {
    while (map.get(key)) await map.get(key);
    let release;
    map.set(key, new Promise((r) => { release = r; }));
    try { return await fn(); } finally { release(); map.delete(key); }
  }

  return async (strings, ...values) => {
    const q = strings.join('?');
    if (/SELECT verification_id FROM graduation_verification_ids/.test(q)) {
      const row = idRows.get(values[0]);
      return { rows: row ? [{ verification_id: row.verification_id }] : [] };
    }
    if (/INSERT INTO graduation_verification_session_seq/.test(q)) {
      const session = values[0];
      if (!seqRows.has(session)) seqRows.set(session, 1);
      return { rows: [] };
    }
    if (/UPDATE graduation_verification_session_seq SET next_seq/.test(q)) {
      const session = values[0];
      return withLock(seqLocks, session, async () => {
        const current = seqRows.get(session);
        seqRows.set(session, current + 1);
        return { rows: [{ seq: current }] };
      });
    }
    if (/INSERT INTO graduation_verification_ids/.test(q)) {
      const [recordId, session, seq, verificationId] = values;
      return withLock(idLocks, recordId, async () => {
        if (idRows.has(recordId)) return { rows: [] }; // ON CONFLICT DO NOTHING
        idRows.set(recordId, { verification_id: verificationId, session, seq });
        byVerificationId.add(verificationId);
        return { rows: [{ verification_id: verificationId }] };
      });
    }
    throw new Error(`unexpected query in stub: ${q}`);
  };
}

// ── Two DIFFERENT students' FIRST documents, issued at the exact same
// moment, in the SAME session — the incident's own exact shape ──────────
{
  const sql = makeStubSql();
  const [a, b] = await Promise.all([
    getOrCreateVerificationId(sql, 101, '2025/2026'),
    getOrCreateVerificationId(sql, 102, '2025/2026'),
  ]);
  check('two different students racing in the same session never collide',
    a !== b, `${a} vs ${b}`);
}

// ── The SAME student's sibling documents, issued concurrently, MUST
// share one ID — collision-safety must not turn into false collisions ──
{
  const sql = makeStubSql();
  const [a, b, c] = await Promise.all([
    getOrCreateVerificationId(sql, 201, '2025/2026'),
    getOrCreateVerificationId(sql, 201, '2025/2026'),
    getOrCreateVerificationId(sql, 201, '2025/2026'),
  ]);
  check('the same record requested concurrently always converges on one ID',
    a === b && b === c, `${a} / ${b} / ${c}`);
}

// ── A larger concurrent burst — no pairwise collision anywhere ─────────
{
  const sql = makeStubSql();
  const N = 25;
  const ids = await Promise.all(Array.from({ length: N }, (_, i) =>
    getOrCreateVerificationId(sql, 1000 + i, '2026/2027')));
  check(`${N} distinct records racing concurrently produce ${N} distinct IDs`,
    new Set(ids).size === N, `got ${new Set(ids).size} distinct`);
}

// ── Different sessions number independently, starting at 1 each ───────
{
  const sql = makeStubSql();
  const a = await getOrCreateVerificationId(sql, 501, '2025/2026');
  const b = await getOrCreateVerificationId(sql, 502, '2026/2027');
  check('a new session starts its own numbering at 1, not carried over',
    a.endsWith('-000001') && b.endsWith('-000001'), `${a} / ${b}`);
}

// ── Calling again for an already-assigned record returns the SAME value,
// via the fast path, not a fresh claim ─────────────────────────────────
{
  const sql = makeStubSql();
  const first = await getOrCreateVerificationId(sql, 601, '2025/2026');
  const second = await getOrCreateVerificationId(sql, 601, '2025/2026');
  check('a record already assigned reuses its id on a later call, sequentially too',
    first === second, `${first} vs ${second}`);
}

console.log(`\n${failures ? `${failures} FAILED` : 'no two records ever share a verification id, and no record ever gets two'}`);
process.exit(failures ? 1 : 0);
