// Public, unauthenticated RSVP counter for a single announcement/event —
// no name or contact info is collected, so this carries no privacy-
// request surface of its own (contrast with admissions-applications,
// which does collect PII and is gated behind a guardian session).
// The "have you already tapped it" guard against double-counting lives
// client-side (localStorage), the same trust level as the Adhkar family
// streak toggle elsewhere in this codebase — a school-scale event RSVP
// doesn't need fraud-grade defences, and adding a full account/session
// requirement here would make attendance-interest harder to express,
// not easier.
import { getSql } from '../../../_lib/db.js';
import { json, readJsonBody } from '../../../_lib/http.js';

export async function onRequestPost({ request, env }) {
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'No database is linked yet.' }, 500);
  }
  const body = await readJsonBody(request);
  const id = Number(body && body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return json({ error: 'A valid numeric id is required.' }, 400);
  }
  try {
    const updated = await sql`
      UPDATE announcements SET rsvp_count = rsvp_count + 1, updated_at = now()
      WHERE id = ${id} AND status = 'published'
      RETURNING rsvp_count`;
    if (!updated.rows.length) {
      return json({ error: 'No published announcement found with that id.' }, 404);
    }
    return json({ ok: true, rsvpCount: updated.rows[0].rsvp_count });
  } catch (err) {
    console.error('portal announcements rsvp error', err);
    return json({ error: 'Could not record RSVP: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
