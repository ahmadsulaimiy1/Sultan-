// Stores/removes one browser's PushSubscription for the signed-in
// guardian. One row per device (see push_subscriptions' schema comment)
// — POST upserts by endpoint (a resubscribe from the same browser just
// refreshes the keys/last_seen_at), DELETE removes it when the guardian
// turns push off on that device. Both also touch
// guardian_notification_preferences.channel_push as the family-level
// "push is wanted" signal the admin announcements publish flow checks —
// an intentional simplification (see js/personalisation.js): it doesn't
// distinguish "push works on 2 of my 3 devices," it just reflects
// whether this browser, right now, is (or isn't) subscribed.
import { getSql } from '../../_lib/db.js';
import { readSessionFromRequest } from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';

async function requireSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
  } catch {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  const sql = getSql(env);
  if (!sql) return { error: json({ error: 'Portal is not configured yet — no database is linked.' }, 500) };
  return { session, sql };
}

export async function onRequestPost({ request, env }) {
  const { session, sql, error } = await requireSession(request, env);
  if (error) return error;

  const body = await readJsonBody(request);
  const sub = body && body.subscription;
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
    return json({ error: 'A valid PushSubscription (endpoint + keys.p256dh + keys.auth) is required.' }, 400);
  }

  try {
    await sql`
      INSERT INTO push_subscriptions (guardian_id, endpoint, p256dh, auth, user_agent)
      VALUES (${session.guardianId}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth}, ${request.headers.get('user-agent') || null})
      ON CONFLICT (endpoint) DO UPDATE SET
        guardian_id = EXCLUDED.guardian_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent, last_seen_at = now()`;
    await sql`
      INSERT INTO guardian_notification_preferences (guardian_id, channel_push, updated_at)
      VALUES (${session.guardianId}, true, now())
      ON CONFLICT (guardian_id) DO UPDATE SET channel_push = true, updated_at = now()`;
    return json({ ok: true });
  } catch (err) {
    console.error('push subscribe error', err);
    return json({ error: 'Could not save that push subscription right now.' }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  const { session, sql, error } = await requireSession(request, env);
  if (error) return error;

  const body = await readJsonBody(request);
  const endpoint = body && body.endpoint;
  if (!endpoint) {
    return json({ error: 'endpoint is required.' }, 400);
  }

  try {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint} AND guardian_id = ${session.guardianId}`;
    const remaining = await sql`SELECT id FROM push_subscriptions WHERE guardian_id = ${session.guardianId} LIMIT 1`;
    if (!remaining.rows.length) {
      await sql`UPDATE guardian_notification_preferences SET channel_push = false, updated_at = now() WHERE guardian_id = ${session.guardianId}`;
    }
    return json({ ok: true });
  } catch (err) {
    console.error('push unsubscribe error', err);
    return json({ error: 'Could not remove that push subscription right now.' }, 500);
  }
}
