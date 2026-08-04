// Founder Authority Framework — a read-only, institution-wide register
// making three kinds of authority events traceable: Appointments (real
// office_appointments rows), Role Grants/Revocations (real staff_roles
// rows), and Delegations (real delegations rows). No new schema: every
// event here already existed somewhere in the database with "nowhere to
// render" — the same reasoning behind js/portal-office-switcher.js — this
// is the same data, merged into one chronological Authority Register
// instead of three separate tables nobody could see end-to-end.
//
// "Founder & CEO remains the Supreme Appointing Authority... every
// appointment traceable, every removal traceable, every delegation
// traceable" (Founder Authority Framework directive): this endpoint is
// that traceability layer. It does not change who CAN appoint or
// delegate — functions/api/portal/admin/staff.js's requireExeToTouchExe
// already enforces that only an existing EXE can grant or revoke EXE
// itself, and functions/api/portal/staff/delegations.js already enforces
// that nobody can delegate authority they don't hold. This endpoint
// answers "who did what, when, why" after the fact.
//
// Same auth model as admin/staff.js (staff session with staff_records MU,
// falling back to PORTAL_SYSADMIN_TOKEN) — this is exactly as sensitive
// as the data admin/staff.js already exposes, so it is gated identically
// rather than getting a weaker check of its own.
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest, timingSafeEqualString } from '../../../_lib/session.js';
import { hasPermissionFor } from '../../../_lib/permissions.js';
import { json } from '../../../_lib/http.js';

async function resolveAuth(request, env) {
  if (env.SESSION_SECRET) {
    let session = null;
    try {
      session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
    } catch {
      session = null;
    }
    if (session) return { method: 'staff_session', staffId: session.staffId };
  }
  const sysadminToken = env.PORTAL_SYSADMIN_TOKEN;
  if (sysadminToken && timingSafeEqualString(request.headers.get('x-sysadmin-token'), sysadminToken)) {
    return { method: 'bearer_token', staffId: null };
  }
  return null;
}

export async function onRequestGet({ request, env }) {
  const sql = getSql(env);
  if (!sql) return json({ error: 'No database is linked yet.' }, 500);
  const auth = await resolveAuth(request, env);
  if (!auth) return json({ error: 'Not signed in, and no valid system administrator token was supplied.' }, 403);
  if (auth.method === 'staff_session') {
    const grant = await hasPermissionFor(sql, auth.staffId, 'staff_records', 'MU', null);
    if (!grant.granted) {
      return json({ error: 'Your role does not have authority to view the Authority Register (staff_records: MU).' }, 403);
    }
  }

  const url = new URL(request.url);
  const staffNoFilter = url.searchParams.get('staffNo');
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '150', 10) || 150, 1), 500);

  try {
    let staffIdFilter = null;
    if (staffNoFilter) {
      const r = await sql`SELECT id FROM staff WHERE staff_no = ${staffNoFilter}`;
      if (!r.rows.length) return json({ error: 'No staff member found with that Staff ID.' }, 404);
      staffIdFilter = r.rows[0].id;
    }

    const [appointmentsRes, rolesRes, delegationsRes] = await Promise.all([
      sql`
        SELECT oa.id, oa.appointment_title, oa.is_acting, oa.started_at, oa.ended_at, oa.created_at, oa.notes,
               o.name AS office_name, s.full_name AS staff_name, s.staff_no AS staff_no
        FROM office_appointments oa
        JOIN offices o ON o.id = oa.office_id
        LEFT JOIN staff s ON s.id = oa.staff_id
        WHERE oa.staff_id IS NOT NULL AND (${staffIdFilter}::int IS NULL OR oa.staff_id = ${staffIdFilter})
        ORDER BY oa.created_at DESC LIMIT ${limit}`,
      sql`
        SELECT sr.id, sr.role_code, rl.name AS role_name, sr.granted_at, sr.revoked_at,
               s.full_name AS staff_name, s.staff_no AS staff_no,
               granter.full_name AS granted_by_name, revoker.full_name AS revoked_by_name,
               o.name AS office_name, i.name AS institution_name
        FROM staff_roles sr
        JOIN roles rl ON rl.code = sr.role_code
        JOIN staff s ON s.id = sr.staff_id
        LEFT JOIN staff granter ON granter.id = sr.granted_by
        LEFT JOIN staff revoker ON revoker.id = sr.revoked_by
        LEFT JOIN offices o ON o.id = sr.office_id
        LEFT JOIN institutions i ON i.id = sr.institution_id
        WHERE (${staffIdFilter}::int IS NULL OR sr.staff_id = ${staffIdFilter})
        ORDER BY sr.granted_at DESC LIMIT ${limit}`,
      sql`
        SELECT d.id, d.role_code, rl.name AS role_name, d.reason, d.starts_at, d.ends_at, d.revoked_at, d.created_at,
               delegator.full_name AS delegator_name, delegate.full_name AS delegate_name,
               revoker.full_name AS revoked_by_name
        FROM delegations d
        JOIN roles rl ON rl.code = d.role_code
        JOIN staff delegator ON delegator.id = d.delegator_staff_id
        JOIN staff delegate ON delegate.id = d.delegate_staff_id
        LEFT JOIN staff revoker ON revoker.id = d.revoked_by
        WHERE (${staffIdFilter}::int IS NULL OR d.delegator_staff_id = ${staffIdFilter} OR d.delegate_staff_id = ${staffIdFilter})
        ORDER BY d.created_at DESC LIMIT ${limit}`,
    ]);

    const events = [];

    for (const a of appointmentsRes.rows) {
      events.push({
        at: a.created_at, category: 'appointment', action: 'appointed',
        summary: `${a.staff_name || 'Vacant seat'} appointed ${a.appointment_title}${a.is_acting ? ' (Acting)' : ''} — ${a.office_name}`,
        staffNo: a.staff_no, reason: a.notes || null,
      });
      if (a.ended_at) {
        events.push({
          at: a.ended_at, category: 'appointment', action: 'removed',
          summary: `${a.staff_name || 'Seat holder'} ended their appointment as ${a.appointment_title} — ${a.office_name}`,
          staffNo: a.staff_no, reason: a.notes || null,
        });
      }
    }

    for (const r of rolesRes.rows) {
      const isExe = r.role_code === 'EXE';
      events.push({
        at: r.granted_at, category: isExe ? 'executive_authority' : 'role', action: 'granted',
        summary: `${r.staff_name} granted ${r.role_name}${r.office_name ? ' — ' + r.office_name : ''}${r.institution_name ? ' (' + r.institution_name + ')' : ''}`
          + (r.granted_by_name ? `, by ${r.granted_by_name}` : ''),
        staffNo: r.staff_no, reason: null,
      });
      if (r.revoked_at) {
        events.push({
          at: r.revoked_at, category: isExe ? 'executive_authority' : 'role', action: 'revoked',
          summary: `${r.staff_name}'s ${r.role_name} role was revoked` + (r.revoked_by_name ? `, by ${r.revoked_by_name}` : ''),
          staffNo: r.staff_no, reason: null,
        });
      }
    }

    for (const d of delegationsRes.rows) {
      events.push({
        at: d.created_at, category: 'delegation', action: 'created',
        summary: `${d.delegator_name} delegated ${d.role_name} to ${d.delegate_name} until ${new Date(d.ends_at).toISOString().slice(0, 10)}`,
        reason: d.reason,
      });
      if (d.revoked_at) {
        events.push({
          at: d.revoked_at, category: 'delegation', action: 'revoked',
          summary: `${d.delegator_name}'s delegation of ${d.role_name} to ${d.delegate_name} was revoked early` + (d.revoked_by_name ? ` by ${d.revoked_by_name}` : ''),
          reason: null,
        });
      }
    }

    events.sort((x, y) => new Date(y.at) - new Date(x.at));

    return json({ ok: true, events: events.slice(0, limit) });
  } catch (err) {
    console.error('authority register error', err);
    return json({ error: 'Could not load the Authority Register: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
