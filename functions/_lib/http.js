// Small response helpers shared across the portal's Pages Functions —
// keeps every route's success/error shape identical to what the
// frontend already expects (JSON body, optional extra headers for
// Set-Cookie).
//
// `Cache-Control: no-store` on every response, no exceptions: every
// portal API response is either session-scoped/personalized (dashboard
// data, "me" endpoints) or an auth state transition (login/logout/
// verify) — nothing here is ever safe to serve stale from the browser's
// HTTP cache. Confirmed as a real, not hypothetical, gap during the
// Account Creation Journey's end-to-end verification: without this
// header, a repeat GET /api/portal/me for the same URL could return a
// pre-verification snapshot (emailVerified: false) even after
// verification had genuinely completed server-side, because nothing
// told the browser the response wasn't cacheable.
// Set-Cookie is special-cased by the Fetch spec: a plain object can only
// hold one value per key, so a single Response({headers:{...}}) can never
// carry two Set-Cookie headers (e.g. a session cookie AND a trusted-device
// cookie issued in the same response). Passing extraHeaders['Set-Cookie']
// as an array routes through Headers#append, which does support repeating
// it; a single string still works exactly as before.
export function json(data, status = 200, extraHeaders = {}) {
  const headers = new Headers({ 'content-type': 'application/json', 'cache-control': 'no-store' });
  for (const [key, value] of Object.entries(extraHeaders)) {
    if (key.toLowerCase() === 'set-cookie' && Array.isArray(value)) {
      value.forEach((v) => headers.append('Set-Cookie', v));
    } else {
      headers.set(key, value);
    }
  }
  return new Response(JSON.stringify(data), { status, headers });
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
