// Public self-service "Forgot password" REQUEST endpoint — the missing
// piece admin/reset-password.js's own header comment named explicitly:
// "without a transactional email service configured... a public
// endpoint that could only reveal the reset link to whoever submits
// the email address would let anyone take over any guardian's account
// just by knowing their email." That risk is exactly why this endpoint
// NEVER returns the reset link in its response, unlike register.js and
// resend-verification.js — there is no session or prior authentication
// here to prove the caller owns the email they typed in.
//
// The reset itself completes on the EXISTING /portal/set-password/
// page and its set-password.js endpoint — that flow already handles a
// reset_token correctly (same mechanism used for admin-issued
// activation links) and doesn't need duplicating.
//
// Always returns the same generic success message whether or not an
// account exists for the submitted email, so this endpoint cannot be
// used to discover which email addresses have accounts (enumeration).
import { getSql } from '../../_lib/db.js';
import { generateToken } from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';
import { sendEmail, resetPasswordEmailContent, SITE_ORIGIN } from '../../_lib/email.js';

const RESET_TOKEN_TTL_HOURS = 24;
const GENERIC_RESPONSE = { ok: true, message: 'If an account exists for that email address, password reset instructions have been sent to it.' };

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
    const existing = await sql`SELECT id, full_name FROM guardians WHERE email = ${email}`;
    if (existing.rows.length) {
      const guardian = existing.rows[0];
      const token = generateToken();
      await sql`
        UPDATE guardians SET reset_token = ${token}, reset_token_expires = now() + make_interval(hours => ${RESET_TOKEN_TTL_HOURS})
        WHERE id = ${guardian.id}`;
      await sql`INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event) VALUES ('guardian', ${guardian.id}, ${email}, 'password_reset_requested')`;

      const resetLink = SITE_ORIGIN + '/portal/set-password/?token=' + token;
      const { subject, text, html } = resetPasswordEmailContent(resetLink);
      // Result intentionally discarded from the response either way —
      // see the header comment. If email sending isn't configured, the
      // account holder currently has no way to complete a self-service
      // reset and needs to contact the school (still on the login
      // page), same as before this endpoint existed.
      await sendEmail(env, { to: email, subject, text, html });
    } else {
      await sql`INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event) VALUES ('guardian', NULL, ${email}, 'password_reset_requested_unknown_email')`;
    }

    return json(GENERIC_RESPONSE);
  } catch (err) {
    console.error('portal forgot-password error', err);
    // Even on an unexpected error, don't leak whether the account
    // exists — return the same generic response and log server-side.
    return json(GENERIC_RESPONSE);
  }
}
