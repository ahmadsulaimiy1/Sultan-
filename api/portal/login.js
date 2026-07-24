const { sql } = require('@vercel/postgres');
const { createSessionCookie, verifyPassword } = require('../../lib/session');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!process.env.SESSION_SECRET) {
    res.status(500).json({ error: 'Portal is not configured yet — an administrator needs to set SESSION_SECRET.' });
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
  const email = ((body && body.email) || '').trim().toLowerCase();
  const password = (body && body.password) || '';
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const result = await sql`
      SELECT id, password_hash, password_salt, full_name
      FROM guardians WHERE email = ${email}`;
    const guardian = result.rows[0];
    if (!guardian || !verifyPassword(password, guardian.password_hash, guardian.password_salt)) {
      res.status(401).json({ error: 'Incorrect email or password.' });
      return;
    }
    res.setHeader('Set-Cookie', createSessionCookie(guardian.id));
    res.status(200).json({ ok: true, fullName: guardian.full_name });
  } catch (err) {
    console.error('portal login error', err);
    res.status(500).json({ error: 'Could not sign in right now — please try again shortly.' });
  }
};
