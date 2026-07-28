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

// Builds a matched set of {create,read,clear}SessionCookie functions for
// one auth'd role, all sharing the sign/verify primitives above but each
// using its own cookie name and payload id field — so two roles (e.g.
// guardian + student) can hold independent, non-colliding sessions in the
// same browser without a unified role+id payload touching either role's
// existing consumers.
function makeSessionCookieFns(cookieName, idField) {
  function create(id, secret) {
    const token = sign({ [idField]: id, exp: Date.now() + MAX_AGE_SECONDS * 1000 }, secret);
    return `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
  }
  function clear() {
    return `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  }
  // `request` is a standard Web Request (Cloudflare Pages Functions pass
  // one in on context.request), not a Node req.
  function read(request, secret) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${cookieName}=`));
    if (!match) return null;
    const token = match.slice(cookieName.length + 1);
    return verify(token, secret);
  }
  return { create, read, clear };
}

const guardianCookie = makeSessionCookieFns('shr_portal_session', 'guardianId');
const studentCookie = makeSessionCookieFns('shr_student_session', 'studentId');
const staffCookie = makeSessionCookieFns('shr_staff_session', 'staffId');

export const createSessionCookie = guardianCookie.create;
export const readSessionFromRequest = guardianCookie.read;
export const clearSessionCookie = guardianCookie.clear;

export const createStudentSessionCookie = studentCookie.create;
export const readStudentSessionFromRequest = studentCookie.read;
export const clearStudentSessionCookie = studentCookie.clear;

export const createStaffSessionCookie = staffCookie.create;
export const readStaffSessionFromRequest = staffCookie.read;
export const clearStaffSessionCookie = staffCookie.clear;

// Risk-based "trusted device" cookie — Level 3 of the identity model
// (see docs/identity-authentication-roadmap.md). Distinct from the
// session cookies above: it doesn't grant access by itself, it only
// lets a login endpoint SKIP the OTP step when it's present, valid,
// and its trustVersion still matches the account's current
// trust_version column. A 7-day sliding window (refreshed on every
// trusted login) implements both "frictionless within 7 days" and
// "re-verify after 7+ days inactive" from the same mechanism. This is
// a signed cookie proving prior successful verification on this
// browser — not canvas/behavioral fingerprinting, no separate device
// registry table; see the roadmap doc for what that would take.
const TRUST_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function makeTrustCookieFns(cookieName, idField) {
  function create(id, trustVersion, secret) {
    const token = sign({ [idField]: id, trustVersion, exp: Date.now() + TRUST_MAX_AGE_SECONDS * 1000 }, secret);
    return `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TRUST_MAX_AGE_SECONDS}`;
  }
  function clear() {
    return `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  }
  function read(request, secret) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${cookieName}=`));
    if (!match) return null;
    const token = match.slice(cookieName.length + 1);
    return verify(token, secret);
  }
  return { create, read, clear };
}

const guardianTrustCookie = makeTrustCookieFns('shr_trust_guardian', 'guardianId');
const studentTrustCookie = makeTrustCookieFns('shr_trust_student', 'studentId');
const staffTrustCookie = makeTrustCookieFns('shr_trust_staff', 'staffId');

export const createGuardianTrustCookie = guardianTrustCookie.create;
export const readGuardianTrustFromRequest = guardianTrustCookie.read;
export const clearGuardianTrustCookie = guardianTrustCookie.clear;

export const createStudentTrustCookie = studentTrustCookie.create;
export const readStudentTrustFromRequest = studentTrustCookie.read;
export const clearStudentTrustCookie = studentTrustCookie.clear;

export const createStaffTrustCookie = staffTrustCookie.create;
export const readStaffTrustFromRequest = staffTrustCookie.read;
export const clearStaffTrustCookie = staffTrustCookie.clear;

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
