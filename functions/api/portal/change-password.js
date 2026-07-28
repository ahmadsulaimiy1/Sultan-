// Personalisation Centre — Security & Privacy tab: change password while
// signed in. Distinct from set-password.js (which activates an account or
// completes a staff-mediated reset via a one-time token) — this requires
// the guardian's *current* password, standard re-authentication practice
// for a self-service change, and works purely off the existing session.
import { getSql } from '../../_lib/db.js';
import { readSessionFromRequest, verifyPassword, hashPassword, isPasswordStrongEnough, MIN_PASSWORD_LENGTH } from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
  } catch {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  if (!session) {
    return json({ error: 'Not signed in.' }, 401);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  const currentPassword = (body && body.currentPassword) || '';
  const newPassword = (body && body.newPassword) || '';
  if (!currentPassword || !newPassword) {
    return json({ error: 'currentPassword and newPassword are required.' }, 400);
  }
  if (!isPasswordStrongEnough(newPassword)) {
    return json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, 400);
  }

  try {
    const result = await sql`SELECT password_hash, password_salt FROM guardians WHERE id = ${session.guardianId}`;
    const guardian = result.rows[0];
    if (!guardian || !guardian.password_hash || !guardian.password_salt) {
      return json({ error: 'Account not found.' }, 404);
    }
    if (!verifyPassword(currentPassword, guardian.password_hash, guardian.password_salt)) {
      return json({ error: 'Current password is incorrect.' }, 401);
    }

    const { hash, salt } = hashPassword(newPassword);
    // trust_version + 1 invalidates every previously-issued trusted-
    // device cookie for this account — a password change is exactly
    // the security event that should force a fresh OTP on next login.
    await sql`UPDATE guardians SET password_hash = ${hash}, password_salt = ${salt}, trust_version = trust_version + 1 WHERE id = ${session.guardianId}`;
    return json({ ok: true });
  } catch (err) {
    console.error('portal change-password error', err);
    return json({ error: 'Could not change your password right now.' }, 500);
  }
}
