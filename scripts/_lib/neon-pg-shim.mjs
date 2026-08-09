/**
 * A drop-in stand-in for @neondatabase/serverless, backed by node-postgres.
 *
 * WHY THIS EXISTS AND WHAT IT DELIBERATELY DOES NOT DO:
 *
 * The public verification endpoint is the thing under test. Testing a
 * re-implementation of it would prove nothing — the whole failure this work
 * exists to answer was invisible precisely because every local artefact
 * looked right. So the rehearsal runs functions/api/certificates/verify.js
 * ITSELF, byte for byte, with no test hooks and no edits.
 *
 * That file reaches the database through Neon's HTTP driver, which talks to
 * a Neon endpoint and cannot address a local Postgres. This module supplies
 * the same interface over a TCP connection instead, and is swapped in by a
 * resolver hook (scripts/_lib/neon-pg-loader.mjs) so the endpoint's own
 * import line is untouched.
 *
 * It stands in for the TRANSPORT only. Every line of parsing, resolution,
 * integrity checking and response shaping is the endpoint's own. What this
 * rehearsal therefore cannot prove is anything about the production host,
 * its secrets, or its data — only that the code, given a correctly imported
 * database, answers correctly. That distinction is stated in the report and
 * must not be blurred.
 */
// node-postgres is a devDependency and never ships to Cloudflare — the
// Workers runtime cannot open TCP sockets, which is why production uses
// Neon's HTTP driver in the first place. A missing module here is an
// unfinished setup, not a broken rehearsal, so say which.
let pg;
try {
  ({ default: pg } = await import('pg'));
} catch {
  console.error('\n  The local rehearsal needs node-postgres, which is a devDependency:\n');
  console.error('      npm install\n');
  console.error('  It is never used in production — Cloudflare Workers cannot open TCP');
  console.error('  sockets, which is why the live endpoint uses Neon over HTTP.\n');
  process.exit(2);
}

// Postgres returns DATE as a JS Date in node-postgres but as a 'YYYY-MM-DD'
// string over Neon's HTTP protocol. The endpoint passes issued_at through
// isoDateOnly(), which handles both, but student-facing equality checks in
// the harness compare strings — so DATE and TIMESTAMP are parsed as text
// here to match what production actually hands the endpoint.
pg.types.setTypeParser(1082, (v) => v);           // date
pg.types.setTypeParser(1114, (v) => v);           // timestamp
pg.types.setTypeParser(1184, (v) => v);           // timestamptz

const pools = new Map();

export function neon(url, opts = {}) {
  if (!pools.has(url)) pools.set(url, new pg.Pool({ connectionString: url, max: 4 }));
  const pool = pools.get(url);
  const run = async (text, values) => {
    const res = await pool.query(text, values);
    // fullResults mirrors @vercel/postgres and node-postgres: every call site
    // in the portal reads result.rows, so the shape has to match or the
    // rehearsal would fail for reasons production never would.
    return opts.fullResults ? { rows: res.rows, fields: res.fields, rowCount: res.rowCount } : res.rows;
  };
  // Tagged-template form — the only form the endpoint uses. Interpolations
  // become bind parameters, exactly as Neon does, so the rehearsal exercises
  // the same parameterised queries production runs rather than a string that
  // happens to look similar.
  const sql = (strings, ...values) =>
    run(strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ''), ''), values);
  sql.query = run;
  sql.end = async () => { await pool.end(); pools.delete(url); };
  return sql;
}

export async function closeAll() {
  for (const [url, pool] of pools) { await pool.end(); pools.delete(url); }
}

export default { neon };
