const { sql } = require('@vercel/postgres');
const { createSessionCookie, verifyPassword } = require('../../lib/session');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

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
      SELECT id, password_hash, password_salt, full_name, failed_attempts, locked_until
      FROM guardians WHERE email = ${email}`;
    const guardian = result.rows[0];

    // Same generic message whether the account doesn't exist or the
    // password is wrong — don't let login responses reveal which
    // emails are registered.
    const genericError = { error: 'Incorrect email or password.' };

    if (!guardian) {
      res.status(401).json(genericError);
      return;
    }

    if (guardian.locked_until && new Date(guardian.locked_until).getTime() > Date.now()) {
      const minutesLeft = Math.max(1, Math.ceil((new Date(guardian.locked_until).getTime() - Date.now()) / 60000));
      res.status(429).json({ error: `Too many failed attempts — please try again in about ${minutesLeft} minute(s).` });
      return;
    }

    if (!guardian.password_hash || !guardian.password_salt) {
      res.status(401).json({ error: 'This account hasn\'t been activated yet — check for an activation link, or contact the school.' });
      return;
    }

    if (!verifyPassword(password, guardian.password_hash, guardian.password_salt)) {
      const nextAttempts = (guardian.failed_attempts || 0) + 1;
      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        await sql`
          UPDATE guardians SET failed_attempts = 0, locked_until = now() + make_interval(mins => ${LOCKOUT_MINUTES})
          WHERE id = ${guardian.id}`;
      } else {
        await sql`UPDATE guardians SET failed_attempts = ${nextAttempts} WHERE id = ${guardian.id}`;
      }
      res.status(401).json(genericError);
      return;
    }

    await sql`UPDATE guardians SET failed_attempts = 0, locked_until = NULL WHERE id = ${guardian.id}`;
    res.setHeader('Set-Cookie', createSessionCookie(guardian.id));
    res.status(200).json({ ok: true, fullName: guardian.full_name });
  } catch (err) {
    console.error('portal login error', err);
    res.status(500).json({ error: 'Could not sign in right now — please try again shortly.' });
  }
};
