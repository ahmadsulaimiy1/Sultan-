const { sql } = require('@vercel/postgres');
const { readSessionFromRequest } = require('../../../lib/session');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let session;
  try {
    session = readSessionFromRequest(req);
  } catch (err) {
    res.status(500).json({ error: 'Portal is not configured yet.' });
    return;
  }
  if (!session) {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }
  if (!process.env.POSTGRES_URL) {
    res.status(500).json({ error: 'Portal is not configured yet — no database is linked.' });
    return;
  }

  try {
    await sql`
      UPDATE notifications SET read_at = now()
      WHERE guardian_id = ${session.guardianId} AND read_at IS NULL`;
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('portal notifications read error', err);
    res.status(500).json({ error: 'Could not update notifications right now.' });
  }
};
