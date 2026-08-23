/**
 * Does generateWithRetryOnConflict() actually retry a genuine
 * unique-violation with a fresh candidate, the way TD-2's remediation
 * plan (docs/technical-debt-register.md) says it should?
 *
 *     node scripts/test-generate-with-retry.mjs
 *
 * TD-2 covers nine COUNT(*)+1 reference-number counters — Admission
 * Number, Invoice/Receipt No, Certificate reference No, Graduation
 * document reference No, Teacher observation/review No, Behaviour
 * incident No, Safeguarding case No, Certificate batch No — every one
 * already backstopped by a database UNIQUE constraint, so a genuine
 * race was always a loud, safe failure, never a silent one. What was
 * missing was the retry: a caller who lost the race got a raw
 * unique-violation instead of a fresh candidate. This test proves the
 * helper closes exactly that gap, without inventing a database.
 */
import { generateWithRetryOnConflict } from '../functions/_lib/generate-with-retry.js';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (ok) { console.log(`  ok    ${name}`); return; }
  failures++;
  console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
};

function uniqueViolation(message) {
  const err = new Error(message || 'duplicate key value violates unique constraint');
  err.code = '23505';
  return err;
}

// ── A collision on the first attempt is retried with a fresh candidate,
// and the caller never sees the raw database error ─────────────────────
{
  const taken = new Set(['SHR-TO-2026-00001']);
  let generateCalls = 0;
  const outcome = await generateWithRetryOnConflict(
    'unused-sql-handle',
    () => { generateCalls += 1; return `SHR-TO-2026-${String(generateCalls).padStart(5, '0')}`; },
    async (no) => {
      if (taken.has(no)) throw uniqueViolation(`duplicate key value violates unique constraint on ${no}`);
      taken.add(no);
      return { rows: [{ id: 42, observation_no: no }] };
    }
  );
  check('a lost race retries and returns the winning candidate',
    outcome.value === 'SHR-TO-2026-00002' && outcome.result.rows[0].id === 42,
    `value=${outcome.value}`);
  check('the retry actually recomputed a fresh candidate, not the same one twice',
    generateCalls === 2, `generateCalls=${generateCalls}`);
}

// ── A non-unique-violation error is never swallowed or retried ─────────
{
  let insertCalls = 0;
  let caught = null;
  try {
    await generateWithRetryOnConflict(
      'unused-sql-handle',
      () => 'SHR-BH-2026-00001',
      async () => { insertCalls += 1; throw new Error('connection reset by peer'); }
    );
  } catch (err) {
    caught = err;
  }
  check('a non-23505 error propagates immediately, not retried',
    caught && caught.message === 'connection reset by peer' && insertCalls === 1,
    `insertCalls=${insertCalls}, message=${caught && caught.message}`);
}

// ── Every attempt exhausted still fails loudly, with a clear message ───
{
  let insertCalls = 0;
  let caught = null;
  try {
    await generateWithRetryOnConflict(
      'unused-sql-handle',
      () => 'SHR-SG-2026-00001',
      async () => { insertCalls += 1; throw uniqueViolation('always taken'); },
      { attempts: 3 }
    );
  } catch (err) {
    caught = err;
  }
  check('exhausting every attempt still throws, never returns a fabricated result',
    caught && /3 attempts/.test(caught.message), `message=${caught && caught.message}`);
  check('it tried exactly the configured number of attempts, not more, not fewer',
    insertCalls === 3, `insertCalls=${insertCalls}`);
}

// ── The no-collision path costs exactly one generate + one insert ──────
{
  let generateCalls = 0;
  let insertCalls = 0;
  const outcome = await generateWithRetryOnConflict(
    'unused-sql-handle',
    () => { generateCalls += 1; return 'SHR-FIN-260823-000001'; },
    async (no) => { insertCalls += 1; return { rows: [{ id: 7 }] }; }
  );
  check('the common case (no collision) makes no wasted attempts',
    generateCalls === 1 && insertCalls === 1 && outcome.value === 'SHR-FIN-260823-000001',
    `generateCalls=${generateCalls}, insertCalls=${insertCalls}`);
}

console.log(`\n${failures ? `${failures} FAILED` : 'generateWithRetryOnConflict retries a real collision and never fabricates or swallows a result'}`);
process.exit(failures ? 1 : 0);
