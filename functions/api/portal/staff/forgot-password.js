// Public self-service "Forgot password" for STAFF — the mirror of
// functions/api/portal/forgot-password.js, which guardians have had all
// along and staff did not.
//
// Until this existed, a staff member who forgot their password had
// exactly one route back in: ask the ICT Office, which issued a fresh
// activation link by hand from the Admin Centre. That is fine once. As
// standing practice it is not — it makes an officer's access depend on
// somebody else being awake, it puts a single-use credential through
// WhatsApp or a printed letter every time, and it means the school's
// most senior staff cannot recover their own accounts. The Registrar
// spent a week locked out of hers for precisely this reason.
//
// The same anti-enumeration discipline as the guardian endpoint: the
// response is identical whether or not an account exists, the reset link
// is NEVER returned in the response (there is no session here proving
// the caller owns the address they typed), and every request is logged.
//
// Three staff-specific rules the guardian flow has no equivalent for:
//
//   1. email is OPTIONAL on the staff record (admin/staff.js create-staff
//      says so — entering it is what turns on the OTP step). Somebody
//      with no email on file cannot be sent anything, so they fall
//      through to the generic response and the ICT Office route.
//   2. A suspended or archived staff member must not be able to reset
//      their way back in. Status is checked before any token is issued.
//   3. The reset completes on the EXISTING /portal/staff/set-password/
//      page, which already handles a reset_token — the same mechanism as
//      an admin-issued activation link. Nothing is duplicated.
import { getSql } from '../../../_lib/db.js';
import { generateToken } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { sendEmail, resetPasswordEmailContent, siteOriginFromRequest } from '../../../_lib/email.js';

const RESET_TOKEN_TTL_HOURS = 24;
const GENERIC_RESPONSE = {
  ok: true,
  message: 'If a staff account exists for that email address, password reset instructions have been sent to it. '
    + 'If nothing arrives, the address may not be the one on your staff record — contact the ICT Office.',
};

export async function onRequestPost({ request, env }) {
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  const email = ((body && body.email) || '').trim().toLowerCase();
  if (!email) {
    return json({ error: 'Email is required.' }, 400);
  }

  try {
    const existing = await sql`
      SELECT id, full_name, status FROM staff WHERE lower(email) = ${email}`;
    const staff = existing.rows[0];

    // Only an active staff member may reset. A suspended or archived
    // account staying un-resettable is the whole point of suspending it.
    if (staff && staff.status === 'active') {
      const token = generateToken();
      await sql`
        INSERT INTO staff_accounts (staff_id, reset_token, reset_token_expires)
        VALUES (${staff.id}, ${token}, now() + make_interval(hours => ${RESET_TOKEN_TTL_HOURS}))
        ON CONFLICT (staff_id) DO UPDATE SET
          reset_token = EXCLUDED.reset_token,
          reset_token_expires = EXCLUDED.reset_token_expires`;
      await sql`
        INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event)
        VALUES ('staff', ${staff.id}, ${email}, 'password_reset_requested')`;

      const resetLink = siteOriginFromRequest(request) + '/portal/staff/set-password/?token=' + token;
      const { subject, text, html } = resetPasswordEmailContent(resetLink);
      // Discarded either way, deliberately — reporting a send failure
      // here would tell an anonymous caller that the address is real.
      // If email is not configured the staff member is no worse off than
      // before this endpoint existed: the ICT Office route still stands,
      // and the response above names it.
      await sendEmail(env, { to: email, subject, text, html });
    } else {
      await sql`
        INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event)
        VALUES ('staff', ${staff ? staff.id : null}, ${email},
                ${staff ? 'password_reset_requested_inactive' : 'password_reset_requested_unknown_email'})`;
    }

    return json(GENERIC_RESPONSE);
  } catch (err) {
    console.error('staff portal forgot-password error', err);
    // Same generic response even on an unexpected failure, so an error
    // cannot be used to distinguish a real address from an invented one.
    return json(GENERIC_RESPONSE);
  }
}
