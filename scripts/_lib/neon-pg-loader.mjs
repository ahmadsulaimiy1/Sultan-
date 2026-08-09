/**
 * Module resolver hook that points @neondatabase/serverless at the local
 * Postgres shim, so the REAL verification endpoint can be run against a
 * real database without editing a single line of it.
 *
 * Used only by the rehearsal harness:
 *     node --import ./scripts/_lib/neon-pg-register.mjs scripts/verify-certificate-acceptance.mjs
 *
 * It never runs in production and never ships to Cloudflare — it is a
 * development-time resolver, and the only module it rewrites is the driver.
 * Anything else keeps its normal resolution, so an accidental import of some
 * other package cannot be silently redirected.
 */
import { pathToFileURL } from 'node:url';

const SHIM = pathToFileURL(new URL('./neon-pg-shim.mjs', import.meta.url).pathname).href;

export async function resolve(specifier, context, next) {
  if (specifier === '@neondatabase/serverless') return { url: SHIM, shortCircuit: true };
  return next(specifier, context);
}
