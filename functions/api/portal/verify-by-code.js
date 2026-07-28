// The code half of dual-method email verification — see verify.js for
// the link half. Both prove the same thing (the recipient controls the
// inbox the verification email went to) so either one independently
// completes verification; using one doesn't invalidate the other until
// verification actually succeeds. Keyed by email (not a bearer token,
// since a typed code needs an account to check it against) — the
// generic-error discipline below matches login.js's pattern so this
// can't be used to enumerate which emails have accounts.
import { getSql } from '../../_lib/db.js';
import { createSessionCookie } from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';
import { verifyOtpCode, OTP_MAX_ATTEMPTS } from '../../_lib/otp.js';

const GENERIC_ERROR = { error: 'That code is incorrect, expired, or already used. You can also use the verification link in the same email instead.' };

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  const email = ((body && body.email) || '').trim().toLowerCase();
  const code = ((body && body.code) || '').trim();
  if (!email || !code) {
    return json({ error: 'Email and code are required.' }, 400);
  }

  try {
    const result = await sql`
      SELECT id, full_name, verification_code_hash, verification_code_attempts, verification_token_expires, email_verified_at
      FROM guardians WHERE email = ${email}`;
    const guardian = result.rows[0];

    if (!guardian || guardian.email_verified_at) {
      return json(GENERIC_ERROR, 400);
    }
    if (!guardian.verification_code_hash || !guardian.verification_token_expires || new Date(guardian.verification_token_expires).getTime() < Date.now()) {
      return json(GENERIC_ERROR, 400);
    }
    if (guardian.verification_code_attempts >= OTP_MAX_ATTEMPTS) {
      return json(GENERIC_ERROR, 400);
    }

    if (!verifyOtpCode(code, guardian.verification_code_hash)) {
      const nextAttempts = guardian.verification_code_attempts + 1;
      const exhausted = nextAttempts >= OTP_MAX_ATTEMPTS;
      if (exhausted) {
        // Only the code is retired — the verification LINK in the same
        // email keeps working, so exhausting code attempts doesn't
        // strand someone with no way to verify (the whole point of
        // offering both methods).
        await sql`UPDATE guardians SET verification_code_attempts = ${nextAttempts}, verification_code_hash = NULL WHERE id = ${guardian.id}`;
      } else {
        await sql`UPDATE guardians SET verification_code_attempts = ${nextAttempts} WHERE id = ${guardian.id}`;
      }
      const remaining = OTP_MAX_ATTEMPTS - nextAttempts;
      return json({ error: remaining > 0 ? `Incorrect code — ${remaining} attempt(s) left. You can also use the verification link in the same email.` : 'Incorrect code too many times — please use the verification link in the same email, or ask for a new one.' }, 400);
    }

    await sql`
      UPDATE guardians SET
        email_verified_at = now(), verification_token = NULL, verification_token_expires = NULL,
        verification_code_hash = NULL, verification_code_attempts = 0
      WHERE id = ${guardian.id}`;
    await sql`INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event) VALUES ('guardian', ${guardian.id}, NULL, 'email_verified')`;

    return json(
      { ok: true, fullName: guardian.full_name },
      200,
      { 'Set-Cookie': createSessionCookie(guardian.id, env.SESSION_SECRET) }
    );
  } catch (err) {
    console.error('portal verify-by-code error', err);
    return json({ error: 'Could not verify your account right now — please try again shortly.' }, 500);
  }
}
