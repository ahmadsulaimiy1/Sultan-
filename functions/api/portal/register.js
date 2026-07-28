// Self-service Guardian/Parent account registration — the "Sign Up"
// half of the Account Creation Journey (see
// docs/account-creation-journey.md). This is the ONLY self-registration
// path in the whole Identity & Access Platform: Student and Staff
// accounts remain institution-issued by design (see
// docs/staff-identity-architecture.md and student/login.js) — nothing
// here creates either.
//
// A registrant is signed in IMMEDIATELY (same as any other successful
// login) rather than blocked until they click a verification link.
// Email verification protects against someone squatting on an email
// address they don't own; it is not a login gate, because only the
// actual registrant knows the password they just chose. What
// verification DOES gate: submitting an admissions application (see
// admissions-applications.js) requires email_verified_at to be set,
// since that's the point where the account's contact details start
// carrying real institutional weight.
import { getSql } from '../../_lib/db.js';
import { createSessionCookie, hashPassword, isPasswordStrongEnough, MIN_PASSWORD_LENGTH, generateToken } from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';
import { sendEmail, verificationEmailContent, siteOriginFromRequest } from '../../_lib/email.js';
import { generateOtpCode, hashOtpCode } from '../../_lib/otp.js';

const VERIFICATION_TOKEN_TTL_HOURS = 24;

// Phase 1A (Imperial Digital Identity & Onboarding Directive) —
// registration collects an Identity Type and a WhatsApp number
// alongside the original four fields, and requires Confirm Email /
// Confirm Password to match. "Staff Member" and "Educational Partner"
// here are self-descriptions on a guardian-type account, NOT a real
// staff account or Permission Engine grant — those remain exclusively
// institution-issued per docs/staff-identity-architecture.md; selecting
// this option does not create or link one.
const IDENTITY_TYPES = ['parent_guardian', 'applicant', 'sponsor', 'alumni', 'staff_member', 'educational_partner'];

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  const fullName = ((body && body.fullName) || '').trim();
  const email = ((body && body.email) || '').trim().toLowerCase();
  const confirmEmail = ((body && body.confirmEmail) || '').trim().toLowerCase();
  const phone = ((body && body.phone) || '').trim();
  const whatsappNumber = ((body && body.whatsappNumber) || '').trim();
  const password = (body && body.password) || '';
  const confirmPassword = (body && body.confirmPassword) || '';
  const identityType = IDENTITY_TYPES.includes(body && body.identityType) ? body.identityType : 'parent_guardian';

  if (!fullName || !email || !phone) {
    return json({ error: 'Full name, email, and phone number are all required.' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }
  if (confirmEmail && confirmEmail !== email) {
    return json({ error: 'Email address and confirmation do not match.' }, 400);
  }
  if (!isPasswordStrongEnough(password)) {
    return json({ error: `Please choose a password at least ${MIN_PASSWORD_LENGTH} characters long.` }, 400);
  }
  if (confirmPassword && confirmPassword !== password) {
    return json({ error: 'Password and confirmation do not match.' }, 400);
  }

  try {
    const existing = await sql`SELECT id FROM guardians WHERE email = ${email}`;
    if (existing.rows.length) {
      return json({ error: 'An account with this email already exists — sign in instead, or use "Forgot password" if you don\'t remember your password.' }, 409);
    }

    const { hash, salt } = hashPassword(password);
    const verificationToken = generateToken();
    // Dual verification method: a code goes out alongside the link,
    // sharing the same expiry (one verification event, two ways to
    // complete it) — see docs/identity-authentication-roadmap.md.
    const verificationCode = generateOtpCode();
    const created = await sql`
      INSERT INTO guardians (
        full_name, email, phone, whatsapp_number, identity_type, password_hash, password_salt, registration_source,
        verification_token, verification_token_expires, verification_code_hash, verification_code_attempts
      )
      VALUES (
        ${fullName}, ${email}, ${phone}, ${whatsappNumber || null}, ${identityType}, ${hash}, ${salt}, 'self_service',
        ${verificationToken}, now() + make_interval(hours => ${VERIFICATION_TOKEN_TTL_HOURS}), ${hashOtpCode(verificationCode)}, 0
      )
      RETURNING id`;
    const guardianId = created.rows[0].id;

    await sql`INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event) VALUES ('guardian', ${guardianId}, ${email}, 'self_registered')`;

    const verifyLink = siteOriginFromRequest(request) + '/portal/verify/?token=' + verificationToken;
    const { subject, text, html } = verificationEmailContent(fullName, verifyLink, verificationCode);
    const sendResult = await sendEmail(env, { to: email, subject, text, html });

    return json(
      {
        ok: true,
        fullName,
        email,
        verificationSent: sendResult.sent,
        // Safe to include here specifically because this response goes
        // back to the same browser that just submitted its own
        // registration form — not to a third party who merely typed in
        // someone else's email address (that's the forgot-password
        // case, handled very differently in forgot-password.js).
        verificationLink: sendResult.sent ? undefined : verifyLink,
        verificationCode: sendResult.sent ? undefined : verificationCode,
      },
      201,
      { 'Set-Cookie': createSessionCookie(guardianId, env.SESSION_SECRET) }
    );
  } catch (err) {
    console.error('portal register error', err);
    return json({ error: 'Could not create your account right now: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
