// Institutional Messaging (staff side) — full detail of a thread
// belonging to an office this staff member currently holds.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';
import { staffCanActOnOffice } from '../../../../_lib/office-access.js';

export async function onRequestGet({ request, env }) {
  if (!env.SESSION_SECRET) return json({ error: 'Portal is not configured yet.' }, 500);
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
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
      SELECT t.id, t.subject, t.status, t.created_at, t.office_id,
             o.name AS office_name, g.full_name AS guardian_name, g.email AS guardian_email
      FROM message_threads t
      JOIN offices o ON o.id = t.office_id
      JOIN guardians g ON g.id = t.guardian_id
      WHERE t.id = ${id}`;
    const thread = threadRes.rows[0];
    if (!thread) return json({ error: 'That message thread could not be found.' }, 404);

    const canAct = await staffCanActOnOffice(sql, session.staffId, thread.office_id);
    if (!canAct) return json({ error: 'You do not currently hold this office, so you cannot view its messages.' }, 403);

    const messagesRes = await sql`
      SELECT m.id, m.sender_type, m.body, m.created_at, s.full_name AS staff_name
      FROM thread_messages m
      LEFT JOIN staff s ON s.id = m.sender_staff_id
      WHERE m.thread_id = ${id}
      ORDER BY m.created_at ASC`;

    return json({
      thread: {
        id: thread.id, subject: thread.subject, status: thread.status, createdAt: thread.created_at,
        officeName: thread.office_name, guardianName: thread.guardian_name, guardianEmail: thread.guardian_email,
      },
      messages: messagesRes.rows.map((m) => ({
        id: m.id, senderType: m.sender_type, body: m.body, createdAt: m.created_at, staffName: m.staff_name || null,
      })),
    });
  } catch (err) {
    console.error('staff messages thread detail error', err);
    return json({ error: 'Could not load that message thread right now — please try again shortly.' }, 500);
  }
}
