// Staff Identity & Access Platform login — the third, independent
// authenticated role alongside the guardian and student portals (see
// functions/_lib/session.js's parallel cookie helpers). Mirrors
// functions/api/portal/student/login.js's lockout/generic-error
// discipline exactly, with staff_no in place of admission_no and
// staff.status's suspended/archived in place of students' suspended/
// withdrawn. See docs/staff-identity-architecture.md.
import { getSql } from '../../../_lib/db.js';
import {
  createStaffSessionCookie, generateToken, verifyPassword,
  readStaffTrustFromRequest, createStaffTrustCookie,
} from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { sendEmail, otpEmailContent, siteOriginFromRequest } from '../../../_lib/email.js';
import { generateOtpCode, hashOtpCode, OTP_CODE_TTL_MINUTES } from '../../../_lib/otp.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const BLOCKED_STATUSES = ['suspended', 'archived'];

async function logAttempt(sql, identifier, event, actorId) {
  try {
    await sql`INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event) VALUES ('staff', ${actorId || null}, ${identifier}, ${event})`;
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
  const staffNo = ((body && body.staffNo) || '').trim();
  const password = (body && body.password) || '';
  if (!staffNo || !password) {
    return json({ error: 'Staff ID or email, and password, are required.' }, 400);
  }

  const genericError = { error: 'Incorrect Staff ID, email, or password.' };

  try {
    // Either the Staff ID or the email address on the record signs a
    // member in.
    //
    // Requiring the Staff ID was a real barrier, not a theoretical one:
    // it is a long number issued by the institution
    // (SHRS-HQ-REG-130826-000004), nobody memorises it, and it is shown
    // once, when the account is created. Someone who has not written it
    // down is locked out of a portal whose password they know perfectly
    // well — and the way back in was to ask the ICT Office to look the
    // number up, which is precisely the errand this platform keeps trying
    // to stop being necessary.
    //
    // lower() on the email because addresses are not case-sensitive in
    // practice and people type them as they please. The Staff ID stays
    // exact: it is issued in one canonical form and should match it.
    const identifier = staffNo.toLowerCase();
    const result = await sql`
      SELECT s.id, s.full_name, s.status, s.email, s.trust_version, sa.password_hash, sa.password_salt, sa.failed_attempts, sa.locked_until
      FROM staff s
      JOIN staff_accounts sa ON sa.staff_id = s.id
      WHERE s.staff_no = ${staffNo}
         OR (s.email IS NOT NULL AND btrim(lower(s.email)) = ${identifier})
      LIMIT 1`;
    const staff = result.rows[0];

    if (!staff) {
      await logAttempt(sql, staffNo, 'login_failed', null);
      return json(genericError, 401);
    }

    if (BLOCKED_STATUSES.includes(staff.status)) {
      await logAttempt(sql, staffNo, 'login_failed', staff.id);
      return json({ error: 'This account is currently restricted — contact the ICT Office.' }, 403);
    }

    if (staff.locked_until && new Date(staff.locked_until).getTime() > Date.now()) {
      const minutesLeft = Math.max(1, Math.ceil((new Date(staff.locked_until).getTime() - Date.now()) / 60000));
      return json({ error: `Too many failed attempts — please try again in about ${minutesLeft} minute(s).` }, 429);
    }

    if (!staff.password_hash || !staff.password_salt) {
      return json({ error: 'This account hasn\'t been activated yet — check for an activation link, or contact the ICT Office.' }, 401);
    }

    if (!verifyPassword(password, staff.password_hash, staff.password_salt)) {
      const nextAttempts = (staff.failed_attempts || 0) + 1;
      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        await sql`
          UPDATE staff_accounts SET failed_attempts = 0, locked_until = now() + make_interval(mins => ${LOCKOUT_MINUTES})
          WHERE staff_id = ${staff.id}`;
        await logAttempt(sql, staffNo, 'lockout', staff.id);
      } else {
        await sql`UPDATE staff_accounts SET failed_attempts = ${nextAttempts} WHERE staff_id = ${staff.id}`;
        await logAttempt(sql, staffNo, 'login_failed', staff.id);
      }
      return json(genericError, 401);
    }

    await sql`UPDATE staff_accounts SET failed_attempts = 0, locked_until = NULL WHERE staff_id = ${staff.id}`;

    // Risk-based OTP skip (see login.js's comment for the mechanism).
    const trust = readStaffTrustFromRequest(request, env.SESSION_SECRET);
    if (trust && trust.staffId === staff.id && trust.trustVersion === staff.trust_version) {
      await logAttempt(sql, staffNo, 'login_success_trusted_device', staff.id);
      return json(
        { ok: true, fullName: staff.full_name },
        200,
        {
          'Set-Cookie': [
            createStaffSessionCookie(staff.id, env.SESSION_SECRET),
            createStaffTrustCookie(staff.id, staff.trust_version, env.SESSION_SECRET),
          ],
        }
      );
    }

    // Email OTP only activates once ICT has entered an email for this
    // staff member (see the schema note on staff.email) — no email on
    // file means unchanged behavior, straight to a session cookie.
    if (staff.email) {
      const loginToken = generateToken();
      const code = generateOtpCode();
      await sql`
        INSERT INTO login_otp_codes (actor_type, actor_id, login_token, code_hash, expires_at)
        VALUES ('staff', ${staff.id}, ${loginToken}, ${hashOtpCode(code)}, now() + make_interval(mins => ${OTP_CODE_TTL_MINUTES}))`;
      const magicLink = siteOriginFromRequest(request) + '/api/portal/verify-login-link?token=' + loginToken;
      const { subject, text, html } = otpEmailContent(code, magicLink);
      await sendEmail(env, { to: staff.email, subject, text, html });
      await logAttempt(sql, staffNo, 'otp_sent', staff.id);
      return json({ otpRequired: true, loginToken, email: staff.email });
    }

    await logAttempt(sql, staffNo, 'login_success', staff.id);
    return json(
      { ok: true, fullName: staff.full_name },
      200,
      {
        'Set-Cookie': [
          createStaffSessionCookie(staff.id, env.SESSION_SECRET),
          createStaffTrustCookie(staff.id, staff.trust_version, env.SESSION_SECRET),
        ],
      }
    );
  } catch (err) {
    console.error('staff portal login error', err);
    return json({ error: 'Could not sign in right now — please try again shortly.' }, 500);
  }
}
