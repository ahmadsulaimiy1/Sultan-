import { getSql } from '../../_lib/db.js';
import { createSessionCookie, verifyPassword } from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet — an administrator needs to set SESSION_SECRET.' }, 500);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  const email = ((body && body.email) || '').trim().toLowerCase();
  const password = (body && body.password) || '';
  if (!email || !password) {
    return json({ error: 'Email and password are required.' }, 400);
  }

  try {
    const result = await sql`
      SELECT id, password_hash, password_salt, full_name, failed_attempts, locked_until
      FROM guardians WHERE email = ${email}`;
    const guardian = result.rows[0];

    // Same generic message whether the account doesn't exist or the
    // password is wrong — don't let login responses reveal which
    // emails are registered.
    const genericError = { error: 'Incorrect email or password.' };

    if (!guardian) {
      return json(genericError, 401);
    }

    if (guardian.locked_until && new Date(guardian.locked_until).getTime() > Date.now()) {
      const minutesLeft = Math.max(1, Math.ceil((new Date(guardian.locked_until).getTime() - Date.now()) / 60000));
      return json({ error: `Too many failed attempts — please try again in about ${minutesLeft} minute(s).` }, 429);
    }

    if (!guardian.password_hash || !guardian.password_salt) {
      return json({ error: 'This account hasn\'t been activated yet — check for an activation link, or contact the school.' }, 401);
    }

    if (!verifyPassword(password, guardian.password_hash, guardian.password_salt)) {
      const nextAttempts = (guardian.failed_attempts || 0) + 1;
      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        await sql`
          UPDATE guardians SET failed_attempts = 0, locked_until = now() + make_interval(mins => ${LOCKOUT_MINUTES})
          WHERE id = ${guardian.id}`;
      } else {
        await sql`UPDATE guardians SET failed_attempts = ${nextAttempts} WHERE id = ${guardian.id}`;
      }
      return json(genericError, 401);
    }

    await sql`UPDATE guardians SET failed_attempts = 0, locked_until = NULL WHERE id = ${guardian.id}`;
    return json(
      { ok: true, fullName: guardian.full_name },
      200,
      { 'Set-Cookie': createSessionCookie(guardian.id, env.SESSION_SECRET) }
    );
  } catch (err) {
    console.error('portal login error', err);
    return json({ error: 'Could not sign in right now — please try again shortly.' }, 500);
  }
}
