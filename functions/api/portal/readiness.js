// Readiness — what is configured, what is not, and what each missing
// piece is holding shut.
//
// Every system in this project fails honestly rather than silently, but
// each one fails in its own place: the assistant says "not configured
// yet" in a chat panel, sign-in says "portal is not configured", email
// returns { sent: false, reason: 'not_configured' } to a caller nobody
// watches. Diagnosing the whole thing meant visiting each surface and
// reading its error. This answers all of it in one request.
//
// WHAT THIS DELIBERATELY NEVER RETURNS
//
// No secret value, ever — not a prefix, not a length, not a masked
// form. Only whether a name is set. A readiness report that leaks the
// shape of a key is worse than no readiness report, and "length" alone
// narrows a brute force.
//
// It is also not public. Knowing precisely which credentials a site is
// missing is reconnaissance, so this needs a signed-in staff session or
// PORTAL_SYSADMIN_TOKEN — the same bootstrap credential the Admin
// Centre uses, because the moment you most need this page is before any
// account exists.
//
// The one exception: if no token is configured AND there is no session,
// it says exactly that and nothing else. Without a token this endpoint
// cannot be used at all, so naming that single fact discloses nothing
// an attacker could act on, and it is the first thing to fix anyway.
import { getSql } from '../../_lib/db.js';
import { readStaffSessionFromRequest, timingSafeEqualString } from '../../_lib/session.js';
import { json } from '../../_lib/http.js';

// name -> what stops working without it. Written for whoever is trying
// to open the school, not for whoever wrote the code.
const SECRETS = [
  { name: 'DATABASE_URL', group: 'Core', blocks: 'Every portal, every login, every record. Nothing that stores data works without it.' },
  { name: 'SESSION_SECRET', group: 'Core', blocks: 'All sign-in. Without it, the portals answer "not configured" to everybody.' },
  { name: 'PORTAL_SYSADMIN_TOKEN', group: 'Core', blocks: 'The Admin Centre before any account exists, and the way back in if every privileged account is locked out.' },
  { name: 'RESEND_API_KEY', group: 'Email', blocks: 'Every email: account verification, password reset, login codes, activation links, and escalation alerts.' },
  { name: 'EMAIL_FROM_ADDRESS', group: 'Email', blocks: 'The same. Resend needs a verified sending address as well as a key.' },
  { name: 'ANTHROPIC_API_KEY', group: 'Assistant', blocks: 'The Digital Academic Assistant, on the website and on WhatsApp. Nothing answers.' },
  { name: 'TWILIO_AUTH_TOKEN', group: 'WhatsApp', blocks: 'The WhatsApp webhook. It refuses every request rather than accepting unverified ones.' },
  { name: 'TWILIO_ACCOUNT_SID', group: 'WhatsApp', blocks: 'Reading photos people send on WhatsApp. Text still works without it.', optional: true },
  { name: 'VAPID_PUBLIC_KEY', group: 'Push', blocks: 'Web push notifications to families when an announcement is published.' },
  { name: 'VAPID_PRIVATE_KEY', group: 'Push', blocks: 'The same.' },
  { name: 'VAPID_SUBJECT', group: 'Push', blocks: 'The same — a contact mailto: the push services require.' },
  { name: 'DOCUMENT_HASH_SECRET', group: 'Documents', blocks: 'Certificate and transcript verification hashes.' },
  { name: 'PORTAL_SETUP_TOKEN', group: 'Core', blocks: 'Running the one-time database setup.', optional: true },
  { name: 'ESCALATION_EMAIL', group: 'Email', blocks: 'Nothing — escalations go to info@shroyalschools.com unless this names somewhere else.', optional: true },
  { name: 'ANTHROPIC_MODEL', group: 'Assistant', blocks: 'Nothing — the assistant uses its default model unless this overrides it.', optional: true },
];

function authorise(request, env) {
  if (env.SESSION_SECRET) {
    try {
      if (readStaffSessionFromRequest(request, env.SESSION_SECRET)) return 'session';
    } catch { /* fall through to the token */ }
  }
  if (env.PORTAL_SYSADMIN_TOKEN) {
    const supplied = request.headers.get('x-sysadmin-token');
    if (supplied && timingSafeEqualString(supplied, env.PORTAL_SYSADMIN_TOKEN)) return 'token';
    return null;
  }
  return 'no_token_configured';
}

// Counts that answer "can anybody actually use this yet". Each query is
// isolated so one missing table cannot blank the whole report — this
// runs precisely when the database may be half set up.
async function census(sql) {
  const out = {};
  const queries = {
    staff: sql`SELECT count(*)::int AS n FROM staff`,
    staffWithLogin: sql`SELECT count(*)::int AS n FROM staff_accounts WHERE password_hash IS NOT NULL`,
    administrators: sql`
      SELECT count(DISTINCT staff_id)::int AS n FROM staff_roles
      WHERE role_code IN ('EXE', 'SYSADMIN') AND is_active = true AND revoked_at IS NULL`,
    registrars: sql`
      SELECT count(DISTINCT staff_id)::int AS n FROM staff_roles
      WHERE role_code = 'REG' AND is_active = true AND revoked_at IS NULL`,
    guardians: sql`SELECT count(*)::int AS n FROM guardians`,
    students: sql`SELECT count(*)::int AS n FROM students`,
    announcementsPublished: sql`SELECT count(*)::int AS n FROM announcements WHERE status = 'published'`,
    openEscalations: sql`SELECT count(*)::int AS n FROM assistant_escalations WHERE status = 'open'`,
  };
  await Promise.all(Object.entries(queries).map(async ([key, q]) => {
    try { out[key] = (await q).rows[0].n; } catch { out[key] = null; }
  }));
  return out;
}

export async function onRequestGet({ request, env }) {
  const auth = authorise(request, env);
  if (!auth) {
    return json({ error: 'Not authorised.' }, 403);
  }
  if (auth === 'no_token_configured') {
    return json({
      configured: false,
      message: 'PORTAL_SYSADMIN_TOKEN is not set in this deployment. Set it in Cloudflare Pages → Settings → Variables and secrets, redeploy, then reload this page.',
    }, 503);
  }

  const secrets = SECRETS.map((s) => ({
    name: s.name,
    group: s.group,
    optional: Boolean(s.optional),
    // Presence only. Never the value, never its length.
    set: Boolean(env[s.name]),
    blocks: s.blocks,
  }));

  const sql = getSql(env);
  let database = { linked: false, reachable: false, error: null };
  let counts = null;
  if (sql) {
    database.linked = true;
    try {
      await sql`SELECT 1`;
      database.reachable = true;
      counts = await census(sql);
    } catch (err) {
      database.error = 'The connection string is set but the database did not answer.';
    }
  }

  // The questions people actually ask, answered from the two above
  // rather than left for the reader to assemble.
  const canAnyoneSignIn = Boolean(env.SESSION_SECRET) && database.reachable && counts && counts.staffWithLogin > 0;
  const readiness = {
    portalsOpen: canAnyoneSignIn,
    someoneCanAdminister: Boolean(counts && counts.administrators > 0),
    emailWorks: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM_ADDRESS),
    assistantWorks: Boolean(env.ANTHROPIC_API_KEY),
    whatsappWorks: Boolean(env.ANTHROPIC_API_KEY && env.TWILIO_AUTH_TOKEN),
    pushWorks: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT),
  };

  return json({
    configured: true,
    checkedVia: auth,
    database,
    counts,
    secrets,
    readiness,
    note: 'Environment variables only take effect on a new deployment. After changing any of them, use Deployments → Retry deployment.',
  });
}
