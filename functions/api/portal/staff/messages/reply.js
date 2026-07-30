// Institutional Messaging (staff side) — reply to a family's thread.
// Marks the thread 'answered' unless the staff member explicitly closes
// it (status: 'closed' in the body), matching how the Registrar's Office
// UI already treats explicit staff-driven status changes.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { staffCanActOnOffice } from '../../../../_lib/office-access.js';

export async function onRequestPost({ request, env }) {
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

  const body = await readJsonBody(request);
  const threadId = Number(body && body.threadId);
  const messageBody = ((body && body.body) || '').trim();
  const closeThread = !!(body && body.close);
  if (!Number.isInteger(threadId)) return json({ error: 'A valid thread id is required.' }, 400);
  if (!messageBody && !closeThread) return json({ error: 'A message body is required.' }, 400);
  if (messageBody.length > 8000) return json({ error: 'Message is too long (8,000 characters max).' }, 400);

  try {
    const threadRes = await sql`SELECT id, office_id, status FROM message_threads WHERE id = ${threadId}`;
    if (!threadRes.rows.length) return json({ error: 'That message thread could not be found.' }, 404);

    const canAct = await staffCanActOnOffice(sql, session.staffId, threadRes.rows[0].office_id);
    if (!canAct) return json({ error: 'You do not currently hold this office, so you cannot reply on its behalf.' }, 403);

    if (messageBody) {
      await sql`INSERT INTO thread_messages (thread_id, sender_type, sender_staff_id, body) VALUES (${threadId}, 'staff', ${session.staffId}, ${messageBody})`;
    }
    const newStatus = closeThread ? 'closed' : 'answered';
    await sql`UPDATE message_threads SET status = ${newStatus}, updated_at = now(), last_message_at = now() WHERE id = ${threadId}`;

    return json({ ok: true, status: newStatus });
  } catch (err) {
    console.error('staff messages reply error', err);
    return json({ error: 'Could not send that reply right now — please try again shortly.' }, 500);
  }
}
