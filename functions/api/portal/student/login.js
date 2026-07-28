// Student Portal login — a second, independent authenticated role
// alongside the guardian portal (see functions/_lib/session.js's
// parallel cookie helpers). Mirrors functions/api/portal/login.js's
// lockout/generic-error discipline exactly, plus one extra check that
// doesn't apply to guardians: a suspended or withdrawn student's own
// account is blocked outright, since (unlike a parent, who should still
// see a graduated child's records) the student here IS the sanctioned
// account. See docs/student-portal.md.
import { getSql } from '../../../_lib/db.js';
import {
  createStudentSessionCookie, generateToken, verifyPassword,
  readStudentTrustFromRequest, createStudentTrustCookie,
} from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { sendEmail, otpEmailContent, maskEmail } from '../../../_lib/email.js';
import { generateOtpCode, hashOtpCode, OTP_CODE_TTL_MINUTES } from '../../../_lib/otp.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const BLOCKED_STATUSES = ['suspended', 'withdrawn'];

async function logAttempt(sql, identifier, event, actorId) {
  try {
    await sql`INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event) VALUES ('student', ${actorId || null}, ${identifier}, ${event})`;
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
  const admissionNo = ((body && body.admissionNo) || '').trim();
  const password = (body && body.password) || '';
  if (!admissionNo || !password) {
    return json({ error: 'Admission number and password are required.' }, 400);
  }

  const genericError = { error: 'Incorrect admission number or password.' };

  try {
    const result = await sql`
      SELECT s.id, s.full_name, s.status, s.email, s.trust_version, sa.password_hash, sa.password_salt, sa.failed_attempts, sa.locked_until
      FROM students s
      JOIN student_accounts sa ON sa.student_id = s.id
      WHERE s.admission_no = ${admissionNo}`;
    const student = result.rows[0];

    if (!student) {
      await logAttempt(sql, admissionNo, 'login_failed', null);
      return json(genericError, 401);
    }

    if (BLOCKED_STATUSES.includes(student.status)) {
      await logAttempt(sql, admissionNo, 'login_failed', student.id);
      return json({ error: 'This account is currently restricted — contact the school office.' }, 403);
    }

    if (student.locked_until && new Date(student.locked_until).getTime() > Date.now()) {
      const minutesLeft = Math.max(1, Math.ceil((new Date(student.locked_until).getTime() - Date.now()) / 60000));
      return json({ error: `Too many failed attempts — please try again in about ${minutesLeft} minute(s).` }, 429);
    }

    if (!student.password_hash || !student.password_salt) {
      return json({ error: 'This account hasn\'t been activated yet — check for an activation link, or contact the school.' }, 401);
    }

    if (!verifyPassword(password, student.password_hash, student.password_salt)) {
      const nextAttempts = (student.failed_attempts || 0) + 1;
      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        await sql`
          UPDATE student_accounts SET failed_attempts = 0, locked_until = now() + make_interval(mins => ${LOCKOUT_MINUTES})
          WHERE student_id = ${student.id}`;
        await logAttempt(sql, admissionNo, 'lockout', student.id);
      } else {
        await sql`UPDATE student_accounts SET failed_attempts = ${nextAttempts} WHERE student_id = ${student.id}`;
        await logAttempt(sql, admissionNo, 'login_failed', student.id);
      }
      return json(genericError, 401);
    }

    await sql`UPDATE student_accounts SET failed_attempts = 0, locked_until = NULL WHERE student_id = ${student.id}`;

    // Risk-based OTP skip (see login.js's comment for the mechanism).
    const trust = readStudentTrustFromRequest(request, env.SESSION_SECRET);
    if (trust && trust.studentId === student.id && trust.trustVersion === student.trust_version) {
      await logAttempt(sql, admissionNo, 'login_success_trusted_device', student.id);
      return json(
        { ok: true, fullName: student.full_name },
        200,
        {
          'Set-Cookie': [
            createStudentSessionCookie(student.id, env.SESSION_SECRET),
            createStudentTrustCookie(student.id, student.trust_version, env.SESSION_SECRET),
          ],
        }
      );
    }

    // Email OTP only activates once ICT has entered an email for this
    // student (see the schema note on students.email) — no email on
    // file means unchanged behavior, straight to a session cookie.
    if (student.email) {
      const loginToken = generateToken();
      const code = generateOtpCode();
      await sql`
        INSERT INTO login_otp_codes (actor_type, actor_id, login_token, code_hash, expires_at)
        VALUES ('student', ${student.id}, ${loginToken}, ${hashOtpCode(code)}, now() + make_interval(mins => ${OTP_CODE_TTL_MINUTES}))`;
      const { subject, text, html } = otpEmailContent(code);
      await sendEmail(env, { to: student.email, subject, text, html });
      await logAttempt(sql, admissionNo, 'otp_sent', student.id);
      return json({ otpRequired: true, loginToken, maskedEmail: maskEmail(student.email) });
    }

    await logAttempt(sql, admissionNo, 'login_success', student.id);
    return json(
      { ok: true, fullName: student.full_name },
      200,
      {
        'Set-Cookie': [
          createStudentSessionCookie(student.id, env.SESSION_SECRET),
          createStudentTrustCookie(student.id, student.trust_version, env.SESSION_SECRET),
        ],
      }
    );
  } catch (err) {
    console.error('student portal login error', err);
    return json({ error: 'Could not sign in right now — please try again shortly.' }, 500);
  }
}
