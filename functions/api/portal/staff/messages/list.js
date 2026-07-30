// Institutional Messaging — the inbox for every office this staff member
// currently holds (by real appointment or a role/delegation grant scoped
// to that office). Optional `?officeId=` narrows to one office, matching
// the Office Switcher's "you may hold more than one office" model.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';
import { staffOfficeIds } from '../../../../_lib/office-access.js';

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

  try {
    const officeIds = await staffOfficeIds(sql, session.staffId);
    if (!officeIds.length) {
      return json({ threads: [], offices: [] });
    }

    const url = new URL(request.url);
    const officeIdParam = Number(url.searchParams.get('officeId'));
    const scopedIds = Number.isInteger(officeIdParam) && officeIds.includes(officeIdParam) ? [officeIdParam] : officeIds;

    const res = await sql`
      SELECT t.id, t.subject, t.status, t.created_at, t.last_message_at,
             o.id AS office_id, o.name AS office_name,
             g.full_name AS guardian_name,
             (SELECT count(*) FROM thread_messages m WHERE m.thread_id = t.id) AS message_count,
             (SELECT body FROM thread_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_body,
             (SELECT sender_type FROM thread_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender_type
      FROM message_threads t
      JOIN offices o ON o.id = t.office_id
      JOIN guardians g ON g.id = t.guardian_id
      WHERE t.office_id = ANY(${scopedIds})
      ORDER BY t.last_message_at DESC`;

    const officesRes = await sql`SELECT id, name FROM offices WHERE id = ANY(${officeIds}) ORDER BY name`;

    return json({
      threads: res.rows.map((t) => ({
        id: t.id, subject: t.subject, status: t.status, createdAt: t.created_at, lastMessageAt: t.last_message_at,
        officeId: t.office_id, officeName: t.office_name, guardianName: t.guardian_name,
        messageCount: Number(t.message_count), lastBody: t.last_body, lastSenderType: t.last_sender_type,
        needsReply: t.last_sender_type === 'guardian',
      })),
      offices: officesRes.rows.map((o) => ({ id: o.id, name: o.name })),
    });
  } catch (err) {
    console.error('staff messages list error', err);
    return json({ error: 'Could not load messages right now — please try again shortly.' }, 500);
  }
}
