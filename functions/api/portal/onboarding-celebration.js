// Institutional Onboarding Wizard — marks the 100%-completion
// celebration screen as shown, so it fires exactly once per guardian
// rather than replaying on every subsequent login. Idempotent: calling
// this after it's already set is a harmless no-op (WHERE clause only
// updates a NULL timestamp).
import { getSql } from '../../_lib/db.js';
import { readSessionFromRequest } from '../../_lib/session.js';
import { json } from '../../_lib/http.js';

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) return json({ error: 'Portal is not configured yet.' }, 500);
  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  if (!session) return json({ error: 'Not signed in.' }, 401);

  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  try {
    await sql`
      UPDATE guardians SET onboarding_celebration_shown_at = now()
      WHERE id = ${session.guardianId} AND onboarding_celebration_shown_at IS NULL`;
    return json({ ok: true });
  } catch (err) {
    console.error('onboarding-celebration mark-shown error', err);
    return json({ error: 'Could not save that right now — please try again shortly.' }, 500);
  }
}
