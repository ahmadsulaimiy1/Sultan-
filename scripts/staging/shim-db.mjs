// Stands in for functions/_lib/db.js in the staging harness ONLY.
//
// Production talks to Neon over HTTP, which cannot address a local
// Postgres. This exposes the SAME interface — a tagged-template function
// resolving to { rows, fields } — over node-postgres, so every call site
// in verify.js runs unmodified against the staging cluster. Nothing about
// the query text, the parameter binding or the result shape changes; only
// the transport does.
import pg from 'pg';

let pool = null;

export function getSql(env) {
  if (!env.DATABASE_URL) return null;
  if (!pool) pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 4 });

  // neon(..., { fullResults: true }) is a tagged template: the strings are
  // the literal chunks and every interpolation is bound as a parameter,
  // never concatenated. $1..$n placeholders reproduce that exactly, so an
  // injection that would fail in production also fails here.
  return async function sql(strings, ...values) {
    const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ''), '');
    const res = await pool.query(text, values);
    return { rows: res.rows, fields: res.fields, rowCount: res.rowCount };
  };
}

export async function close() { if (pool) await pool.end(); }
