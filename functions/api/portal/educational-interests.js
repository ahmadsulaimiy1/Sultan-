// Educational Interests (Phase 1A) — multi-select against the fixed
// set in functions/_lib/educational-interests.js. GET lists the signed-
// in guardian's current selections; POST replaces the full set in one
// call (simpler and safer than incremental add/remove for a small,
// fixed-size checkbox list the frontend always submits as a whole).
import { getSql } from '../../_lib/db.js';
import { readSessionFromRequest } from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';
import { EDUCATIONAL_INTEREST_OPTIONS, isValidEducationalInterestKey } from '../../_lib/educational-interests.js';

async function requireSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { guardianId: session.guardianId };
}

export async function onRequestGet({ request, env }) {
  const { guardianId, error } = await requireSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  try {
    const res = await sql`SELECT institution_key FROM guardian_educational_interests WHERE guardian_id = ${guardianId}`;
    return json({ options: EDUCATIONAL_INTEREST_OPTIONS, selected: res.rows.map((r) => r.institution_key) });
  } catch (err) {
    console.error('educational-interests get error', err);
    return json({ error: 'Could not load your educational interests right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { guardianId, error } = await requireSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  const keys = Array.isArray(body && body.keys) ? body.keys : [];
  const invalid = keys.filter((k) => !isValidEducationalInterestKey(k));
  if (invalid.length) {
    return json({ error: `Unrecognised educational interest(s): ${invalid.join(', ')}.` }, 400);
  }

  try {
    await sql`DELETE FROM guardian_educational_interests WHERE guardian_id = ${guardianId}`;
    for (const key of keys) {
      await sql`INSERT INTO guardian_educational_interests (guardian_id, institution_key) VALUES (${guardianId}, ${key}) ON CONFLICT DO NOTHING`;
    }
    return json({ ok: true, selected: keys });
  } catch (err) {
    console.error('educational-interests save error', err);
    return json({ error: 'Could not save your educational interests right now — please try again shortly.' }, 500);
  }
}
