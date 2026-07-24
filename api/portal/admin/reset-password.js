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
const { sql } = require('@vercel/postgres');
const { timingSafeEqualString, generateToken } = require('../../../lib/session');

const RESET_TOKEN_TTL_DAYS = 1;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const adminToken = process.env.PORTAL_ADMIN_TOKEN;
  if (!adminToken) {
    res.status(500).json({ error: 'Portal admin is not configured yet — PORTAL_ADMIN_TOKEN is not set.' });
    return;
  }
  if (!timingSafeEqualString(req.headers['x-admin-token'], adminToken)) {
    res.status(403).json({ error: 'Invalid admin token.' });
    return;
  }
  if (!process.env.POSTGRES_URL) {
    res.status(500).json({ error: 'No database is linked yet.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const email = ((body && body.email) || '').trim().toLowerCase();
  if (!email) {
    res.status(400).json({ error: 'email is required.' });
    return;
  }

  try {
    const existing = await sql`SELECT id FROM guardians WHERE email = ${email}`;
    if (!existing.rows.length) {
      res.status(404).json({ error: 'No guardian account found for that email.' });
      return;
    }
    const guardianId = existing.rows[0].id;
    const token = generateToken();
    await sql`
      UPDATE guardians SET
        reset_token = ${token}, reset_token_expires = now() + make_interval(days => ${RESET_TOKEN_TTL_DAYS}),
        failed_attempts = 0, locked_until = NULL
      WHERE id = ${guardianId}`;

    res.status(200).json({ ok: true, resetLink: '/portal/set-password/?token=' + token });
  } catch (err) {
    console.error('portal admin reset-password error', err);
    res.status(500).json({ error: 'Could not generate a reset link: ' + (err && err.message ? err.message : 'unknown error') });
  }
};
