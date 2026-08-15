// Break-glass account recovery, held by PORTAL_SETUP_TOKEN.
//
// WHY THIS EXISTS, AND WHY IT IS NOT A NEW HOLE.
//
// Every ordinary route into staff administration needs something the
// person locked out does not have: the Admin Centre needs a session or
// PORTAL_SYSADMIN_TOKEN, and setting an email or issuing an activation
// link needs Manage Users, which only a signed-in administrator holds. So
// an institution can arrive at a state — and this one did — where the
// only account that can administer anything cannot sign in, its record
// carries no email to reset through, and the sysadmin token is unset or
// lost. At that point there is no way back in at all short of editing the
// database by hand.
//
// PORTAL_SETUP_TOKEN is the answer because it is already the most
// powerful credential in the deployment: whoever holds it can run
// functions/api/portal/setup.js, which creates and alters every table in
// the schema. Someone with that token already owns the system completely.
// Letting them also put an email on a staff record and issue that person
// an activation link grants no authority they did not already have — it
// only spares them writing SQL by hand at three in the morning.
//
// What it deliberately CANNOT do:
//   - set or reveal anybody's password (only a fresh activation link,
//     which the account holder uses to choose their own)
//   - return an existing token, hash or secret
//   - grant a role, or touch the permission system in any way
//
// Every action is written to auth_audit_log against the staff member,
// marked as a break-glass recovery, so it can never be done quietly.
import { getSql } from '../../../_lib/db.js';
import { timingSafeEqualString, generateToken } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';

const ACTIVATION_TOKEN_TTL_DAYS = 7;

export async function onRequestPost({ request, env }) {
  const setupToken = env.PORTAL_SETUP_TOKEN;
  if (!setupToken) {
    return json({ error: 'PORTAL_SETUP_TOKEN is not set on this deployment.' }, 500);
  }
  if (!timingSafeEqualString(request.headers.get('x-setup-token'), setupToken)) {
    return json({ error: 'Invalid setup token.' }, 403);
  }
  const sql = getSql(env);
  if (!sql) return json({ error: 'No database is linked yet.' }, 500);

  const body = await readJsonBody(request);
  const action = (body && body.action) || 'list';

  try {
    // Who exists, and what state each account is in. Names and addresses
    // only — never a hash, never a live token.
    if (action === 'list') {
      const r = await sql`
        SELECT s.id, s.staff_no, s.full_name, s.email, s.status,
               (sa.password_hash IS NOT NULL) AS has_password,
               (sa.reset_token IS NOT NULL) AS has_live_link,
               sa.reset_token_expires
        FROM staff s
        LEFT JOIN staff_accounts sa ON sa.staff_id = s.id
        ORDER BY s.id
        LIMIT 200`;
      return json({ ok: true, staff: r.rows.map((x) => ({
        staffNo: x.staff_no, fullName: x.full_name, email: x.email, status: x.status,
        hasPassword: x.has_password, hasLiveLink: x.has_live_link, linkExpires: x.reset_token_expires,
      })) });
    }

    if (action === 'recover') {
      const staffNo = ((body && body.staffNo) || '').trim();
      if (!staffNo) return json({ error: 'staffNo is required.' }, 400);
      const found = await sql`SELECT id, full_name, email FROM staff WHERE staff_no = ${staffNo}`;
      if (!found.rows.length) return json({ error: 'No staff member with that Staff ID.' }, 404);
      const staff = found.rows[0];

      // The email is optional here: recovery may be only "issue me a link".
      const email = body.email === undefined || body.email === null
        ? null : String(body.email).trim().toLowerCase();
      if (email) {
        if (!/^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/.test(email)) {
          return json({ error: 'That does not look like an email address.' }, 400);
        }
        const clash = await sql`
          SELECT staff_no FROM staff WHERE lower(email) = ${email} AND id <> ${staff.id}`;
        if (clash.rows.length) {
          return json({ error: `That address is already on ${clash.rows[0].staff_no}'s record.` }, 409);
        }
        await sql`
          UPDATE staff SET email = ${email},
            -- a changed address changes where sign-in codes go, so any
            -- trusted-device cookie issued against the old one must stop
            -- being honoured
            trust_version = trust_version + 1, updated_at = now()
          WHERE id = ${staff.id}`;
      }

      const token = generateToken();
      await sql`
        INSERT INTO staff_accounts (staff_id, reset_token, reset_token_expires)
        VALUES (${staff.id}, ${token}, now() + make_interval(days => ${ACTIVATION_TOKEN_TTL_DAYS}))
        ON CONFLICT (staff_id) DO UPDATE SET
          reset_token = EXCLUDED.reset_token,
          reset_token_expires = EXCLUDED.reset_token_expires,
          failed_attempts = 0, locked_until = NULL`;

      await sql`
        INSERT INTO auth_audit_log (actor_type, actor_id, identifier, event)
        VALUES ('staff', ${staff.id}, ${email || staff.email},
                ${'break_glass_recovery' + (email ? '_email_set' : '')})`;

      return json({ ok: true, staffNo, fullName: staff.full_name,
        email: email || staff.email,
        activationLink: '/portal/staff/set-password/?token=' + token,
        expiresInDays: ACTIVATION_TOKEN_TTL_DAYS,
        note: 'Any activation link issued before this one has stopped working.' });
    }

    return json({ error: "Unknown action. Expected 'list' or 'recover'." }, 400);
  } catch (err) {
    console.error('break-glass recovery error', err);
    return json({ error: 'Recovery failed: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
