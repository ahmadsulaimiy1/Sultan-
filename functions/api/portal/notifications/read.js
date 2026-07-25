import { getSql } from '../../../_lib/db.js';
import { readSessionFromRequest } from '../../../_lib/session.js';
import { json } from '../../../_lib/http.js';

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }

  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  if (!session) {
    return json({ error: 'Not signed in.' }, 401);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  try {
    await sql`
      UPDATE notifications SET read_at = now()
      WHERE guardian_id = ${session.guardianId} AND read_at IS NULL`;
    return json({ ok: true });
  } catch (err) {
    console.error('portal notifications read error', err);
    return json({ error: 'Could not update notifications right now.' }, 500);
  }
}
