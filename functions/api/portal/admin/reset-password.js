// Staff-mediated password reset. Deliberately NOT a public
// "forgot password" endpoint: without a transactional email service
// configured (see docs/parent-portal.md), a public endpoint that could
// only reveal the reset link to whoever submits the email address would
// let anyone take over any guardian's account just by knowing their
// email — worse than not having password reset at all. Until an email
// service is added, a parent who's locked out contacts the school
// (WhatsApp/email, both already on the login page), and staff — holding
// PORTAL_ADMIN_TOKEN — calls this to generate a fresh activation link
// and relays it manually.
import { getSql } from '../../../_lib/db.js';
import { timingSafeEqualString, generateToken } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';

const RESET_TOKEN_TTL_DAYS = 1;

export async function onRequestPost({ request, env }) {
  const adminToken = env.PORTAL_ADMIN_TOKEN;
  if (!adminToken) {
    return json({ error: 'Portal admin is not configured yet — PORTAL_ADMIN_TOKEN is not set.' }, 500);
  }
  if (!timingSafeEqualString(request.headers.get('x-admin-token'), adminToken)) {
    return json({ error: 'Invalid admin token.' }, 403);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'No database is linked yet.' }, 500);
  }

  const body = await readJsonBody(request);
  const email = ((body && body.email) || '').trim().toLowerCase();
  if (!email) {
    return json({ error: 'email is required.' }, 400);
  }

  try {
    const existing = await sql`SELECT id FROM guardians WHERE email = ${email}`;
    if (!existing.rows.length) {
      return json({ error: 'No guardian account found for that email.' }, 404);
    }
    const guardianId = existing.rows[0].id;
    const token = generateToken();
    await sql`
      UPDATE guardians SET
        reset_token = ${token}, reset_token_expires = now() + make_interval(days => ${RESET_TOKEN_TTL_DAYS}),
        failed_attempts = 0, locked_until = NULL
      WHERE id = ${guardianId}`;

    return json({ ok: true, resetLink: '/portal/set-password/?token=' + token });
  } catch (err) {
    console.error('portal admin reset-password error', err);
    return json({ error: 'Could not generate a reset link: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
