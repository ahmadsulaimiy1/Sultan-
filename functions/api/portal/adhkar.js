// Family Adhkar tracking (Parent Portal). Guardian-level, not per-child —
// there is no separate student login in this schema, so "the family"
// tracks together. GET returns today's completion state + a day-streak;
// POST marks a period done for today (idempotent — ON CONFLICT DO NOTHING).
import { getSql } from '../../_lib/db.js';
import { readSessionFromRequest } from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';

async function requireSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
  } catch {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  const sql = getSql(env);
  if (!sql) return { error: json({ error: 'Portal is not configured yet — no database is linked.' }, 500) };
  return { session, sql };
}

function toDateStr(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

// Streak = consecutive days, counting back from today, with at least one
// period completed. Today itself is optional in the streak (so it
// doesn't drop to 0 the moment midnight passes before that day's adhkar
// is marked) — it counts from yesterday if today has nothing yet.
function computeStreak(dateStrings) {
  const dayMs = 24 * 60 * 60 * 1000;
  const set = new Set(dateStrings);
  let cursor = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  if (!set.has(cursor.toISOString().slice(0, 10))) {
    cursor = new Date(cursor.getTime() - dayMs);
  }
  let streak = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor = new Date(cursor.getTime() - dayMs);
  }
  return streak;
}

export async function onRequestGet({ request, env }) {
  const { session, sql, error } = await requireSession(request, env);
  if (error) return error;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const todayRes = await sql`SELECT period FROM adhkar_completions WHERE guardian_id = ${session.guardianId} AND completion_date = ${today}`;
    const todayPeriods = todayRes.rows.map((r) => r.period);

    const historyRes = await sql`
      SELECT DISTINCT completion_date FROM adhkar_completions
      WHERE guardian_id = ${session.guardianId}
      ORDER BY completion_date DESC LIMIT 400`;
    const dates = historyRes.rows.map((r) => toDateStr(r.completion_date));
    const streak = computeStreak(dates);

    return json({
      today: { morning: todayPeriods.includes('morning'), evening: todayPeriods.includes('evening') },
      streak,
    });
  } catch (err) {
    console.error('portal adhkar GET error', err);
    return json({ error: 'Could not load your Adhkar progress right now.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { session, sql, error } = await requireSession(request, env);
  if (error) return error;

  const body = await readJsonBody(request);
  const period = body && body.period;
  if (period !== 'morning' && period !== 'evening') {
    return json({ error: 'Invalid period.' }, 400);
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    await sql`
      INSERT INTO adhkar_completions (guardian_id, period, completion_date, completed_at)
      VALUES (${session.guardianId}, ${period}, ${today}, now())
      ON CONFLICT (guardian_id, period, completion_date) DO NOTHING`;
    return json({ ok: true });
  } catch (err) {
    console.error('portal adhkar POST error', err);
    return json({ error: 'Could not save your Adhkar progress right now.' }, 500);
  }
}
