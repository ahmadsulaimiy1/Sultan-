// Public, unauthenticated newsletter signup (Header & Footer Master
// Directive, footer Section 8). Collects only an email address into
// newsletter_subscribers — there is no bulk-send system behind this yet
// (Resend is wired for transactional auth/receipt emails only, see
// docs/email-*.md), so this is honestly a real subscriber list being
// built, not a live newsletter feature. Re-submitting an already-known
// address is treated as success, not an error — a visitor resubmitting
// the footer form has no way to know they already subscribed.
import { getSql } from '../../../_lib/db.js';
import { json, readJsonBody } from '../../../_lib/http.js';

export async function onRequestPost({ request, env }) {
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'No database is linked yet.' }, 500);
  }
  const body = await readJsonBody(request);
  const email = ((body && body.email) || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }
  try {
    await sql`
      INSERT INTO newsletter_subscribers (email) VALUES (${email})
      ON CONFLICT (email) DO NOTHING`;
    return json({ ok: true });
  } catch (err) {
    console.error('portal newsletter subscribe error', err);
    return json({ error: 'Could not subscribe: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
