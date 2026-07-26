// Token-protected bootstrap endpoint for the SHRS Identity & Access
// Platform's Organisational Directory, Staff Data Model, and Role
// Assignment Engine. Deliberately gated by its OWN token
// (PORTAL_SYSADMIN_TOKEN), separate from PORTAL_ADMIN_TOKEN — per
// role-permission-matrix.md §4.20, Manage Users ("MU") is "restricted
// to exactly one operational role system-wide," the narrowest-held
// grant in the whole Matrix, and Staff Identity is this project's
// security and governance foundation, so it gets its own narrowest
// bootstrap token rather than reusing the general portal-admin one.
//
// "Bootstrap" is the operative word: every action here exists because
// nobody can be provisioned into the platform except by someone who
// already has system-level access outside it — the same reason
// admin/students.js exists as a raw API with no self-service signup.
// Once a real staff member is provisioned and can log in, SELF-SERVICE
// actions (specifically: creating a delegation) move to a
// session-authenticated endpoint instead — see
// functions/api/portal/staff/delegations.js — because at that point the
// action should be attributable to the actual logged-in person, not to
// "whoever holds this bearer token." See
// docs/staff-identity-architecture.md.
//
// One explicit `action` per request, never an implicit upsert:
//   create-office        — { name, officeType, institutionName?, parentOfficeName?, description? }
//   create-department     — { name, institutionName?, officeName? }
//   create-staff          — { staffNo, fullName, preferredName?, officeName?, departmentName?,
//                             positionTitle?, reportsToStaffNo?, institutionName?, dateJoined?,
//                             additionalInstitutions?: [{ name, isPrimary? }] }
//   update-staff-status   — { staffNo, status } (active | suspended | archived)
//   create-login          — { staffNo } -> { activationLink }, same admin-mediated model as
//                            create-student-login.js — staff never choose or see their own password
//   grant-role            — { staffNo, roleCode, institutionName?, officeName?, grantedByStaffNo?, reason? }
//   revoke-role           — { staffRoleId, revokedByStaffNo?, reason? }
//   assign-class          — { staffNo, institutionName, className, subject?, assignedByStaffNo?, reason? }
//                            Omit subject for a Class Teacher assignment (whole-class attendance
//                            authority); provide it for a Subject Teacher assignment (per-subject
//                            assessment authority) — see teacher_class_assignments in sql/schema.sql.
//                            This is the piece the Matrix's TCH scope ("own class, own period" /
//                            "own subject/class") is actually checked against — see
//                            staff/registrar/attendance.js and assessments.js.
//   revoke-class-assignment — { assignmentId, revokedByStaffNo?, reason? }
import { getSql } from '../../../_lib/db.js';
import { timingSafeEqualString, generateToken } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { logStaffEvent } from '../../../_lib/audit.js';

const ACTIVATION_TOKEN_TTL_DAYS = 7;
const OFFICE_TYPES = ['governance', 'executive', 'academic', 'support'];
const STAFF_STATUSES = ['active', 'suspended', 'archived'];

async function institutionIdByName(sql, name) {
  if (!name) return null;
  const res = await sql`SELECT id FROM institutions WHERE name = ${name}`;
  return res.rows[0] ? res.rows[0].id : null;
}
async function officeIdByName(sql, name) {
  if (!name) return null;
  const res = await sql`SELECT id FROM offices WHERE name = ${name}`;
  return res.rows[0] ? res.rows[0].id : null;
}
async function staffIdByNo(sql, staffNo) {
  if (!staffNo) return null;
  const res = await sql`SELECT id FROM staff WHERE staff_no = ${staffNo}`;
  return res.rows[0] ? res.rows[0].id : null;
}

export async function onRequestPost({ request, env }) {
  const sysadminToken = env.PORTAL_SYSADMIN_TOKEN;
  if (!sysadminToken) {
    return json({ error: 'Staff Identity administration is not configured yet — PORTAL_SYSADMIN_TOKEN is not set.' }, 500);
  }
  if (!timingSafeEqualString(request.headers.get('x-sysadmin-token'), sysadminToken)) {
    return json({ error: 'Invalid system administrator token.' }, 403);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'No database is linked yet.' }, 500);
  }

  const body = await readJsonBody(request);
  const action = body && body.action;

  try {
    if (action === 'create-office') {
      if (!body.name || !OFFICE_TYPES.includes(body.officeType)) {
        return json({ error: `name is required; officeType must be one of: ${OFFICE_TYPES.join(', ')}.` }, 400);
      }
      const institutionId = await institutionIdByName(sql, body.institutionName);
      const parentOfficeId = await officeIdByName(sql, body.parentOfficeName);
      const created = await sql`
        INSERT INTO offices (name, office_type, institution_id, parent_office_id, description)
        VALUES (${body.name}, ${body.officeType}, ${institutionId}, ${parentOfficeId}, ${body.description || null})
        ON CONFLICT (name) DO UPDATE SET office_type = EXCLUDED.office_type, institution_id = EXCLUDED.institution_id,
          parent_office_id = EXCLUDED.parent_office_id, description = EXCLUDED.description
        RETURNING id`;
      return json({ ok: true, officeId: created.rows[0].id });
    }

    if (action === 'create-department') {
      if (!body.name) {
        return json({ error: 'name is required.' }, 400);
      }
      const institutionId = await institutionIdByName(sql, body.institutionName);
      const officeId = await officeIdByName(sql, body.officeName);
      const created = await sql`
        INSERT INTO departments (name, institution_id, office_id)
        VALUES (${body.name}, ${institutionId}, ${officeId})
        RETURNING id`;
      return json({ ok: true, departmentId: created.rows[0].id });
    }

    if (action === 'create-staff') {
      if (!body.staffNo || !body.fullName) {
        return json({ error: 'staffNo and fullName are required.' }, 400);
      }
      const officeId = await officeIdByName(sql, body.officeName);
      const departmentRes = body.departmentName
        ? await sql`SELECT id FROM departments WHERE name = ${body.departmentName}`
        : { rows: [] };
      const departmentId = departmentRes.rows[0] ? departmentRes.rows[0].id : null;
      const reportsToId = await staffIdByNo(sql, body.reportsToStaffNo);
      const institutionId = await institutionIdByName(sql, body.institutionName);

      const existing = await sql`SELECT id FROM staff WHERE staff_no = ${body.staffNo}`;
      let staffId;
      if (existing.rows.length) {
        staffId = existing.rows[0].id;
        await sql`
          UPDATE staff SET full_name = ${body.fullName}, preferred_name = ${body.preferredName || null},
            office_id = ${officeId}, department_id = ${departmentId}, position_title = ${body.positionTitle || null},
            reports_to_staff_id = ${reportsToId}, institution_id = ${institutionId},
            date_joined = ${body.dateJoined || null}, updated_at = now()
          WHERE id = ${staffId}`;
      } else {
        const created = await sql`
          INSERT INTO staff (staff_no, full_name, preferred_name, office_id, department_id, position_title,
                              reports_to_staff_id, institution_id, date_joined)
          VALUES (${body.staffNo}, ${body.fullName}, ${body.preferredName || null}, ${officeId}, ${departmentId},
                  ${body.positionTitle || null}, ${reportsToId}, ${institutionId}, ${body.dateJoined || null})
          RETURNING id`;
        staffId = created.rows[0].id;
      }

      if (institutionId) {
        await sql`
          INSERT INTO staff_institutions (staff_id, institution_id, is_primary)
          VALUES (${staffId}, ${institutionId}, true)
          ON CONFLICT (staff_id, institution_id) DO UPDATE SET is_primary = true`;
      }
      if (Array.isArray(body.additionalInstitutions)) {
        for (const extra of body.additionalInstitutions) {
          if (!extra || !extra.name) continue;
          const extraId = await institutionIdByName(sql, extra.name);
          if (!extraId) continue;
          await sql`
            INSERT INTO staff_institutions (staff_id, institution_id, is_primary)
            VALUES (${staffId}, ${extraId}, ${!!extra.isPrimary})
            ON CONFLICT (staff_id, institution_id) DO NOTHING`;
        }
      }

      return json({ ok: true, staffId });
    }

    if (action === 'update-staff-status') {
      if (!body.staffNo || !STAFF_STATUSES.includes(body.status)) {
        return json({ error: `staffNo is required; status must be one of: ${STAFF_STATUSES.join(', ')}.` }, 400);
      }
      const staffId = await staffIdByNo(sql, body.staffNo);
      if (!staffId) {
        return json({ error: 'No staff member found with that Staff ID.' }, 404);
      }
      await sql`UPDATE staff SET status = ${body.status}, updated_at = now() WHERE id = ${staffId}`;
      await logStaffEvent(sql, { actorStaffId: null, eventType: 'sensitive_action', targetType: 'staff', targetId: staffId, reason: `status -> ${body.status}` });
      return json({ ok: true, staffId, status: body.status });
    }

    if (action === 'create-login') {
      if (!body.staffNo) {
        return json({ error: 'staffNo is required.' }, 400);
      }
      const staffId = await staffIdByNo(sql, body.staffNo);
      if (!staffId) {
        return json({ error: 'No staff member found with that Staff ID.' }, 404);
      }
      const token = generateToken();
      await sql`
        INSERT INTO staff_accounts (staff_id, reset_token, reset_token_expires)
        VALUES (${staffId}, ${token}, now() + make_interval(days => ${ACTIVATION_TOKEN_TTL_DAYS}))
        ON CONFLICT (staff_id) DO UPDATE SET reset_token = EXCLUDED.reset_token, reset_token_expires = EXCLUDED.reset_token_expires`;
      return json({ ok: true, staffId, activationLink: '/portal/staff/set-password/?token=' + token });
    }

    if (action === 'grant-role') {
      if (!body.staffNo || !body.roleCode) {
        return json({ error: 'staffNo and roleCode are required.' }, 400);
      }
      const staffId = await staffIdByNo(sql, body.staffNo);
      if (!staffId) {
        return json({ error: 'No staff member found with that Staff ID.' }, 404);
      }
      const roleRes = await sql`SELECT code FROM roles WHERE code = ${body.roleCode}`;
      if (!roleRes.rows.length) {
        return json({ error: 'Unknown roleCode — it must exist in the roles reference table (see role-permission-matrix.md §3).' }, 400);
      }
      const institutionId = await institutionIdByName(sql, body.institutionName);
      const officeId = await officeIdByName(sql, body.officeName);
      const grantedById = await staffIdByNo(sql, body.grantedByStaffNo);
      const created = await sql`
        INSERT INTO staff_roles (staff_id, role_code, institution_id, office_id, granted_by)
        VALUES (${staffId}, ${body.roleCode}, ${institutionId}, ${officeId}, ${grantedById})
        RETURNING id`;
      await logStaffEvent(sql, {
        actorStaffId: grantedById, eventType: 'role_granted', targetType: 'staff_role', targetId: created.rows[0].id,
        reason: body.reason || null, metadata: { staffNo: body.staffNo, roleCode: body.roleCode, institutionName: body.institutionName || null },
      });
      return json({ ok: true, staffRoleId: created.rows[0].id });
    }

    if (action === 'revoke-role') {
      if (!Number.isInteger(body.staffRoleId)) {
        return json({ error: 'A valid numeric staffRoleId is required.' }, 400);
      }
      const revokedById = await staffIdByNo(sql, body.revokedByStaffNo);
      const updated = await sql`
        UPDATE staff_roles SET is_active = false, revoked_at = now(), revoked_by = ${revokedById}
        WHERE id = ${body.staffRoleId} AND is_active = true
        RETURNING id, staff_id, role_code`;
      if (!updated.rows.length) {
        return json({ error: 'No active role assignment found with that id.' }, 404);
      }
      await logStaffEvent(sql, {
        actorStaffId: revokedById, eventType: 'role_revoked', targetType: 'staff_role', targetId: body.staffRoleId,
        reason: body.reason || null, metadata: { roleCode: updated.rows[0].role_code },
      });
      return json({ ok: true, staffRoleId: body.staffRoleId });
    }

    if (action === 'assign-class') {
      if (!body.staffNo || !body.institutionName || !body.className) {
        return json({ error: 'staffNo, institutionName, and className are required.' }, 400);
      }
      const staffId = await staffIdByNo(sql, body.staffNo);
      if (!staffId) {
        return json({ error: 'No staff member found with that Staff ID.' }, 404);
      }
      const classRes = await sql`SELECT id FROM classes WHERE institution = ${body.institutionName} AND name = ${body.className}`;
      if (!classRes.rows.length) {
        return json({ error: 'No class found with that institution and class name.' }, 404);
      }
      const classId = classRes.rows[0].id;
      const subject = body.subject ? String(body.subject).trim() : null;
      const isClassTeacher = !subject;
      const assignedById = await staffIdByNo(sql, body.assignedByStaffNo);
      const created = await sql`
        INSERT INTO teacher_class_assignments (staff_id, class_id, subject, is_class_teacher, assigned_by_staff_id)
        VALUES (${staffId}, ${classId}, ${subject}, ${isClassTeacher}, ${assignedById})
        RETURNING id`;
      await logStaffEvent(sql, {
        actorStaffId: assignedById, eventType: 'sensitive_action', targetType: 'teacher_class_assignment', targetId: created.rows[0].id,
        reason: body.reason || null, metadata: { staffNo: body.staffNo, institutionName: body.institutionName, className: body.className, subject },
      });
      return json({ ok: true, assignmentId: created.rows[0].id, isClassTeacher, subject });
    }

    if (action === 'revoke-class-assignment') {
      if (!Number.isInteger(body.assignmentId)) {
        return json({ error: 'A valid numeric assignmentId is required.' }, 400);
      }
      const revokedById = await staffIdByNo(sql, body.revokedByStaffNo);
      const updated = await sql`
        UPDATE teacher_class_assignments SET revoked_at = now(), revoked_by_staff_id = ${revokedById}
        WHERE id = ${body.assignmentId} AND revoked_at IS NULL
        RETURNING id, subject`;
      if (!updated.rows.length) {
        return json({ error: 'No active class assignment found with that id.' }, 404);
      }
      await logStaffEvent(sql, {
        actorStaffId: revokedById, eventType: 'sensitive_action', targetType: 'teacher_class_assignment', targetId: body.assignmentId,
        reason: body.reason || null, metadata: { subject: updated.rows[0].subject },
      });
      return json({ ok: true, assignmentId: body.assignmentId });
    }

    return json({ error: 'Unknown action. Expected one of: create-office, create-department, create-staff, update-staff-status, create-login, grant-role, revoke-role, assign-class, revoke-class-assignment.' }, 400);
  } catch (err) {
    console.error('portal admin staff error', err);
    return json({ error: 'Could not complete that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
