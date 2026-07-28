// Session-authenticated: the caller must already be signed in as the
// guardian in question. Safe to return the verification link inline
// when no email provider is configured (unlike forgot-password.js)
// because the only person who can call this endpoint for a given
// account is someone who already holds that account's own session
// cookie — there's no third party to leak a link to.
import { getSql } from '../../_lib/db.js';
import { readSessionFromRequest, generateToken } from '../../_lib/session.js';
import { json } from '../../_lib/http.js';
import { sendEmail, verificationEmailContent, siteOriginFromRequest } from '../../_lib/email.js';

const VERIFICATION_TOKEN_TTL_HOURS = 24;

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  if (!session) {
    return json({ error: 'Not signed in.' }, 401);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  try {
    const guardianRes = await sql`SELECT id, full_name, email, email_verified_at FROM guardians WHERE id = ${session.guardianId}`;
    const guardian = guardianRes.rows[0];
    if (!guardian) {
      return json({ error: 'Not signed in.' }, 401);
    }
    if (guardian.email_verified_at) {
      return json({ ok: true, alreadyVerified: true });
    }

    const token = generateToken();
    await sql`
      UPDATE guardians SET verification_token = ${token}, verification_token_expires = now() + make_interval(hours => ${VERIFICATION_TOKEN_TTL_HOURS})
      WHERE id = ${guardian.id}`;

    const verifyLink = siteOriginFromRequest(request) + '/portal/verify/?token=' + token;
    const { subject, text, html } = verificationEmailContent(guardian.full_name, verifyLink);
    const sendResult = await sendEmail(env, { to: guardian.email, subject, text, html });

    return json({ ok: true, verificationSent: sendResult.sent, verificationLink: sendResult.sent ? undefined : verifyLink });
  } catch (err) {
    console.error('portal resend-verification error', err);
    return json({ error: 'Could not resend a verification email right now — please try again shortly.' }, 500);
  }
}
