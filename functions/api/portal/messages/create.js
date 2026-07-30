// Institutional Messaging — a guardian opening a new thread with a
// specific office. Creates the thread and its first message in one call.
import { getSql } from '../../../_lib/db.js';
import { readSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';

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

  const body = await readJsonBody(request);
  const officeId = Number(body && body.officeId);
  const subject = ((body && body.subject) || '').trim();
  const messageBody = ((body && body.body) || '').trim();

  if (!Number.isInteger(officeId) || officeId <= 0) {
    return json({ error: 'Please choose an office to write to.' }, 400);
  }
  if (!subject) return json({ error: 'A subject is required.' }, 400);
  if (!messageBody) return json({ error: 'A message body is required.' }, 400);
  if (subject.length > 200) return json({ error: 'Subject is too long (200 characters max).' }, 400);
  if (messageBody.length > 8000) return json({ error: 'Message is too long (8,000 characters max).' }, 400);

  try {
    const officeRes = await sql`SELECT id, name FROM offices WHERE id = ${officeId} AND office_kind = 'office'`;
    if (!officeRes.rows.length) {
      return json({ error: 'That office could not be found.' }, 404);
    }

    const threadRes = await sql`
      INSERT INTO message_threads (guardian_id, office_id, subject)
      VALUES (${session.guardianId}, ${officeId}, ${subject})
      RETURNING id, created_at`;
    const threadId = threadRes.rows[0].id;

    await sql`
      INSERT INTO thread_messages (thread_id, sender_type, sender_guardian_id, body)
      VALUES (${threadId}, 'guardian', ${session.guardianId}, ${messageBody})`;

    return json({ ok: true, threadId, officeName: officeRes.rows[0].name });
  } catch (err) {
    console.error('messages create error', err);
    return json({ error: 'Could not send that message right now — please try again shortly.' }, 500);
  }
}
