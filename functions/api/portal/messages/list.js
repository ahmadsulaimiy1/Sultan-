// Institutional Messaging — a guardian's own threads, newest activity
// first. Separate, real correspondence with a named office; not the AI
// Assistant widget.
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
      SELECT t.id, t.subject, t.status, t.created_at, t.last_message_at,
             o.name AS office_name, o.slug AS office_slug,
             (SELECT count(*) FROM thread_messages m WHERE m.thread_id = t.id) AS message_count,
             (SELECT body FROM thread_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_body
      FROM message_threads t
      JOIN offices o ON o.id = t.office_id
      WHERE t.guardian_id = ${session.guardianId}
      ORDER BY t.last_message_at DESC`;
    return json({
      threads: res.rows.map((t) => ({
        id: t.id, subject: t.subject, status: t.status, createdAt: t.created_at, lastMessageAt: t.last_message_at,
        officeName: t.office_name, officeSlug: t.office_slug, messageCount: Number(t.message_count),
        lastBody: t.last_body,
      })),
    });
  } catch (err) {
    console.error('messages list error', err);
    return json({ error: 'Could not load your messages right now — please try again shortly.' }, 500);
  }
}
