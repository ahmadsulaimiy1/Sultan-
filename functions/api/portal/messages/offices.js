// Institutional Messaging — the list of offices a guardian can address a
// new enquiry to. Committees (office_kind = 'committee') are excluded —
// those are Board sub-bodies, not a front-office contact point for a
// parent.
import { getSql } from '../../../_lib/db.js';
import { readSessionFromRequest } from '../../../_lib/session.js';
import { json } from '../../../_lib/http.js';

export async function onRequestGet({ request, env }) {
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
    const res = await sql`
      SELECT id, name, slug, layer
      FROM offices
      WHERE office_kind = 'office'
      ORDER BY layer, name`;
    return json({ offices: res.rows.map((o) => ({ id: o.id, name: o.name, slug: o.slug, layer: o.layer })) });
  } catch (err) {
    console.error('messages offices list error', err);
    return json({ error: 'Could not load the office directory right now — please try again shortly.' }, 500);
  }
}
