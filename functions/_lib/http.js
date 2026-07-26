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
export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extraHeaders },
  });
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
