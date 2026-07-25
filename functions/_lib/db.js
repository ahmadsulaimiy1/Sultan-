// Database client for Cloudflare Pages Functions, backed by Neon's
// HTTP-based serverless Postgres driver (works over fetch, no raw TCP
// sockets — which Workers can't open — unlike the old @vercel/postgres
// client).
//
// `{ fullResults: true }` makes every query resolve to { rows, fields,
// ... } exactly like @vercel/postgres and node-postgres did, so every
// existing `result.rows[0]` / `result.rows.length` call site in the
// portal routes works unchanged — only the import and initialization
// differ from the Vercel version.
import { neon } from '@neondatabase/serverless';

export function getSql(env) {
  if (!env.DATABASE_URL) return null;
  return neon(env.DATABASE_URL, { fullResults: true });
}
