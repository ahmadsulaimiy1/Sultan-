// Transactional email via Resend's REST API (https://resend.com) —
// chosen for a one-call, no-SDK, fetch-only integration that works
// unmodified inside a Cloudflare Pages Function. Gated by two env vars:
// RESEND_API_KEY and EMAIL_FROM_ADDRESS. Neither is set in this
// project's sandbox (no real account exists to configure), so this is
// documented and built to be genuinely functional once a real school
// administrator adds real credentials — not exercised end-to-end here.
// See docs/account-creation-journey.md's Testing Note.
//
// CRITICAL SECURITY PROPERTY, do not weaken: sendEmail() returns
// { sent: false, reason: 'not_configured' } when no provider is set —
// it never throws, and callers must NEVER fall back to returning a
// verification/reset link directly to the caller of a PUBLIC endpoint
// when sending fails, except where the caller already holds a valid
// session for the account in question (see
// functions/api/portal/register.js's registrant-only exception and
// functions/api/portal/forgot-password.js's explicit refusal to do
// this at all). Returning a reset link to whoever merely typed in an
// email address is exactly the account-takeover vector
// admin/reset-password.js's original design deliberately avoided.
// Matches scripts/build.js's SITE_ORIGIN — email links must be
// absolute (there's no page context for an email client to resolve a
// relative URL against).
export const SITE_ORIGIN = 'https://shroyalschools.com';

// Preview and Production are two entirely separate Cloudflare Pages
// environments with two separate Neon databases behind two different
// URLs. A token written by a request handled on Preview only exists in
// Preview's database, so an email link MUST point back to the same
// origin that issued it — never the hardcoded SITE_ORIGIN, which would
// silently send every Preview-issued link to Production's (different,
// token-less) database instead. Falls back to SITE_ORIGIN only if the
// request URL can't be parsed.
export function siteOriginFromRequest(request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return SITE_ORIGIN;
  }
}

export async function sendEmail(env, { to, subject, html, text }) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM_ADDRESS;
  if (!apiKey || !from) {
    return { sent: false, reason: 'not_configured' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (!res.ok) {
      console.error('resend send failed', res.status, await res.text().catch(() => ''));
      return { sent: false, reason: 'provider_error' };
    }
    return { sent: true, reason: null };
  } catch (err) {
    console.error('resend send threw', err);
    return { sent: false, reason: 'provider_error' };
  }
}

export function verificationEmailContent(fullName, verifyLink) {
  const subject = 'Verify your Sultan Hanafi Royal Schools account';
  const text = `Hello ${fullName},\n\nPlease verify your email address to finish setting up your Sultan Hanafi Royal Schools account:\n${verifyLink}\n\nThis link expires in 24 hours. If you didn't create this account, you can ignore this email.`;
  const html = `<p>Hello ${escapeHtml(fullName)},</p><p>Please verify your email address to finish setting up your Sultan Hanafi Royal Schools account:</p><p><a href="${verifyLink}">${verifyLink}</a></p><p>This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>`;
  return { subject, text, html };
}

export function resetPasswordEmailContent(resetLink) {
  const subject = 'Reset your Sultan Hanafi Royal Schools password';
  const text = `A password reset was requested for your Sultan Hanafi Royal Schools account. If this was you, choose a new password here:\n${resetLink}\n\nThis link expires in 24 hours. If you didn't request this, you can ignore this email — your password will not be changed.`;
  const html = `<p>A password reset was requested for your Sultan Hanafi Royal Schools account. If this was you, choose a new password here:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in 24 hours. If you didn't request this, you can ignore this email — your password will not be changed.</p>`;
  return { subject, text, html };
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
