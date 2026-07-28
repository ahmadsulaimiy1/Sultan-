// Shared one-time-code helpers for the email OTP (MFA) login step —
// used by login.js, student/login.js, staff/login.js, and verify-otp.js.
// See login_otp_codes in sql/schema.sql for why the code is hashed but
// the login_token isn't (different entropy, different threat each
// protects against).
import crypto from 'node:crypto';

export const OTP_CODE_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtpCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

export function hashOtpCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

export function verifyOtpCode(code, hash) {
  const candidate = Buffer.from(hashOtpCode(code), 'utf8');
  const expected = Buffer.from(String(hash || ''), 'utf8');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}
