// Completes the email-verification half of registration (see
// register.js's header comment for why this isn't a login gate). Also
// signs the guardian in — a real possibility here is clicking the
// verification link from a different device/browser than the one used
// to register (e.g. registering on a laptop, opening the confirmation
// email on a phone), so this should leave them signed in either way.
import { getSql } from '../../_lib/db.js';
import { createSessionCookie } from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  const token = (body && body.token) || '';
  if (!token) {
    return json({ error: 'Missing verification token.' }, 400);
  }

  try {
    const result = await sql`SELECT id, verification_token_expires, full_name FROM guardians WHERE verification_token = ${token}`;
    const guardian = result.rows[0];
    if (!guardian) {
      return json({ error: 'This verification link is invalid or has already been used.' }, 400);
    }
    if (!guardian.verification_token_expires || new Date(guardian.verification_token_expires).getTime() < Date.now()) {
      return json({ error: 'This verification link has expired. Sign in and ask for a new one from your account page.' }, 400);
    }

    await sql`
      UPDATE guardians SET email_verified_at = now(), verification_token = NULL, verification_token_expires = NULL
      WHERE id = ${guardian.id}`;
    await sql`INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event) VALUES ('guardian', ${guardian.id}, NULL, 'email_verified')`;

    return json(
      { ok: true, fullName: guardian.full_name },
      200,
      { 'Set-Cookie': createSessionCookie(guardian.id, env.SESSION_SECRET) }
    );
  } catch (err) {
    console.error('portal verify error', err);
    return json({ error: 'Could not verify your account right now — please try again shortly.' }, 500);
  }
}
