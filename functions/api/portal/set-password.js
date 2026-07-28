// Public but capability-gated: the reset_token itself is the secret
// (24 random bytes, effectively unguessable), not a session or admin
// credential. Used both for first-time account activation and for
// staff-mediated password resets (see functions/api/portal/admin/reset-password.js)
// — same token, same flow either way.
import { getSql } from '../../_lib/db.js';
import { createSessionCookie, hashPassword, isPasswordStrongEnough, MIN_PASSWORD_LENGTH } from '../../_lib/session.js';
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
  const password = (body && body.password) || '';
  if (!token) {
    return json({ error: 'Missing activation token.' }, 400);
  }
  if (!isPasswordStrongEnough(password)) {
    return json({ error: `Please choose a password at least ${MIN_PASSWORD_LENGTH} characters long.` }, 400);
  }

  try {
    const result = await sql`
      SELECT id, reset_token_expires FROM guardians WHERE reset_token = ${token}`;
    const guardian = result.rows[0];
    if (!guardian) {
      return json({ error: 'This activation link is invalid. Ask the school to send you a new one.' }, 400);
    }
    if (!guardian.reset_token_expires || new Date(guardian.reset_token_expires).getTime() < Date.now()) {
      return json({ error: 'This activation link has expired. Ask the school to send you a new one.' }, 400);
    }

    const { hash, salt } = hashPassword(password);
    // trust_version + 1 invalidates every previously-issued
    // trusted-device cookie for this account (see session.js) — a
    // password change/reset is exactly the security event that should
    // force a fresh OTP on next login, not leave old trust standing.
    await sql`
      UPDATE guardians SET
        password_hash = ${hash}, password_salt = ${salt},
        reset_token = NULL, reset_token_expires = NULL,
        failed_attempts = 0, locked_until = NULL, trust_version = trust_version + 1
      WHERE id = ${guardian.id}`;

    return json(
      { ok: true },
      200,
      { 'Set-Cookie': createSessionCookie(guardian.id, env.SESSION_SECRET) }
    );
  } catch (err) {
    console.error('portal set-password error', err);
    return json({ error: 'Could not set your password right now — please try again shortly.' }, 500);
  }
}
