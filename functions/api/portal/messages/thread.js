// Institutional Messaging — full detail of one of the guardian's own
// threads: every message, oldest first.
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

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id)) return json({ error: 'A valid thread id is required.' }, 400);

  try {
    const threadRes = await sql`
      SELECT t.id, t.subject, t.status, t.created_at, o.name AS office_name, o.slug AS office_slug
      FROM message_threads t
      JOIN offices o ON o.id = t.office_id
      WHERE t.id = ${id} AND t.guardian_id = ${session.guardianId}`;
    const thread = threadRes.rows[0];
    if (!thread) return json({ error: 'That message thread could not be found.' }, 404);

    const messagesRes = await sql`
      SELECT m.id, m.sender_type, m.body, m.created_at,
             s.full_name AS staff_name
      FROM thread_messages m
      LEFT JOIN staff s ON s.id = m.sender_staff_id
      WHERE m.thread_id = ${id}
      ORDER BY m.created_at ASC`;

    return json({
      thread: { id: thread.id, subject: thread.subject, status: thread.status, createdAt: thread.created_at, officeName: thread.office_name, officeSlug: thread.office_slug },
      messages: messagesRes.rows.map((m) => ({
        id: m.id, senderType: m.sender_type, body: m.body, createdAt: m.created_at,
        staffName: m.staff_name || null,
      })),
    });
  } catch (err) {
    console.error('messages thread detail error', err);
    return json({ error: 'Could not load that message thread right now — please try again shortly.' }, 500);
  }
}
