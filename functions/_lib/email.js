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

// Shared branded shell for every transactional email — real branding
// (school name + a labelled "Digital Campus Identity Platform" line),
// not a full design system. A verification email intentionally never
// arrives with just a bare link or a bare code: both a one-click
// button/link AND a typed code go out together every time, so the
// recipient is never funnelled into a single method (see
// docs/identity-authentication-roadmap.md's Verification UX section).
function emailShell({ heading, bodyHtml, expiryLine }) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#2a2620;">
      <div style="text-align:center;padding:18px 0 10px;border-bottom:2px solid #8a6d2f;">
        <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#8a6d2f;font-weight:bold;">Sultan Hanafi Royal Schools</div>
        <div style="font-size:11px;color:#8a8477;margin-top:2px;">Digital Campus Identity Platform</div>
      </div>
      <div style="padding:24px 8px;">
        <h1 style="font-size:19px;margin:0 0 14px;">${escapeHtml(heading)}</h1>
        ${bodyHtml}
        ${expiryLine ? `<p style="font-size:13px;color:#5a5650;margin-top:22px;">${escapeHtml(expiryLine)}</p>` : ''}
        <p style="font-size:12px;color:#8a8477;margin-top:18px;border-top:1px solid #e5e0d5;padding-top:14px;">If you did not request this, please ignore this email — no action is needed and nothing changes on your account.</p>
      </div>
    </div>`;
}

function buttonHtml(href, label) {
  return `<p style="text-align:center;margin:20px 0;"><a href="${href}" style="display:inline-block;background:#3a2e14;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-weight:bold;">${escapeHtml(label)}</a></p>`;
}

export function verificationEmailContent(fullName, verifyLink, code) {
  const subject = 'Verify your Sultan Hanafi Royal Schools account';
  const text = `Hello ${fullName},\n\nVerify your email using EITHER method below — both work, use whichever is easier:\n\n1) Click this link: ${verifyLink}\n2) Or enter this code on the verification page: ${code}\n\nThis expires in 24 hours and can only be used once.`;
  const html = emailShell({
    heading: `Hello ${fullName}, please verify your email`,
    bodyHtml: `
      <p>Use either method below to finish setting up your account — both work, whichever is easier for you.</p>
      <p style="font-weight:bold;margin-bottom:4px;">Method 1 — one click:</p>
      ${buttonHtml(verifyLink, 'Verify My Account')}
      <p style="font-size:12px;color:#8a8477;word-break:break-all;">Or paste this link into your browser: ${verifyLink}</p>
      <p style="font-weight:bold;margin:22px 0 4px;">Method 2 — enter this code instead:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;text-align:center;">${escapeHtml(code)}</p>`,
    expiryLine: 'This verification (both the link and the code above) expires in 24 hours and can only be used once.',
  });
  return { subject, text, html };
}

export function resetPasswordEmailContent(resetLink) {
  const subject = 'Reset your Sultan Hanafi Royal Schools password';
  const text = `A password reset was requested for your Sultan Hanafi Royal Schools account. If this was you, choose a new password here:\n${resetLink}\n\nThis link expires in 24 hours. If you didn't request this, you can ignore this email — your password will not be changed.`;
  const html = emailShell({
    heading: 'Reset your password',
    bodyHtml: `<p>A password reset was requested for your account. If this was you, choose a new password:</p>${buttonHtml(resetLink, 'Choose New Password')}<p style="font-size:12px;color:#8a8477;word-break:break-all;">Or paste this link into your browser: ${resetLink}</p>`,
    expiryLine: 'This link expires in 24 hours. If you did not request this, your password will not be changed.',
  });
  return { subject, text, html };
}

export function otpEmailContent(code, magicLink) {
  const subject = 'Your Sultan Hanafi Royal Schools sign-in code';
  const text = `Sign in using EITHER method below:\n\n1) Enter this code: ${code}\n2) Or click this link to finish signing in directly: ${magicLink}\n\nThis expires in 10 minutes and can only be used once.`;
  const html = emailShell({
    heading: 'Your one-time sign-in code',
    bodyHtml: `
      <p style="font-weight:bold;margin-bottom:4px;">Method 1 — enter this code:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;text-align:center;">${escapeHtml(code)}</p>
      <p style="font-weight:bold;margin:22px 0 4px;">Method 2 — or finish signing in with one click:</p>
      ${buttonHtml(magicLink, 'Verify & Sign In')}
      <p style="font-size:12px;color:#8a8477;word-break:break-all;">Or paste this link into your browser: ${magicLink}</p>`,
    expiryLine: 'This code and link expire in 10 minutes and can only be used once. If you did not just try to sign in, your account is still safe — no action is needed.',
  });
  return { subject, text, html };
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
