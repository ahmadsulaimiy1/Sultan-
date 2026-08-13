// Rate limiting — the guard that did not exist.
//
// An audit of this codebase found no rate limiting of any spelling
// anywhere in it. Both assistant endpoints are open to the internet and
// every call bills the school's Anthropic account. The existing caps
// bound the cost of ONE conversation — 24 turns, 16,000 characters,
// a reply ceiling — and say nothing at all about how many conversations
// a stranger may start. Somebody who finds the WhatsApp number can run
// the bill up as fast as their thumbs allow.
//
// WHERE THE COUNTERS LIVE
//
// Workers have no shared memory, so a counter needs a store. In order
// of preference:
//
//   1. A KV namespace bound as RATE_LIMIT — cheapest and fastest, but
//      eventually consistent, so a determined attacker across many
//      colocations can exceed a limit briefly. Fine: this protects a
//      bill, not a vault.
//   2. Postgres, which this project already has. Exact, atomic in one
//      statement, and costs a round trip. Used when no KV is bound —
//      which is the case today, so this is the live path.
//   3. Per-isolate memory. Nearly worthless (each isolate counts
//      separately, and they are recycled) but better than nothing, and
//      it means a database outage cannot take the assistant down with
//      it.
//
// FAIL OPEN, DELIBERATELY, AND SAY SO
//
// If every store fails, requests are allowed and the failure is logged.
// The alternative — refusing everyone when the counter breaks — turns a
// storage hiccup into a total outage of the school's front door. The
// money at risk is bounded and recoverable; a parent who cannot reach
// anyone is not. That is a judgement, not an oversight, which is why it
// is written down here rather than discovered later.
//
// The real backstop is the spend cap in the Anthropic console, which no
// amount of code can substitute for. This reduces exposure; it does not
// remove it.

import { getSql } from './db.js';

// Fixed windows rather than sliding: one atomic statement, no row per
// request to sweep up later. The cost is that a burst can straddle a
// window boundary and briefly double the nominal rate, which for a
// school assistant is not worth a more expensive design.
export const LIMITS = {
  chat: [
    { suffix: 'burst', limit: 12, windowSeconds: 300 },    // 12 messages / 5 minutes
    { suffix: 'daily', limit: 120, windowSeconds: 86400 }, // 120 messages / day
  ],
  whatsapp: [
    { suffix: 'burst', limit: 20, windowSeconds: 300 },    // a real conversation is chattier
    { suffix: 'daily', limit: 200, windowSeconds: 86400 },
  ],
};

const memory = new Map(); // isolate-local last resort

function memoryHit(bucket, windowSeconds, now) {
  const row = memory.get(bucket);
  if (!row || row.start + windowSeconds * 1000 <= now) {
    memory.set(bucket, { start: now, hits: 1 });
    return 1;
  }
  row.hits += 1;
  // Unbounded growth is the one way an in-memory counter can hurt the
  // thing it protects. Isolates are short-lived, but not guaranteed to
  // be, so cap the map.
  if (memory.size > 5000) memory.clear();
  return row.hits;
}

async function kvHit(kv, bucket, windowSeconds, now) {
  const raw = await kv.get(bucket);
  let row = null;
  try { row = raw ? JSON.parse(raw) : null; } catch { row = null; }
  const fresh = !row || row.start + windowSeconds * 1000 <= now;
  const next = fresh ? { start: now, hits: 1 } : { start: row.start, hits: row.hits + 1 };
  // TTL a little beyond the window so a lapsed counter disappears on
  // its own rather than needing a sweep.
  await kv.put(bucket, JSON.stringify(next), { expirationTtl: Math.max(60, windowSeconds + 60) });
  return next.hits;
}

// One statement, atomic under concurrency: the CASE decides whether
// this request opens a new window or extends the current one, so two
// simultaneous requests cannot both reset the counter.
async function sqlHit(sql, bucket, windowSeconds) {
  const res = await sql`
    INSERT INTO rate_limits (bucket, window_start, hits)
    VALUES (${bucket}, now(), 1)
    ON CONFLICT (bucket) DO UPDATE SET
      hits = CASE
        WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN 1
        ELSE rate_limits.hits + 1 END,
      window_start = CASE
        WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN now()
        ELSE rate_limits.window_start END
    RETURNING hits`;
  return res.rows[0].hits;
}

// Returns { allowed, retryAfterSeconds, via }. Never throws.
export async function checkRateLimit(env, channel, identity) {
  const rules = LIMITS[channel];
  if (!rules || !identity) return { allowed: true, via: 'no_identity' };

  const now = Date.now();
  const kv = env.RATE_LIMIT || null;
  const sql = kv ? null : getSql(env);
  const via = kv ? 'kv' : (sql ? 'sql' : 'memory');

  for (const rule of rules) {
    const bucket = `rl:${channel}:${rule.suffix}:${identity}`;
    let hits;
    try {
      if (kv) hits = await kvHit(kv, bucket, rule.windowSeconds, now);
      else if (sql) hits = await sqlHit(sql, bucket, rule.windowSeconds);
      else hits = memoryHit(bucket, rule.windowSeconds, now);
    } catch (err) {
      // Fall back one level rather than failing the request outright.
      console.error('rate limit store failed, falling back to memory', rule.suffix, err);
      try { hits = memoryHit(bucket, rule.windowSeconds, now); } catch { return { allowed: true, via: 'failed_open' }; }
    }
    if (hits > rule.limit) {
      return { allowed: false, retryAfterSeconds: rule.windowSeconds, rule: rule.suffix, via };
    }
  }
  return { allowed: true, via };
}

// The visitor's identity for counting purposes. Cloudflare sets
// CF-Connecting-IP on every request and it cannot be spoofed by the
// client, unlike X-Forwarded-For. Where there is genuinely no IP the
// bucket is shared, which is strict rather than permissive — the right
// direction to be wrong in for a spend guard.
export function identityFromRequest(request) {
  // Defensive on purpose. A real Cloudflare Request always has headers,
  // but this function runs before anything else in the handler, outside
  // any try/catch — so if it could throw, a guard whose entire job is
  // protecting the front door would be able to close it. It cannot.
  const headers = request && request.headers;
  if (!headers || typeof headers.get !== 'function') return 'unknown';
  return headers.get('CF-Connecting-IP')
    || headers.get('X-Forwarded-For')
    || 'unknown';
}

export function rateLimitMessage(lang) {
  return lang === 'ar'
    ? 'لقد أرسلت رسائل كثيرة خلال فترة قصيرة. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى، أو مراسلتنا على info@shroyalschools.com.'
    : 'That is a lot of messages in a short time. Please wait a few minutes and try again — or email info@shroyalschools.com if it is urgent.';
}
