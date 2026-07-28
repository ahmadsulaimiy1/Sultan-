// Shared second step for all three login flows (guardian, student,
// staff) — one endpoint because the "password verified, now enter the
// emailed code" flow is identical regardless of role. Which cookie to
// issue is read from the login_otp_codes row itself (actor_type),
// never from anything the client claims, so a caller can't request a
// staff cookie for a guardian's OTP session.
import { getSql } from '../../_lib/db.js';
import {
  createSessionCookie, createStudentSessionCookie, createStaffSessionCookie,
  createGuardianTrustCookie, createStudentTrustCookie, createStaffTrustCookie,
} from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';
import { verifyOtpCode, OTP_MAX_ATTEMPTS } from '../../_lib/otp.js';

const GENERIC_ERROR = { error: 'This code has expired or is invalid — please sign in again.' };

async function actorLookup(sql, actorType, actorId) {
  if (actorType === 'guardian') {
    const r = await sql`SELECT full_name, email AS identifier, trust_version FROM guardians WHERE id = ${actorId}`;
    return r.rows[0] || null;
  }
  if (actorType === 'student') {
    const r = await sql`SELECT full_name, admission_no AS identifier, trust_version FROM students WHERE id = ${actorId}`;
    return r.rows[0] || null;
  }
  if (actorType === 'staff') {
    const r = await sql`SELECT full_name, staff_no AS identifier, trust_version FROM staff WHERE id = ${actorId}`;
    return r.rows[0] || null;
  }
  return null;
}

async function logAttempt(sql, actorType, actorId, identifier, event) {
  try {
    await sql`INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event) VALUES (${actorType}, ${actorId || null}, ${identifier || null}, ${event})`;
  } catch (err) {
    console.error('auth_audit_log insert failed', err);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  const loginToken = ((body && body.loginToken) || '').trim();
  const code = ((body && body.code) || '').trim();
  if (!loginToken || !code) {
    return json({ error: 'Enter the code we emailed you.' }, 400);
  }

  try {
    const result = await sql`
      SELECT id, actor_type, actor_id, code_hash, attempts, expires_at, consumed_at
      FROM login_otp_codes WHERE login_token = ${loginToken}`;
    const row = result.rows[0];

    if (!row || row.consumed_at || new Date(row.expires_at).getTime() < Date.now() || row.attempts >= OTP_MAX_ATTEMPTS) {
      return json(GENERIC_ERROR, 401);
    }

    if (!verifyOtpCode(code, row.code_hash)) {
      const nextAttempts = row.attempts + 1;
      const exhausted = nextAttempts >= OTP_MAX_ATTEMPTS;
      if (exhausted) {
        await sql`UPDATE login_otp_codes SET attempts = ${nextAttempts}, consumed_at = now() WHERE id = ${row.id}`;
      } else {
        await sql`UPDATE login_otp_codes SET attempts = ${nextAttempts} WHERE id = ${row.id}`;
      }
      const actor = await actorLookup(sql, row.actor_type, row.actor_id);
      await logAttempt(sql, row.actor_type, row.actor_id, actor && actor.identifier, 'otp_failed');
      const remaining = OTP_MAX_ATTEMPTS - nextAttempts;
      return json({ error: remaining > 0 ? `Incorrect code — ${remaining} attempt(s) left.` : 'Incorrect code — please sign in again.' }, 401);
    }

    const actor = await actorLookup(sql, row.actor_type, row.actor_id);
    if (!actor) {
      return json(GENERIC_ERROR, 401);
    }
    await sql`UPDATE login_otp_codes SET consumed_at = now() WHERE id = ${row.id}`;
    await logAttempt(sql, row.actor_type, row.actor_id, actor.identifier, 'login_success');

    // Successful OTP entry is exactly the event that should start a new
    // 7-day trusted-device window (see session.js) — this browser just
    // proved it holds both the password and the emailed code.
    let cookies;
    if (row.actor_type === 'guardian') {
      cookies = [createSessionCookie(row.actor_id, env.SESSION_SECRET), createGuardianTrustCookie(row.actor_id, actor.trust_version, env.SESSION_SECRET)];
    } else if (row.actor_type === 'student') {
      cookies = [createStudentSessionCookie(row.actor_id, env.SESSION_SECRET), createStudentTrustCookie(row.actor_id, actor.trust_version, env.SESSION_SECRET)];
    } else if (row.actor_type === 'staff') {
      cookies = [createStaffSessionCookie(row.actor_id, env.SESSION_SECRET), createStaffTrustCookie(row.actor_id, actor.trust_version, env.SESSION_SECRET)];
    } else {
      return json(GENERIC_ERROR, 500);
    }

    return json({ ok: true, fullName: actor.full_name, actorType: row.actor_type }, 200, { 'Set-Cookie': cookies });
  } catch (err) {
    console.error('portal verify-otp error', err);
    return json({ error: 'Could not verify that code right now — please try again shortly.' }, 500);
  }
}
