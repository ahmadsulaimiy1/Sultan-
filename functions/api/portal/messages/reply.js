// Institutional Messaging — a guardian replying to an existing thread.
// Reopens a thread the office had marked "answered" (a new message from
// the family means the office hasn't actually finished responding).
import { getSql } from '../../../_lib/db.js';
import { readSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { idempotencyKey, replayed, remember } from '../../../_lib/offline-write.js';

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

  const key = idempotencyKey(request);

  try {
    // A reply is the operation that most needs this. A parent writes it on a
    // phone with no signal; the phone retries when the signal returns and
    // cannot tell a lost response from a lost request. Without the guard, the
    // office reads the same message twice and the parent looks anxious.
    const prior = await replayed(sql, key, 'guardian', session.guardianId);
    if (prior) return json(prior.body, prior.status);

    const threadRes = await sql`SELECT id, status FROM message_threads WHERE id = ${threadId} AND guardian_id = ${session.guardianId}`;
    if (!threadRes.rows.length) return json({ error: 'That message thread could not be found.' }, 404);
    if (threadRes.rows[0].status === 'closed') {
      const closed = { error: 'This thread has been closed by the office. Please start a new message if you still need help.' };
      // Recorded too. A queued reply to a thread the office closed on Wednesday
      // is terminal, and retrying it four times to be told the same thing four
      // times helps nobody.
      await remember(sql, key, 'guardian', session.guardianId, 'message.reply', 409, closed);
      return json(closed, 409);
    }

    await sql`INSERT INTO thread_messages (thread_id, sender_type, sender_guardian_id, body) VALUES (${threadId}, 'guardian', ${session.guardianId}, ${messageBody})`;
    await sql`UPDATE message_threads SET status = 'open', updated_at = now(), last_message_at = now() WHERE id = ${threadId}`;

    // The window between the insert above and this record is the one place a
    // duplicate could still appear, and it is narrow: it needs the request to
    // die between two statements against the same database. Closing it fully
    // needs both in one transaction, which the current sql helper does not
    // expose. Recorded here rather than left as an unexamined assumption.
    const okBody = { ok: true };
    await remember(sql, key, 'guardian', session.guardianId, 'message.reply', 200, okBody);
    return json(okBody);
  } catch (err) {
    console.error('messages reply error', err);
    return json({ error: 'Could not send that reply right now — please try again shortly.' }, 500);
  }
}
