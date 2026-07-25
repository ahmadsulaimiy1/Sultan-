// Shared session/crypto helper for Cloudflare Pages Functions.
//
// Ported from the Vercel version (lib/session.js) with one structural
// change: Workers have no `process.env`, so every function that used to
// read a secret off the environment now takes it as an explicit
// parameter, supplied by the caller from the Pages Function `env`
// object. The signing scheme itself (base64url(payload) + '.' +
// HMAC-SHA256(payload, secret)) and the scrypt password hashing are
// unchanged.
//
// Requires the "nodejs_compat" compatibility flag enabled on the
// Cloudflare Pages project (Settings -> Functions -> Compatibility
// flags) so that `node:crypto` (scrypt, timingSafeEqual, Buffer) is
// available. Without it, every function below throws at import time.
import crypto from 'node:crypto';

const COOKIE_NAME = 'shr_portal_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadObj, secret) {
  const payload = base64url(JSON.stringify(payloadObj));
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verify(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig || '', 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!data.exp || Date.now() > data.exp) return null;
  return data;
}

export function createSessionCookie(guardianId, secret) {
  const token = sign({ guardianId, exp: Date.now() + MAX_AGE_SECONDS * 1000 }, secret);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

// `request` is a standard Web Request (Cloudflare Pages Functions pass
// one in on context.request), not a Node req.
export function readSessionFromRequest(request, secret) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const token = match.slice(COOKIE_NAME.length + 1);
  return verify(token, secret);
}

// scrypt password hashing — no bcrypt dependency, no native binary.
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(hash, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Constant-time string comparison for bearer-style tokens (setup/admin
// tokens, activation/reset tokens).
export function timingSafeEqualString(a, b) {
  const bufA = Buffer.from(String(a == null ? '' : a), 'utf8');
  const bufB = Buffer.from(String(b == null ? '' : b), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// URL-safe random token for account activation / password reset links.
export function generateToken() {
  return crypto.randomBytes(24).toString('base64url');
}

// Length-based policy (NIST SP 800-63B favors length over forced
// complexity rules, which push users toward predictable substitutions).
export const MIN_PASSWORD_LENGTH = 10;
export function isPasswordStrongEnough(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
}
