// Public but capability-gated: the reset_token itself is the secret
// (24 random bytes, effectively unguessable), not a session or admin
// credential. Used both for first-time account activation and for
// staff-mediated password resets (see api/portal/admin/reset-password.js)
// — same token, same flow either way.
const { sql } = require('@vercel/postgres');
const { createSessionCookie, hashPassword, isPasswordStrongEnough, MIN_PASSWORD_LENGTH } = require('../../lib/session');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!process.env.SESSION_SECRET) {
    res.status(500).json({ error: 'Portal is not configured yet.' });
    return;
  }
  if (!process.env.POSTGRES_URL) {
    res.status(500).json({ error: 'Portal is not configured yet — no database is linked.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const token = (body && body.token) || '';
  const password = (body && body.password) || '';
  if (!token) {
    res.status(400).json({ error: 'Missing activation token.' });
    return;
  }
  if (!isPasswordStrongEnough(password)) {
    res.status(400).json({ error: `Please choose a password at least ${MIN_PASSWORD_LENGTH} characters long.` });
    return;
  }

  try {
    const result = await sql`
      SELECT id, reset_token_expires FROM guardians WHERE reset_token = ${token}`;
    const guardian = result.rows[0];
    if (!guardian) {
      res.status(400).json({ error: 'This activation link is invalid. Ask the school to send you a new one.' });
      return;
    }
    if (!guardian.reset_token_expires || new Date(guardian.reset_token_expires).getTime() < Date.now()) {
      res.status(400).json({ error: 'This activation link has expired. Ask the school to send you a new one.' });
      return;
    }

    const { hash, salt } = hashPassword(password);
    await sql`
      UPDATE guardians SET
        password_hash = ${hash}, password_salt = ${salt},
        reset_token = NULL, reset_token_expires = NULL,
        failed_attempts = 0, locked_until = NULL
      WHERE id = ${guardian.id}`;

    res.setHeader('Set-Cookie', createSessionCookie(guardian.id));
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('portal set-password error', err);
    res.status(500).json({ error: 'Could not set your password right now — please try again shortly.' });
  }
};
