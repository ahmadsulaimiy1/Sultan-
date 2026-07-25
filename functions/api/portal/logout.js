import { clearSessionCookie } from '../../_lib/session.js';
import { json } from '../../_lib/http.js';

export async function onRequestPost() {
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}
