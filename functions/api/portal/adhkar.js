// Family Adhkar tracking (Parent Portal). Guardian-level, not per-child —
// there is no separate student login in this schema, so "the family"
// tracks together. GET returns today's completion state, a day-streak,
// rolling-window counts, and computed (not stored) achievement badges.
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

function countWithinDays(dateStrings, days) {
  const cutoff = Date.now() - days * 86400000;
  return dateStrings.filter((d) => new Date(d + 'T00:00:00Z').getTime() >= cutoff).length;
}

function buildAchievements(streak, morningCount, eveningCount, distinctDays, fullDays) {
  const list = [
    { id: 'first', label: { en: 'First Completion', ar: 'أول إنجاز' }, earned: morningCount + eveningCount >= 1 },
    { id: 'streak3', label: { en: '3-Day Consistency', ar: 'انتظام ٣ أيام' }, earned: streak >= 3 },
    { id: 'streak7', label: { en: '7-Day Consistency', ar: 'انتظام ٧ أيام' }, earned: streak >= 7 },
    { id: 'streak30', label: { en: '30-Day Consistency', ar: 'انتظام ٣٠ يوماً' }, earned: streak >= 30 },
    { id: 'morning100', label: { en: 'Morning Adhkār ×100', ar: 'أذكار الصباح ×١٠٠' }, earned: morningCount >= 100 },
    { id: 'evening100', label: { en: 'Evening Adhkār ×100', ar: 'أذكار المساء ×١٠٠' }, earned: eveningCount >= 100 },
    { id: 'scholar90', label: { en: 'Daily Adhkār Scholar', ar: 'عالم الأذكار اليومية' }, earned: distinctDays >= 90 },
    { id: 'family', label: { en: 'Family Adhkār Excellence', ar: 'تميّز الأسرة في الأذكار' }, earned: fullDays >= 30 },
  ];
  return list;
}

export async function onRequestGet({ request, env }) {
  const { session, sql, error } = await requireSession(request, env);
  if (error) return error;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const todayRes = await sql`SELECT period FROM adhkar_completions WHERE guardian_id = ${session.guardianId} AND completion_date = ${today}`;
    const todayPeriods = todayRes.rows.map((r) => r.period);

    const historyRes = await sql`
      SELECT completion_date, period FROM adhkar_completions
      WHERE guardian_id = ${session.guardianId}
      ORDER BY completion_date DESC LIMIT 2000`;

    const byDate = new Map();
    let morningCount = 0;
    let eveningCount = 0;
    for (const row of historyRes.rows) {
      const d = toDateStr(row.completion_date);
      if (!byDate.has(d)) byDate.set(d, new Set());
      byDate.get(d).add(row.period);
      if (row.period === 'morning') morningCount++;
      if (row.period === 'evening') eveningCount++;
    }
    const distinctDates = Array.from(byDate.keys());
    const fullDays = distinctDates.filter((d) => byDate.get(d).has('morning') && byDate.get(d).has('evening')).length;
    const streak = computeStreak(distinctDates);

    return json({
      today: { morning: todayPeriods.includes('morning'), evening: todayPeriods.includes('evening') },
      streak,
      windows: {
        last7: countWithinDays(distinctDates, 7),
        last30: countWithinDays(distinctDates, 30),
        last90: countWithinDays(distinctDates, 90),
      },
      totals: { morningCount, eveningCount, distinctDays: distinctDates.length, fullDays },
      achievements: buildAchievements(streak, morningCount, eveningCount, distinctDates.length, fullDays),
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
