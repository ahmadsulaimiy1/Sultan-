// The one-click half of dual-method login OTP — see verify-otp.js for
// the typed-code half (both are always emailed together; see
// login.js/student/login.js/staff/login.js). Clicking this link and
// typing the 6-digit code prove exactly the same thing (control of the
// inbox the code/link were sent to), so this endpoint reuses the same
// login_otp_codes row and consumes it the same way — whichever method
// the person uses first wins, the other simply becomes invalid.
//
// A GET endpoint (not POST) on purpose: it exists to be clicked
// directly from an email client, which only ever issues GET navigations.
import { getSql } from '../../_lib/db.js';
import {
  createSessionCookie, createStudentSessionCookie, createStaffSessionCookie,
  createGuardianTrustCookie, createStudentTrustCookie, createStaffTrustCookie,
} from '../../_lib/session.js';

const DASHBOARD_BY_ROLE = {
  guardian: '/portal/dashboard/',
  student: '/portal/student/dashboard/',
  staff: '/portal/staff/identity/',
};

function htmlErrorPage(message) {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">` +
    `<title>Sign-in link — Sultan Hanafi Royal Schools</title>` +
    `<link rel="stylesheet" href="/css/brand.css"><link rel="stylesheet" href="/css/portal.css"></head>` +
    `<body class="portal-body"><main class="portal-main"><div class="portal-card">` +
    `<h1>Couldn't sign you in with this link</h1><p class="sub">${message}</p>` +
    `<a class="portal-back-link" href="/portal/login/">Parent/Guardian sign in →</a><br>` +
    `<a class="portal-back-link" href="/portal/student/login/">Student sign in →</a><br>` +
    `<a class="portal-back-link" href="/portal/staff/login/">Staff sign in →</a>` +
    `</div></main></body></html>`,
    { status: 400, headers: { 'content-type': 'text/html', 'cache-control': 'no-store' } }
  );
}

async function actorLookup(sql, actorType, actorId) {
  if (actorType === 'guardian') return (await sql`SELECT full_name, email AS identifier, trust_version FROM guardians WHERE id = ${actorId}`).rows[0] || null;
  if (actorType === 'student') return (await sql`SELECT full_name, admission_no AS identifier, trust_version FROM students WHERE id = ${actorId}`).rows[0] || null;
  if (actorType === 'staff') return (await sql`SELECT full_name, staff_no AS identifier, trust_version FROM staff WHERE id = ${actorId}`).rows[0] || null;
  return null;
}

async function logAttempt(sql, actorType, actorId, identifier, event) {
  try {
    await sql`INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event) VALUES (${actorType}, ${actorId || null}, ${identifier || null}, ${event})`;
  } catch (err) {
    console.error('auth_audit_log insert failed', err);
  }
}

export async function onRequestGet({ request, env }) {
  if (!env.SESSION_SECRET) {
    return htmlErrorPage('The portal is not configured yet — please try again later.');
  }
  const sql = getSql(env);
  if (!sql) {
    return htmlErrorPage('The portal is not configured yet — please try again later.');
  }

  const token = new URL(request.url).searchParams.get('token') || '';
  if (!token) {
    return htmlErrorPage('This link is missing its sign-in token — please use the exact link from your email, or sign in with the code instead.');
  }

  try {
    const result = await sql`
      SELECT id, actor_type, actor_id, expires_at, consumed_at
      FROM login_otp_codes WHERE login_token = ${token}`;
    const row = result.rows[0];

    if (!row || row.consumed_at || new Date(row.expires_at).getTime() < Date.now()) {
      return htmlErrorPage('This link has expired or has already been used — please sign in again. The 6-digit code from the same email works too, as long as it hasn\'t expired.');
    }

    const actor = await actorLookup(sql, row.actor_type, row.actor_id);
    const dashboardUrl = DASHBOARD_BY_ROLE[row.actor_type];
    if (!actor || !dashboardUrl) {
      return htmlErrorPage('Something went wrong verifying this link — please sign in again.');
    }

    await sql`UPDATE login_otp_codes SET consumed_at = now() WHERE id = ${row.id}`;
    await logAttempt(sql, row.actor_type, row.actor_id, actor.identifier, 'login_success_via_link');

    let cookies;
    if (row.actor_type === 'guardian') cookies = [createSessionCookie(row.actor_id, env.SESSION_SECRET), createGuardianTrustCookie(row.actor_id, actor.trust_version, env.SESSION_SECRET)];
    else if (row.actor_type === 'student') cookies = [createStudentSessionCookie(row.actor_id, env.SESSION_SECRET), createStudentTrustCookie(row.actor_id, actor.trust_version, env.SESSION_SECRET)];
    else cookies = [createStaffSessionCookie(row.actor_id, env.SESSION_SECRET), createStaffTrustCookie(row.actor_id, actor.trust_version, env.SESSION_SECRET)];

    const headers = new Headers({ Location: dashboardUrl, 'cache-control': 'no-store' });
    cookies.forEach((c) => headers.append('Set-Cookie', c));
    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error('portal verify-login-link error', err);
    return htmlErrorPage('Could not verify this link right now — please try again shortly, or sign in with the code instead.');
  }
}
