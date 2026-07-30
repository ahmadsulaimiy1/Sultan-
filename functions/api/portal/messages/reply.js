// Institutional Messaging — a guardian replying to an existing thread.
// Reopens a thread the office had marked "answered" (a new message from
// the family means the office hasn't actually finished responding).
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
  const threadId = Number(body && body.threadId);
  const messageBody = ((body && body.body) || '').trim();
  if (!Number.isInteger(threadId)) return json({ error: 'A valid thread id is required.' }, 400);
  if (!messageBody) return json({ error: 'A message body is required.' }, 400);
  if (messageBody.length > 8000) return json({ error: 'Message is too long (8,000 characters max).' }, 400);

  try {
    const threadRes = await sql`SELECT id, status FROM message_threads WHERE id = ${threadId} AND guardian_id = ${session.guardianId}`;
    if (!threadRes.rows.length) return json({ error: 'That message thread could not be found.' }, 404);
    if (threadRes.rows[0].status === 'closed') {
      return json({ error: 'This thread has been closed by the office. Please start a new message if you still need help.' }, 409);
    }

    await sql`INSERT INTO thread_messages (thread_id, sender_type, sender_guardian_id, body) VALUES (${threadId}, 'guardian', ${session.guardianId}, ${messageBody})`;
    await sql`UPDATE message_threads SET status = 'open', updated_at = now(), last_message_at = now() WHERE id = ${threadId}`;

    return json({ ok: true });
  } catch (err) {
    console.error('messages reply error', err);
    return json({ error: 'Could not send that reply right now — please try again shortly.' }, 500);
  }
}
