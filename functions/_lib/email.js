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

// Institutional email design language — an official communication from
// the Office of the Founder, Head of Schools & Chairman of the Board of
// Governors, not a SaaS
// authentication notice. Colours match the real brand tokens already
// used across the platform (css/brand.css: --gold #C6A15B, --gold-
// bright #E9CE8A, --ivory #F7EEDF, --ink #2A2016), paired with a
// deeper Royal Navy (#082A66) reserved for email use specifically —
// email clients strip external stylesheets, so every value below is
// inlined; nothing here depends on css/brand.css loading.
//
// Deliberately text-first, not image-dependent: most institutional
// inboxes block remote images by default, so the crest treatment is
// typographic (letter-spaced serif + a gold rule), never a required
// logo image. Tables, not flexbox/grid, drive layout — the only markup
// that renders consistently across Outlook's Word rendering engine and
// modern webmail alike.
const NAVY = '#082A66';
const NAVY_DEEP = '#051A42';
const INK = '#2A2016';
const INK_SOFT = '#6b6255';
const GOLD = '#C6A15B';
const GOLD_BRIGHT = '#E9CE8A';
const IVORY = '#F7EEDF';
const HAIRLINE = 'rgba(198,161,91,0.35)';

function emailShell({ eyebrow, heading, introHtml, codeChamber, actionButton, bodyHtml, securityItems, fallbackLink, expiryLine }) {
  const codeChamberHtml = codeChamber ? `
    <tr><td style="padding:0 0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(160deg,${NAVY} 0%,${NAVY_DEEP} 100%);border-radius:10px;">
        <tr><td style="padding:2px;border-radius:10px;background:linear-gradient(90deg,${GOLD} 0%,${GOLD_BRIGHT} 50%,${GOLD} 100%);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(160deg,${NAVY} 0%,${NAVY_DEEP} 100%);border-radius:9px;">
            <tr><td align="center" style="padding:30px 24px 26px;">
              <div style="font-family:'Cinzel',Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${GOLD_BRIGHT};margin-bottom:14px;">${escapeHtml(codeChamber.label || 'Your Secure Access Code')}</div>
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:44px;font-weight:700;letter-spacing:10px;color:#ffffff;line-height:1;padding:2px 0 4px;">${escapeHtml(codeChamber.code)}</div>
              <div style="width:56px;height:1px;background:${GOLD};margin:16px auto;"></div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.5px;color:rgba(233,206,138,0.85);">Valid for ${escapeHtml(codeChamber.validity)} &middot; One-time use only</div>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>` : '';

  const buttonHtml = actionButton ? `
    <tr><td align="center" style="padding:6px 0 26px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:6px;background:linear-gradient(135deg,${GOLD} 0%,${GOLD_BRIGHT} 55%,${GOLD} 100%);box-shadow:0 6px 18px rgba(198,161,91,0.35);">
        <a href="${actionButton.href}" style="display:inline-block;padding:15px 42px;font-family:'Cinzel',Georgia,serif;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:${NAVY_DEEP};text-decoration:none;font-weight:700;">${escapeHtml(actionButton.label)}</a>
      </td></tr></table>
    </td></tr>` : '';

  const securityPanel = (securityItems && securityItems.length) ? `
    <tr><td style="padding:4px 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${IVORY};border:1px solid ${HAIRLINE};border-radius:8px;">
        <tr><td style="padding:18px 22px;">
          <div style="font-family:'Cinzel',Georgia,serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${NAVY};margin-bottom:10px;">Institutional Security Notice</div>
          ${securityItems.map((item) => `<div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.7;color:${INK_SOFT};padding-left:14px;position:relative;"><span style="position:absolute;left:0;color:${GOLD};">&bull;</span>${escapeHtml(item)}</div>`).join('')}
        </td></tr>
      </table>
    </td></tr>` : '';

  const fallbackHtml = fallbackLink ? `
    <tr><td style="padding:2px 0 6px;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;letter-spacing:0.4px;text-transform:uppercase;color:${INK_SOFT};margin-bottom:6px;">Alternative Access Method</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${INK_SOFT};word-break:break-all;line-height:1.6;">If the button above does not work, copy this link into your browser: <a href="${fallbackLink}" style="color:${NAVY};">${fallbackLink}</a></div>
    </td></tr>` : '';

  return `
  <div style="background:#EFEAE0;padding:32px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 24px 48px rgba(8,42,102,0.12);">
    <tr><td style="height:4px;background:linear-gradient(90deg,${GOLD} 0%,${GOLD_BRIGHT} 45%,${GOLD} 65%,${GOLD_BRIGHT} 100%);"></td></tr>
    <tr><td align="center" style="background:linear-gradient(160deg,${NAVY} 0%,${NAVY_DEEP} 100%);padding:36px 24px 28px;">
      <div style="font-family:'Cinzel',Georgia,'Times New Roman',serif;font-size:19px;letter-spacing:4px;color:#ffffff;font-weight:700;">SULTAN HANAFI</div>
      <div style="font-family:'Cinzel',Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:3px;color:${GOLD_BRIGHT};margin-top:2px;">ROYAL SCHOOLS</div>
      <div style="width:64px;height:1px;background:linear-gradient(90deg,transparent,${GOLD},transparent);margin:16px auto;"></div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(233,206,138,0.8);">${escapeHtml(eyebrow || 'Secure Institutional Access')}</div>
    </td></tr>
    <tr><td style="padding:36px 40px 8px;">
      <div style="font-family:'Cinzel',Georgia,serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-bottom:10px;">Office of the Founder, Head of Schools &amp; Chairman of the Board of Governors</div>
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;color:${NAVY};margin:0 0 18px;line-height:1.3;">${escapeHtml(heading)}</h1>
      ${introHtml ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:${INK};margin-bottom:22px;">${introHtml}</div>` : ''}
    </td></tr>
    <tr><td style="padding:0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody>
        ${codeChamberHtml}
        ${buttonHtml}
        ${bodyHtml ? `<tr><td style="padding:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;line-height:1.7;color:${INK};">${bodyHtml}</td></tr>` : ''}
        ${securityPanel}
        ${fallbackHtml}
      </tbody></table>
    </td></tr>
    <tr><td style="padding:8px 40px 32px;">
      ${expiryLine ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${INK_SOFT};margin-top:4px;">${escapeHtml(expiryLine)}</div>` : ''}
    </td></tr>
    <tr><td style="background:${NAVY_DEEP};padding:26px 40px;">
      <div style="font-family:'Cinzel',Georgia,serif;font-size:12px;letter-spacing:1.5px;color:${GOLD_BRIGHT};">SULTAN HANAFI ROYAL SCHOOLS</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;color:rgba(247,238,223,0.6);margin-top:6px;line-height:1.7;">
        Digital Campus Identity Platform &middot; Lagos, Nigeria<br/>
        Official Digital Infrastructure<br/>
        &copy; Sultan Hanafi Royal Schools. All Rights Reserved.
      </div>
    </td></tr>
  </table>
  </div>`;
}

export function verificationEmailContent(fullName, verifyLink, code) {
  const subject = 'Verify your Sultan Hanafi Royal Schools account';
  const text = `Hello ${fullName},\n\nTo continue securely into the Sultan Hanafi Royal Schools Digital Campus, verify your email using EITHER method below:\n\n1) Click this link: ${verifyLink}\n2) Or enter this code on the verification page: ${code}\n\nThis expires in 24 hours and can only be used once.\n\nIf you did not request this, no action is needed — nothing changes on your account.`;
  const html = emailShell({
    eyebrow: 'Digital Identity Verification',
    heading: `Welcome, ${fullName}`,
    introHtml: `<p style="margin:0;">To continue securely into the Sultan Hanafi Royal Schools Digital Campus, please use the verification code below, or complete verification with a single click.</p>`,
    codeChamber: { label: 'Your Verification Code', code, validity: '24 hours' },
    actionButton: { href: verifyLink, label: 'Verify My Account' },
    securityItems: [
      'Code expires after 24 hours',
      'One-time use only',
      'Generated specifically for your account',
      'No action required if this request was not initiated by you',
    ],
    fallbackLink: verifyLink,
    expiryLine: 'This verification (both the link and the code above) expires in 24 hours and can only be used once.',
  });
  return { subject, text, html };
}

export function resetPasswordEmailContent(resetLink) {
  const subject = 'Reset your Sultan Hanafi Royal Schools password';
  const text = `A password reset was requested for your Sultan Hanafi Royal Schools account. If this was you, choose a new password here:\n${resetLink}\n\nThis link expires in 24 hours. If you didn't request this, you can ignore this email — your password will not be changed.`;
  const html = emailShell({
    eyebrow: 'Secure Institutional Access',
    heading: 'Reset Your Password',
    introHtml: `<p style="margin:0;">A password reset was requested for your Sultan Hanafi Royal Schools account. If this was you, choose a new password using the secure link below.</p>`,
    actionButton: { href: resetLink, label: 'Choose New Password' },
    securityItems: [
      'Link expires after 24 hours',
      'One-time use only',
      'Your current password remains unchanged until you complete this step',
      'No action required if this request was not initiated by you',
    ],
    fallbackLink: resetLink,
    expiryLine: 'This link expires in 24 hours. If you did not request this, your password will not be changed.',
  });
  return { subject, text, html };
}

export function otpEmailContent(code, magicLink) {
  const subject = 'Your Sultan Hanafi Royal Schools sign-in code';
  const text = `To continue securely into the Sultan Hanafi Royal Schools Digital Campus, use EITHER method below:\n\n1) Enter this code: ${code}\n2) Or click this link to finish signing in directly: ${magicLink}\n\nThis expires in 10 minutes and can only be used once.`;
  const html = emailShell({
    eyebrow: 'Secure Institutional Access',
    heading: 'Confirm Your Sign-In',
    introHtml: `<p style="margin:0;">To continue securely into the Sultan Hanafi Royal Schools Digital Campus, please use the verification code below.</p>`,
    codeChamber: { label: 'Your Secure Access Code', code, validity: '10 minutes' },
    actionButton: { href: magicLink, label: 'Verify & Sign In' },
    securityItems: [
      'Code expires after 10 minutes',
      'One-time use only',
      'Generated specifically for your account',
      'No action required if this request was not initiated by you',
    ],
    fallbackLink: magicLink,
    expiryLine: 'This code and link expire in 10 minutes and can only be used once. If you did not just try to sign in, your account is still safe — no action is needed.',
  });
  return { subject, text, html };
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
