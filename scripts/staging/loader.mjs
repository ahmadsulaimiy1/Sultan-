// Redirects functions/_lib/db.js to the staging shim, and nothing else.
//
// verify.js is imported UNMODIFIED — no copy, no edit, no re-implementation.
// Only its database transport is swapped, because Neon's HTTP driver cannot
// address a local Postgres. Every other import it makes resolves normally,
// so the parser, the identifier resolution, the HMAC recomputation and the
// response shape under test are the production ones.
export async function resolve(specifier, context, next) {
  const r = await next(specifier, context);
  if (r.url.endsWith('/functions/_lib/db.js')) {
    return { ...r, url: new URL('./shim-db.mjs', import.meta.url).href, shortCircuit: true };
  }
  return r;
}
