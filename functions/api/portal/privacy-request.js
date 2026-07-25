// Personalisation Centre — Security & Privacy tab: "Privacy & Data
// Requests". Deliberately public (no portal session required) — someone
// asking about their data, or a former guardian requesting deletion, may
// not have (or want) portal access. Reviewed and actioned by staff
// directly against the database, the same admin-mediated pattern as
// password resets (see docs/parent-portal.md) — this endpoint only
// records the request, it doesn't action it automatically.
import { getSql } from '../../_lib/db.js';
import { json, readJsonBody } from '../../_lib/http.js';

const VALID_TYPES = ['access', 'correction', 'deletion', 'other'];

export async function onRequestPost({ request, env }) {
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'This request could not be recorded right now — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  const fullName = ((body && body.fullName) || '').trim();
  const email = ((body && body.email) || '').trim().toLowerCase();
  const requestType = (body && body.requestType) || 'other';
  const details = ((body && body.details) || '').trim().slice(0, 4000);

  if (!fullName || !email) {
    return json({ error: 'fullName and email are required.' }, 400);
  }
  if (!VALID_TYPES.includes(requestType)) {
    return json({ error: 'requestType must be one of: ' + VALID_TYPES.join(', ') }, 400);
  }

  try {
    await sql`
      INSERT INTO privacy_requests (full_name, email, request_type, details)
      VALUES (${fullName}, ${email}, ${requestType}, ${details || null})`;
    return json({ ok: true });
  } catch (err) {
    console.error('privacy request error', err);
    return json({ error: 'Could not record your request right now — please try again, or contact the school directly.' }, 500);
  }
}
