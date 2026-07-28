import { getSql } from '../../_lib/db.js';
import {
  generateToken, verifyPassword, createSessionCookie,
  readGuardianTrustFromRequest, createGuardianTrustCookie,
} from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';
import { sendEmail, otpEmailContent, siteOriginFromRequest } from '../../_lib/email.js';
import { generateOtpCode, hashOtpCode, OTP_CODE_TTL_MINUTES } from '../../_lib/otp.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function logAttempt(sql, identifier, event, actorId) {
  try {
    await sql`INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event) VALUES ('guardian', ${actorId || null}, ${identifier}, ${event})`;
  } catch (err) {
    console.error('auth_audit_log insert failed', err);
  }
}

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
      SELECT id, password_hash, password_salt, full_name, failed_attempts, locked_until, trust_version
      FROM guardians WHERE email = ${email}`;
    const guardian = result.rows[0];

    // Same generic message whether the account doesn't exist or the
    // password is wrong — don't let login responses reveal which
    // emails are registered.
    const genericError = { error: 'Incorrect email or password.' };

    if (!guardian) {
      await logAttempt(sql, email, 'login_failed', null);
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
        await logAttempt(sql, email, 'lockout', guardian.id);
      } else {
        await sql`UPDATE guardians SET failed_attempts = ${nextAttempts} WHERE id = ${guardian.id}`;
        await logAttempt(sql, email, 'login_failed', guardian.id);
      }
      return json(genericError, 401);
    }

    await sql`UPDATE guardians SET failed_attempts = 0, locked_until = NULL WHERE id = ${guardian.id}`;

    // Risk-based OTP skip: a valid, version-matching trusted-device
    // cookie means this browser already completed OTP on this account
    // within the last 7 days (see session.js's makeTrustCookieFns and
    // docs/identity-authentication-roadmap.md). Refreshing the cookie
    // here — not just reading it — is what makes the 7-day window
    // slide forward with actual use, so an active guardian is never
    // interrupted, while 7+ days of inactivity naturally expires it.
    const trust = readGuardianTrustFromRequest(request, env.SESSION_SECRET);
    if (trust && trust.guardianId === guardian.id && trust.trustVersion === guardian.trust_version) {
      await logAttempt(sql, email, 'login_success_trusted_device', guardian.id);
      return json(
        { ok: true, fullName: guardian.full_name },
        200,
        {
          'Set-Cookie': [
            createSessionCookie(guardian.id, env.SESSION_SECRET),
            createGuardianTrustCookie(guardian.id, guardian.trust_version, env.SESSION_SECRET),
          ],
        }
      );
    }

    // Password verified — every guardian has an email on file (required
    // at registration/admin creation), so the email OTP step below
    // applies unconditionally, unlike student/staff logins which only
    // gate on OTP once an email exists for that particular account (see
    // student/login.js, staff/login.js). No session cookie is issued
    // yet; that happens in verify-otp.js once the code is confirmed.
    const loginToken = generateToken();
    const code = generateOtpCode();
    await sql`
      INSERT INTO login_otp_codes (actor_type, actor_id, login_token, code_hash, expires_at)
      VALUES ('guardian', ${guardian.id}, ${loginToken}, ${hashOtpCode(code)}, now() + make_interval(mins => ${OTP_CODE_TTL_MINUTES}))`;
    const magicLink = siteOriginFromRequest(request) + '/api/portal/verify-login-link?token=' + loginToken;
    const { subject, text, html } = otpEmailContent(code, magicLink);
    await sendEmail(env, { to: email, subject, text, html });
    await logAttempt(sql, email, 'otp_sent', guardian.id);

    return json({ otpRequired: true, loginToken, email });
  } catch (err) {
    console.error('portal login error', err);
    return json({ error: 'Could not sign in right now — please try again shortly.' }, 500);
  }
}
