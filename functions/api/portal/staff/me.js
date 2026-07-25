// Staff identity endpoint — deliberately an identity card, not a
// dashboard. Returns who this staff member is (directory fields), where
// they sit (office/department/institution), who they report to, every
// role they effectively hold right now (their own staff_roles plus any
// active delegation naming them as delegate), and any delegations they
// have given away. No "tools," no per-role task list, no admin
// controls — those belong to whichever future office module
// (Registrar's Office, Teacher Portal, etc.) actually needs them, per
// the explicit instruction not to build a dashboard/admin panel in this
// phase. See docs/staff-identity-architecture.md.
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json } from '../../../_lib/http.js';
import { effectiveGrants } from '../../../_lib/permissions.js';

export async function onRequestGet({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  if (!session) {
    return json({ error: 'Not signed in.' }, 401);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  try {
    const staffRes = await sql`
      SELECT
        s.id, s.staff_no, s.full_name, s.preferred_name, s.position_title, s.status, s.date_joined,
        o.id AS office_id, o.name AS office_name, o.office_type,
        d.id AS dept_id, d.name AS dept_name,
        i.id AS institution_id, i.name AS institution_name,
        r.id AS reports_to_id, r.full_name AS reports_to_name, r.position_title AS reports_to_position
      FROM staff s
      LEFT JOIN offices o ON o.id = s.office_id
      LEFT JOIN departments d ON d.id = s.department_id
      LEFT JOIN institutions i ON i.id = s.institution_id
      LEFT JOIN staff r ON r.id = s.reports_to_staff_id
      WHERE s.id = ${session.staffId}`;
    const staff = staffRes.rows[0];
    if (!staff) {
      return json({ error: 'Not signed in.' }, 401);
    }

    const [institutionsRes, rolesRes, delegationsHeldRes, delegationsGivenRes, grants] = await Promise.all([
      sql`
        SELECT i.id, i.name, si.is_primary
        FROM staff_institutions si JOIN institutions i ON i.id = si.institution_id
        WHERE si.staff_id = ${staff.id}
        ORDER BY si.is_primary DESC, i.name`,
      sql`
        SELECT sr.role_code, rl.name AS role_name, rl.status AS role_status,
               i.id AS institution_id, i.name AS institution_name,
               o.id AS office_id, o.name AS office_name, sr.granted_at
        FROM staff_roles sr
        JOIN roles rl ON rl.code = sr.role_code
        LEFT JOIN institutions i ON i.id = sr.institution_id
        LEFT JOIN offices o ON o.id = sr.office_id
        WHERE sr.staff_id = ${staff.id} AND sr.is_active = true AND sr.revoked_at IS NULL
        ORDER BY sr.granted_at`,
      sql`
        SELECT dl.role_code, rl.name AS role_name, dl.reason, dl.starts_at, dl.ends_at,
               del.full_name AS delegator_name, del.position_title AS delegator_position
        FROM delegations dl
        JOIN roles rl ON rl.code = dl.role_code
        JOIN staff del ON del.id = dl.delegator_staff_id
        WHERE dl.delegate_staff_id = ${staff.id} AND dl.revoked_at IS NULL AND now() BETWEEN dl.starts_at AND dl.ends_at
        ORDER BY dl.ends_at`,
      sql`
        SELECT dl.id, dl.role_code, rl.name AS role_name, dl.reason, dl.starts_at, dl.ends_at,
               dg.full_name AS delegate_name, dg.position_title AS delegate_position
        FROM delegations dl
        JOIN roles rl ON rl.code = dl.role_code
        JOIN staff dg ON dg.id = dl.delegate_staff_id
        WHERE dl.delegator_staff_id = ${staff.id} AND dl.revoked_at IS NULL AND now() BETWEEN dl.starts_at AND dl.ends_at
        ORDER BY dl.ends_at`,
      effectiveGrants(sql, staff.id),
    ]);

    return json({
      staff: {
        staffNo: staff.staff_no,
        fullName: staff.full_name,
        preferredName: staff.preferred_name,
        positionTitle: staff.position_title,
        status: staff.status,
        dateJoined: staff.date_joined,
        office: staff.office_id ? { id: staff.office_id, name: staff.office_name, type: staff.office_type } : null,
        department: staff.dept_id ? { id: staff.dept_id, name: staff.dept_name } : null,
        institution: staff.institution_id ? { id: staff.institution_id, name: staff.institution_name } : null,
        institutions: institutionsRes.rows.map((r) => ({ id: r.id, name: r.name, isPrimary: r.is_primary })),
        reportsTo: staff.reports_to_id ? { id: staff.reports_to_id, fullName: staff.reports_to_name, positionTitle: staff.reports_to_position } : null,
      },
      roles: rolesRes.rows.map((r) => ({
        roleCode: r.role_code, roleName: r.role_name, roleStatus: r.role_status,
        institution: r.institution_id ? { id: r.institution_id, name: r.institution_name } : null,
        office: r.office_id ? { id: r.office_id, name: r.office_name } : null,
        grantedAt: r.granted_at,
      })),
      delegationsHeld: delegationsHeldRes.rows.map((r) => ({
        roleCode: r.role_code, roleName: r.role_name, reason: r.reason,
        startsAt: r.starts_at, endsAt: r.ends_at,
        delegatedBy: { fullName: r.delegator_name, positionTitle: r.delegator_position },
      })),
      delegationsGiven: delegationsGivenRes.rows.map((r) => ({
        id: r.id, roleCode: r.role_code, roleName: r.role_name, reason: r.reason,
        startsAt: r.starts_at, endsAt: r.ends_at,
        delegatedTo: { fullName: r.delegate_name, positionTitle: r.delegate_position },
      })),
      effectiveGrantCount: grants.length,
    });
  } catch (err) {
    console.error('staff portal me error', err);
    return json({ error: 'Could not load your identity record right now — please try again shortly.' }, 500);
  }
}
