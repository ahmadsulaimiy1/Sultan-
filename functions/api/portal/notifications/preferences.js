// Personalisation Centre — Notifications tab, for signed-in guardians
// only (there's nothing to notify an anonymous visitor about). Reads and
// writes guardian_notification_preferences. Only the "website" channel
// actually delivers anything today (see notifications/read.js); saving a
// preference for email/whatsapp/sms just opts the family in ahead of
// those channels existing — the client is responsible for labelling them
// "coming soon", this endpoint doesn't lie about it either way.
import { getSql } from '../../../_lib/db.js';
import { readSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';

const BOOL_FIELDS = [
  'channel_website', 'channel_email', 'channel_whatsapp', 'channel_sms', 'channel_push',
  'type_attendance', 'type_results', 'type_fees', 'type_announcements', 'type_events', 'type_emergency',
];

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

export async function onRequestGet({ request, env }) {
  const { session, sql, error } = await requireSession(request, env);
  if (error) return error;

  try {
    const existing = await sql`SELECT * FROM guardian_notification_preferences WHERE guardian_id = ${session.guardianId}`;
    if (existing.rows.length) {
      const row = existing.rows[0];
      return json({ preferences: row });
    }
    // No row yet — return the schema defaults without writing anything,
    // so opening the panel never has a side effect.
    return json({
      preferences: {
        channel_website: true, channel_email: false, channel_whatsapp: false, channel_sms: false, channel_push: false,
        type_attendance: true, type_results: true, type_fees: true,
        type_announcements: true, type_events: true, type_emergency: true,
        language: 'en',
      },
    });
  } catch (err) {
    console.error('notification preferences GET error', err);
    return json({ error: 'Could not load notification preferences right now.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { session, sql, error } = await requireSession(request, env);
  if (error) return error;

  const body = await readJsonBody(request);
  const values = {};
  for (const field of BOOL_FIELDS) values[field] = !!(body && body[field]);
  const language = (body && body.language) || 'en';

  try {
    await sql`
      INSERT INTO guardian_notification_preferences (
        guardian_id, channel_website, channel_email, channel_whatsapp, channel_sms, channel_push,
        type_attendance, type_results, type_fees, type_announcements, type_events, type_emergency,
        language, updated_at
      ) VALUES (
        ${session.guardianId}, ${values.channel_website}, ${values.channel_email}, ${values.channel_whatsapp}, ${values.channel_sms}, ${values.channel_push},
        ${values.type_attendance}, ${values.type_results}, ${values.type_fees}, ${values.type_announcements}, ${values.type_events}, ${values.type_emergency},
        ${language}, now()
      )
      ON CONFLICT (guardian_id) DO UPDATE SET
        channel_website = EXCLUDED.channel_website, channel_email = EXCLUDED.channel_email,
        channel_whatsapp = EXCLUDED.channel_whatsapp, channel_sms = EXCLUDED.channel_sms, channel_push = EXCLUDED.channel_push,
        type_attendance = EXCLUDED.type_attendance, type_results = EXCLUDED.type_results,
        type_fees = EXCLUDED.type_fees, type_announcements = EXCLUDED.type_announcements,
        type_events = EXCLUDED.type_events, type_emergency = EXCLUDED.type_emergency,
        language = EXCLUDED.language, updated_at = now()`;
    return json({ ok: true });
  } catch (err) {
    console.error('notification preferences POST error', err);
    return json({ error: 'Could not save notification preferences right now.' }, 500);
  }
}
