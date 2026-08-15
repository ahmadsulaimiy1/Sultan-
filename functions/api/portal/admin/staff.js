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
//   create-staff          — { staffNo, fullName, preferredName?, email?, officeName?, departmentName?,
//                             positionTitle?, reportsToStaffNo?, institutionName?, dateJoined?,
//                             additionalInstitutions?: [{ name, isPrimary? }] }
//                             email is optional — entering it is what turns on the email OTP step
//                             at this staff member's own login (see staff/login.js); omitting it
//                             leaves password-only login unchanged.
//   update-staff-status   — { staffNo, status } (active | suspended | archived)
//   set-staff-email       — { staffNo, email } — the LOGIN address: where password resets and
//                            sign-in codes are delivered. Not update-staff-profile's publicEmail,
//                            which is the directory address. Pass "" to remove it.
//   create-login          — { staffNo } -> { activationLink }, same admin-mediated model as
//                            create-student-login.js — staff never choose or see their own password.
//                            Issuing a link CANCELS any link issued before it: the row holds one
//                            token. Always relay the newest.
//   login-status          — { staffNo } -> { state, advice } — whether the account has a password,
//                            whether a live link is outstanding and when it expires. Never returns
//                            the token or the hash. This is what to call when someone reports that
//                            their link does not work.
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
//   update-staff-profile  — { staffNo, photoUrl?, bio?, publicEmail?, publicPhone? } — the personnel-
//                            directory display fields an office portal's staff card actually renders
//   create-appointment    — { officeName, appointmentTitle, staffNo?, isActing?, isPrimary?, startedAt?, notes? }
//                            staffNo omitted = the seat is recorded as vacant/awaiting appointment —
//                            the real, stored form of a "temporary internal-review record"
//   update-appointment    — { appointmentId, staffNo?, appointmentTitle?, isActing?, notes? }
//   end-appointment       — { appointmentId, endedAt? }
//   create-meeting        — { officeName, title, meetingDate, agendaText?, status?, createdByStaffNo? }
//   update-meeting        — { meetingId, status?, minutesText? }
//   create-document       — { officeName, title, fileUrl?, externalUrl?, description?, uploadedByStaffNo? }
//   update-office-content — { officeName, strategicPriorities?, annualObjectives? } — the office's real,
//                            Board/Executive-adopted planning content. Leaving a field unset/null makes
//                            the portal fall back to the generic labelled template scaffold instead —
//                            see docs/institutional-portal-architecture.md.
//   create-resolution     — { officeName, title, resolutionNumber?, status?, summaryText?, resolvedAt?,
//                             createdByStaffNo? } — governance-register entries (Board of Governors and
//                             its committees); status defaults to 'draft'.
//   update-resolution     — { resolutionId, status?, summaryText?, resolvedAt? }
//   regenerate-identity-numbers — {} — bulk-regenerates identity_no for every staff,
//                            student, and guardian record into the current SHRS-...
//                            formats (functions/_lib/identity-no.js): staff into
//                            SHRS-[UNIT]-[OFFICE]-[JOINDATE]-[SEQUENCE] (or the
//                            reserved dateless SHRS-BOT-.../SHRS-CEO-... form),
//                            students into SHRS-<YYMMDD>-<seq6>, guardians into
//                            SHRS-PAR-<YYMMDD>-<seq6>. Founder, Head of Schools &
//                            Administrator-approved
//                            one-time migration action — knowingly breaks any
//                            already-issued QR code/verification link for a
//                            re-migrated person.
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest, timingSafeEqualString, generateToken } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { logStaffEvent } from '../../../_lib/audit.js';
import { hasPermissionFor, effectiveGrants } from '../../../_lib/permissions.js';
import { regenerateStaffIdentityNo, regenerateStudentIdentityNo, regenerateGuardianIdentityNo, buildStaffIdentityNo } from '../../../_lib/identity-no.js';

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

// Founder Override Directive ("Eliminate PowerShell Role Assignment"):
// a real signed-in staff member holding Manage Users (MU) on
// staff_records is now the PRIMARY path — per role-permission-matrix.md
// §4.20, only SYSADMIN (unrestricted) and EXE (new-account approval)
// hold that grant. PORTAL_SYSADMIN_TOKEN remains a FALLBACK ONLY,
// exactly the same migration shape already applied to
// admin/announcements.js — the bearer token was never removed because
// no reachable environment's EXE account was confirmed working at the
// time that endpoint migrated; here it's kept for the same reason
// (disaster recovery / before any staff account exists at all — see
// scripts that bootstrap the very first Founder account).
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

// Staff-session grant check — bearer-token requests skip this entirely
// (the token itself is already the highest-trust credential, same as
// every other bearer-token endpoint in this codebase).
async function checkMuGrant(sql, staffId) {
  const grant = await hasPermissionFor(sql, staffId, 'staff_records', 'MU', null);
  if (!grant.granted) {
    return 'Your role does not have authority to administer staff, offices, or governance content (staff_records: MU).';
  }
  return null;
}

// EXECUTIVE SAFETY (Founder Override Directive, explicit requirement):
// granting or revoking the EXE role itself is narrower than ordinary
// MU — only someone who already holds EXE may create or remove another
// EXE. This is what stops an ordinary Manage-Users holder (say, a
// future HR/ICT administrator role with MU but no EXE) from minting
// their own Executive access. The bootstrap bearer token is exempt —
// it's already the single highest-trust path, used before any staff
// account exists at all.
async function requireExeToTouchExe(sql, auth) {
  if (auth.method === 'bearer_token') return null;
  const grants = await effectiveGrants(sql, auth.staffId);
  if (!grants.some((g) => g.roleCode === 'EXE')) {
    return 'Only an existing Executive (EXE) may grant or revoke the Executive role.';
  }
  return null;
}

// Read-only listings for the Institutional Administration Centre UI
// (portal/admin/centre/) — the same bootstrap token as every write
// action above, since this data (who holds which seat, what's on the
// governance register) is exactly as sensitive as creating it.
// ?view=offices (default)  — every office + its current appointments
//                             + committee sub-offices, one call.
// ?view=resolutions&officeName=... — that office's resolutions register.
// ?view=meetings&officeName=...    — that office's meetings.
// ?view=documents&officeName=...   — that office's documents.
export async function onRequestGet({ request, env }) {
  const sql = getSql(env);
  if (!sql) return json({ error: 'No database is linked yet.' }, 500);
  const auth = await resolveAuth(request, env);
  if (!auth) return json({ error: 'Not signed in, and no valid system administrator token was supplied.' }, 403);
  if (auth.method === 'staff_session') {
    const err = await checkMuGrant(sql, auth.staffId);
    if (err) return json({ error: err }, 403);
  }
  const url = new URL(request.url);
  const view = url.searchParams.get('view') || 'offices';

  try {
    if (view === 'staff') {
      const q = url.searchParams.get('q');
      const staffRes = await sql`
        SELECT s.id, s.staff_no, s.full_name, s.preferred_name, s.position_title, s.status, s.email,
               o.name AS office_name, i.name AS institution_name
        FROM staff s
        LEFT JOIN offices o ON o.id = s.office_id
        LEFT JOIN institutions i ON i.id = s.institution_id
        WHERE ${q}::text IS NULL OR s.full_name ILIKE '%' || ${q} || '%' OR s.staff_no ILIKE '%' || ${q} || '%'
        ORDER BY s.full_name LIMIT 200`;
      const rolesRes = await sql`
        SELECT sr.id, sr.staff_id, sr.role_code, rl.name AS role_name, sr.granted_at,
               i.name AS institution_name, o.name AS office_name
        FROM staff_roles sr
        JOIN roles rl ON rl.code = sr.role_code
        LEFT JOIN institutions i ON i.id = sr.institution_id
        LEFT JOIN offices o ON o.id = sr.office_id
        WHERE sr.is_active = true AND sr.revoked_at IS NULL
        ORDER BY sr.granted_at`;
      const rolesByStaff = {};
      for (const r of rolesRes.rows) {
        (rolesByStaff[r.staff_id] = rolesByStaff[r.staff_id] || []).push({
          staffRoleId: r.id, roleCode: r.role_code, roleName: r.role_name,
          institutionName: r.institution_name, officeName: r.office_name, grantedAt: r.granted_at,
        });
      }
      return json({
        staff: staffRes.rows.map((s) => ({
          id: s.id, staffNo: s.staff_no, fullName: s.full_name, preferredName: s.preferred_name,
          positionTitle: s.position_title, status: s.status, email: s.email,
          officeName: s.office_name, institutionName: s.institution_name,
          roles: rolesByStaff[s.id] || [],
        })),
      });
    }

    if (view === 'audit-log') {
      const staffNo = url.searchParams.get('staffNo');
      const staffId = staffNo ? await staffIdByNo(sql, staffNo) : null;
      const res = staffId
        ? await sql`
            SELECT sal.id, sal.event_type, sal.target_type, sal.target_id, sal.reason, sal.metadata, sal.created_at,
                   actor.staff_no AS actor_staff_no, actor.full_name AS actor_name
            FROM staff_audit_log sal
            LEFT JOIN staff actor ON actor.id = sal.actor_staff_id
            WHERE (sal.target_type = 'staff' AND sal.target_id = ${staffId})
               OR (sal.metadata ->> 'staffNo' = ${staffNo})
               OR sal.actor_staff_id = ${staffId}
            ORDER BY sal.created_at DESC LIMIT 100`
        : await sql`
            SELECT sal.id, sal.event_type, sal.target_type, sal.target_id, sal.reason, sal.metadata, sal.created_at,
                   actor.staff_no AS actor_staff_no, actor.full_name AS actor_name
            FROM staff_audit_log sal
            LEFT JOIN staff actor ON actor.id = sal.actor_staff_id
            ORDER BY sal.created_at DESC LIMIT 100`;
      return json({
        entries: res.rows.map((r) => ({
          id: r.id, eventType: r.event_type, targetType: r.target_type, targetId: r.target_id,
          reason: r.reason, metadata: r.metadata, createdAt: r.created_at,
          actor: r.actor_staff_no ? { staffNo: r.actor_staff_no, fullName: r.actor_name } : null,
        })),
      });
    }

    if (view === 'permissions') {
      const staffNo = url.searchParams.get('staffNo');
      const staffId = await staffIdByNo(sql, staffNo);
      if (!staffId) return json({ error: 'No staff member found with that Staff ID.' }, 404);
      const grants = await effectiveGrants(sql, staffId);
      return json({ grants });
    }

    if (view === 'resolutions') {
      const officeName = url.searchParams.get('officeName');
      const officeId = await officeIdByName(sql, officeName);
      if (!officeId) return json({ error: 'No office found with that name.' }, 404);
      const res = await sql`
        SELECT id, resolution_number, title, status, summary_text, resolved_at, created_at
        FROM office_resolutions WHERE office_id = ${officeId} ORDER BY created_at DESC LIMIT 100`;
      return json({ resolutions: res.rows.map((r) => ({
        id: r.id, resolutionNumber: r.resolution_number, title: r.title, status: r.status,
        summaryText: r.summary_text, resolvedAt: r.resolved_at, createdAt: r.created_at,
      })) });
    }

    if (view === 'meetings') {
      const officeName = url.searchParams.get('officeName');
      const officeId = await officeIdByName(sql, officeName);
      if (!officeId) return json({ error: 'No office found with that name.' }, 404);
      const res = await sql`
        SELECT id, title, meeting_date, agenda_text, minutes_text, status, created_at
        FROM office_meetings WHERE office_id = ${officeId} ORDER BY meeting_date DESC LIMIT 100`;
      return json({ meetings: res.rows.map((r) => ({
        id: r.id, title: r.title, meetingDate: r.meeting_date, agendaText: r.agenda_text,
        minutesText: r.minutes_text, status: r.status, createdAt: r.created_at,
      })) });
    }

    if (view === 'documents') {
      const officeName = url.searchParams.get('officeName');
      const officeId = await officeIdByName(sql, officeName);
      if (!officeId) return json({ error: 'No office found with that name.' }, 404);
      const res = await sql`
        SELECT id, title, file_url, external_url, description, created_at
        FROM office_documents WHERE office_id = ${officeId} ORDER BY created_at DESC LIMIT 100`;
      return json({ documents: res.rows.map((r) => ({
        id: r.id, title: r.title, fileUrl: r.file_url, externalUrl: r.external_url,
        description: r.description, createdAt: r.created_at,
      })) });
    }

    if (view === 'action-items') {
      const officeName = url.searchParams.get('officeName');
      const officeId = await officeIdByName(sql, officeName);
      if (!officeId) return json({ error: 'No office found with that name.' }, 404);
      const res = await sql`
        SELECT ai.id, ai.title, ai.description, ai.due_date, ai.status, ai.created_at, ai.completed_at,
               ai.meeting_id, ai.resolution_id,
               (ai.due_date IS NOT NULL AND ai.due_date < CURRENT_DATE
                 AND ai.status NOT IN ('done', 'cancelled')) AS is_overdue,
               owner.staff_no AS owner_staff_no, owner.full_name AS owner_name,
               creator.full_name AS created_by_name
        FROM office_action_items ai
        LEFT JOIN staff owner ON owner.id = ai.owner_staff_id
        LEFT JOIN staff creator ON creator.id = ai.created_by_staff_id
        WHERE ai.office_id = ${officeId} ORDER BY
          (ai.status IN ('open', 'in_progress')) DESC, ai.due_date ASC NULLS LAST, ai.created_at DESC LIMIT 200`;
      return json({ actionItems: res.rows.map((r) => ({
        id: r.id, title: r.title, description: r.description, dueDate: r.due_date, status: r.status,
        createdAt: r.created_at, completedAt: r.completed_at, meetingId: r.meeting_id, resolutionId: r.resolution_id,
        owner: r.owner_staff_no ? { staffNo: r.owner_staff_no, fullName: r.owner_name } : null,
        createdByName: r.created_by_name,
        isOverdue: !!r.is_overdue,
      })) });
    }

    const officesRes = await sql`
      SELECT o.id, o.name, o.office_type, o.office_kind, o.layer, o.slug, o.description,
             o.strategic_priorities, o.annual_objectives, p.name AS parent_office_name
      FROM offices o LEFT JOIN offices p ON p.id = o.parent_office_id
      WHERE o.is_active = true ORDER BY o.layer, o.name`;
    const appointmentsRes = await sql`
      SELECT oa.office_id, oa.id, oa.appointment_title, oa.is_acting, oa.is_primary, oa.notes,
             s.staff_no, s.full_name, s.preferred_name
      FROM office_appointments oa LEFT JOIN staff s ON s.id = oa.staff_id
      WHERE oa.ended_at IS NULL ORDER BY oa.office_id, oa.is_primary DESC`;
    const byOffice = {};
    for (const a of appointmentsRes.rows) {
      (byOffice[a.office_id] = byOffice[a.office_id] || []).push({
        id: a.id, title: a.appointment_title, isActing: a.is_acting, isPrimary: a.is_primary, notes: a.notes,
        isVacant: !a.staff_no, staffNo: a.staff_no,
        staffName: a.staff_no ? (a.preferred_name || a.full_name) : null,
      });
    }
    return json({
      offices: officesRes.rows.map((o) => ({
        id: o.id, name: o.name, officeType: o.office_type, officeKind: o.office_kind, layer: o.layer,
        slug: o.slug, description: o.description, parentOfficeName: o.parent_office_name,
        strategicPriorities: o.strategic_priorities, annualObjectives: o.annual_objectives,
        appointments: byOffice[o.id] || [],
      })),
    });
  } catch (err) {
    console.error('portal admin staff list error', err);
    return json({ error: 'Could not load administration data: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const sql = getSql(env);
  if (!sql) return json({ error: 'No database is linked yet.' }, 500);
  const auth = await resolveAuth(request, env);
  if (!auth) return json({ error: 'Not signed in, and no valid system administrator token was supplied.' }, 403);

  const body = await readJsonBody(request);
  const action = body && body.action;

  // FIRST-ADMIN BOOTSTRAP.
  //
  // Granting the first SYSADMIN required Manage Users, which only a
  // SYSADMIN or EXE holds — so with no such account in existence the only
  // way in was the bearer token, and if that token was unset, mistyped or
  // not yet redeployed, the system was closed to everybody. That is a
  // deadlock, and it is the state this school was actually left in: a
  // real signed-in officer looking at a token box that would not open.
  //
  // This opens once and closes for good. It is safe because of what it
  // does NOT do: it grants nothing to a stranger. A staff account cannot
  // be self-registered — every one is created either by the bearer token
  // or by an existing Manage-Users holder — so anybody able to sign in at
  // all was already admitted deliberately. The moment one active
  // SYSADMIN or EXE grant exists anywhere, this path refuses forever and
  // the ordinary grant-role route is the only way.
  if (action === 'bootstrap-sysadmin') {
    if (auth.method !== 'staff_session') {
      return json({ error: 'This is for a signed-in staff account. Sign in at /portal/staff/login/ first.' }, 403);
    }
    // SECOND CONDITION, added on review of the first version of this path.
    //
    // "No usable administrator" alone is too wide a door. A privileged
    // record that has been created but not yet activated — an EXE issued
    // an activation link this morning — satisfies it, and in a school with
    // fifty signed-in staff that would let any one of them take SYSADMIN
    // during the hours before the real holder sets a password. That is a
    // privilege-escalation window, and it is not what this path is for.
    //
    // So the claimant must also be the ONLY person who can sign in at all.
    // That is the true bootstrap condition: an institution whose staff are
    // already using the portal is not un-administered, it is misconfigured,
    // and it should recover through PORTAL_SYSADMIN_TOKEN with a human
    // deciding — not through a button any of them can press.
    const others = await sql`
      SELECT count(*)::int AS n
      FROM staff_accounts
      WHERE password_hash IS NOT NULL AND staff_id <> ${auth.staffId}`;
    if (others.rows[0].n > 0) {
      return json({ error: 'This is closed — ' + others.rows[0].n + ' other staff account'
        + (others.rows[0].n === 1 ? '' : 's') + ' can already sign in, so this institution is not '
        + 'un-administered. Recover through the system administrator token, or ask a colleague who '
        + 'holds Manage Users to grant your account the role.' }, 409);
    }
    // Naming the holders matters more than it looks. The grant can land on
    // a different staff record than the one its owner later signs in as —
    // a second record made during a first attempt, or the wrong row picked
    // in the directory — and then the refusal reads as "someone else has
    // it" when in truth nobody can use it. The names turn a dead end into
    // an instruction. It is disclosed only to a signed-in staff member,
    // and it is who administers their own institution.
    // The question is not "does an administrator exist" but "can anybody
    // actually sign in as one". A seeded EXE record with no password and
    // no email on file is not an administrator; it is a name in a table.
    // Refusing on its account left the institution with no one able to
    // administer it and no way to appoint anybody — which is precisely
    // the deadlock this whole path exists to end.
    //
    // A holder counts as usable if it has a password (it can sign in) or
    // an email (it can reset its way in). Only when not one holder has
    // either is the seat genuinely empty.
    const held = await sql`
      SELECT s.full_name, s.staff_no, s.email, sr.role_code,
             (sa.password_hash IS NOT NULL) AS has_password,
             (s.email IS NOT NULL AND btrim(s.email) <> '') AS has_email
      FROM staff_roles sr
      JOIN staff s ON s.id = sr.staff_id
      LEFT JOIN staff_accounts sa ON sa.staff_id = s.id
      WHERE sr.role_code IN ('SYSADMIN', 'EXE') AND sr.is_active = true AND sr.revoked_at IS NULL
      ORDER BY s.full_name`;
    const usable = held.rows.filter((r) => r.has_password || r.has_email);
    if (usable.length) {
      const who = usable.map((r) =>
        `${r.full_name} (${r.staff_no}, ${r.role_code}${r.email ? ', ' + r.email : ''})`).join('; ');
      return json({ error: 'This is closed — the institution already has: ' + who
        + '. Sign in as that account and grant your own the role.' }, 409);
    }
    // Recorded on the grant: which unusable holders were passed over, and
    // why that was legitimate. An auditor should not have to reconstruct
    // it later from a bare "first admin" note.
    const passedOver = held.rows.map((r) => `${r.full_name} (${r.staff_no}, ${r.role_code})`).join('; ') || 'none';
    await sql`
      INSERT INTO staff_roles (staff_id, role_code, is_active, granted_at)
      VALUES (${auth.staffId}, 'SYSADMIN', true, now())`;
    await logStaffEvent(sql, {
      actorStaffId: auth.staffId, eventType: 'sensitive_action',
      targetType: 'staff', targetId: auth.staffId,
      reason: 'First-admin bootstrap: no SYSADMIN or EXE holder could sign in. Passed over: ' + passedOver,
      metadata: { action: 'bootstrap-sysadmin', roleCode: 'SYSADMIN', passedOver },
    });
    return json({ ok: true, staffId: auth.staffId, roleCode: 'SYSADMIN' });
  }

  if (auth.method === 'staff_session') {
    const err = await checkMuGrant(sql, auth.staffId);
    if (err) return json({ error: err }, 403);
  }
  // A real signed-in session already tells us who's acting — prefer
  // that over the optional *ByStaffNo body params (kept only for the
  // bearer-token path, which has no session identity to draw from).
  const actingStaffId = auth.method === 'staff_session' ? auth.staffId : null;

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
      if (!body.fullName) {
        return json({ error: 'fullName is required.' }, 400);
      }
      const officeId = await officeIdByName(sql, body.officeName);
      const departmentRes = body.departmentName
        ? await sql`SELECT id FROM departments WHERE name = ${body.departmentName}`
        : { rows: [] };
      const departmentId = departmentRes.rows[0] ? departmentRes.rows[0].id : null;
      const reportsToId = await staffIdByNo(sql, body.reportsToStaffNo);
      const institutionId = await institutionIdByName(sql, body.institutionName);
      const email = body.email ? String(body.email).trim().toLowerCase() : null;

      // Staff IDs are issued by the institution, not typed by whoever
      // happens to be filling the form. A hand-entered number is how you
      // get STF-0100 next to SHR-STF-0901 next to a typo, and none of
      // them resolvable. When the caller does not supply one, build it
      // by the documented architecture — SHRS-<UNIT>-<OFFICE>-<DDMMYY>-
      // <seq6>, or the reserved Board/CEO series — from the office,
      // institution and join date already on this request.
      //
      // A supplied staffNo is still honoured: the bulk importer and the
      // migration path both pass real, already-issued numbers, and this
      // must not renumber them.
      let staffNo = body.staffNo ? String(body.staffNo).trim() : '';
      if (!staffNo) {
        const officeSlugRes = officeId
          ? await sql`SELECT slug FROM offices WHERE id = ${officeId}`
          : { rows: [] };
        const instNameRes = institutionId
          ? await sql`SELECT name FROM institutions WHERE id = ${institutionId}`
          : { rows: [] };
        staffNo = await buildStaffIdentityNo(sql, {
          officeSlug: officeSlugRes.rows[0] ? officeSlugRes.rows[0].slug : null,
          institutionName: instNameRes.rows[0] ? instNameRes.rows[0].name : null,
          dateJoined: body.dateJoined || null,
        });
        if (!staffNo) {
          return json({ error: 'A join date is required so the Staff ID can be issued — the number carries it, and nothing invents one.' }, 400);
        }
      }

      const existing = await sql`SELECT id FROM staff WHERE staff_no = ${staffNo}`;
      let staffId;
      if (existing.rows.length) {
        staffId = existing.rows[0].id;
        await sql`
          UPDATE staff SET full_name = ${body.fullName}, preferred_name = ${body.preferredName || null},
            office_id = ${officeId}, department_id = ${departmentId}, position_title = ${body.positionTitle || null},
            reports_to_staff_id = ${reportsToId}, institution_id = ${institutionId},
            date_joined = ${body.dateJoined || null}, email = COALESCE(${email}, email),
            identity_no = COALESCE(identity_no, staff_no), updated_at = now()
          WHERE id = ${staffId}`;
      } else {
        // identity_no is stored with staff_no, not left for a later lazy
        // pass to fill in. When it was left null the two numbers drifted:
        // one record carried staff_no SHR-STF-0001 and identity_no
        // SHR-STF-2026-000001 — two different numbers for one person,
        // and no way to tell which the certificate would print. They are
        // the same number and are now written together, once.
        const created = await sql`
          INSERT INTO staff (staff_no, identity_no, full_name, preferred_name, office_id, department_id, position_title,
                              reports_to_staff_id, institution_id, date_joined, email)
          VALUES (${staffNo}, ${staffNo}, ${body.fullName}, ${body.preferredName || null}, ${officeId}, ${departmentId},
                  ${body.positionTitle || null}, ${reportsToId}, ${institutionId}, ${body.dateJoined || null}, ${email})
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

      return json({ ok: true, staffId, staffNo });
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
      await logStaffEvent(sql, { actorStaffId: actingStaffId, eventType: 'sensitive_action', targetType: 'staff', targetId: staffId, reason: `status -> ${body.status}` });
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
      const prior = await sql`SELECT password_hash IS NOT NULL AS had_password FROM staff_accounts WHERE staff_id = ${staffId}`;
      await sql`
        INSERT INTO staff_accounts (staff_id, reset_token, reset_token_expires)
        VALUES (${staffId}, ${token}, now() + make_interval(days => ${ACTIVATION_TOKEN_TTL_DAYS}))
        ON CONFLICT (staff_id) DO UPDATE SET reset_token = EXCLUDED.reset_token, reset_token_expires = EXCLUDED.reset_token_expires`;
      // Issuing a link supersedes any link issued before it — the row holds
      // exactly one token. Whoever is relaying it needs to know that, or an
      // older link still sitting in somebody's inbox becomes a support call
      // that reports itself as "invalid" with no explanation.
      return json({
        ok: true,
        staffId,
        activationLink: '/portal/staff/set-password/?token=' + token,
        expiresInDays: ACTIVATION_TOKEN_TTL_DAYS,
        supersededPreviousLink: true,
        alreadyHadPassword: !!(prior.rows[0] && prior.rows[0].had_password),
      });
    }

    // The login email — the address the portal actually writes to.
    //
    // It could only ever be set at create-staff. There was no way to add
    // one afterwards, or to correct a typo in one, which meant a staff
    // member created without an address could never receive an OTP and
    // could never reset their own password: they were dependent on the
    // ICT Office issuing links by hand, permanently.
    //
    // Not to be confused with update-staff-profile's publicEmail, which
    // is the directory address printed for the public. This one is a
    // credential: it is where password resets and sign-in codes go, so
    // changing it is a sensitive action and is logged as one.
    if (action === 'set-staff-email') {
      if (!body.staffNo) {
        return json({ error: 'staffNo is required.' }, 400);
      }
      const staffId = await staffIdByNo(sql, body.staffNo);
      if (!staffId) {
        return json({ error: 'No staff member found with that Staff ID.' }, 404);
      }
      const raw = body.email === null ? '' : String(body.email ?? '').trim().toLowerCase();
      // Deliberately permissive but not absent: enough to catch a typed
      // mistake, not so strict that a legitimate address is refused.
      if (raw && !/^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/.test(raw)) {
        return json({ error: 'That does not look like an email address.' }, 400);
      }
      // The column carries no unique constraint, so it is enforced here.
      // Two staff sharing a login address would make a reset request
      // ambiguous — forgot-password matches on the address alone.
      if (raw) {
        const clash = await sql`
          SELECT staff_no FROM staff WHERE lower(email) = ${raw} AND id <> ${staffId}`;
        if (clash.rows.length) {
          return json({ error: `That address is already on ${clash.rows[0].staff_no}'s record. A login address must belong to one person.` }, 409);
        }
      }
      const before = await sql`SELECT email FROM staff WHERE id = ${staffId}`;
      const had = before.rows[0] && before.rows[0].email;
      await sql`
        UPDATE staff SET email = ${raw || null},
          -- a changed address changes where sign-in codes are delivered,
          -- so any trusted-device cookie issued against the old one must
          -- stop being honoured. Same reasoning as set-password.js.
          trust_version = trust_version + 1,
          updated_at = now()
        WHERE id = ${staffId}`;
      await logStaffEvent(sql, {
        actorStaffId: actingStaffId, eventType: 'sensitive_action',
        targetType: 'staff', targetId: staffId,
        reason: body.reason || null,
        metadata: { action: 'set-staff-email', from: had || null, to: raw || null },
      });
      return json({ ok: true, staffId, staffNo: body.staffNo, email: raw || null,
        replaced: Boolean(had), canSelfServe: Boolean(raw) });
    }

    // Answers "what state is this account actually in?" without ever
    // disclosing the token or the hash. Before this existed, a staff member
    // reporting "the link does not work" could only be guessed at: a used
    // link, a superseded link and a link that never existed all fail
    // identically at set-password.js, which matches on the token alone and
    // so cannot tell them apart. Diagnosis belongs on the side that knows
    // whose account it is.
    if (action === 'login-status') {
      if (!body.staffNo) {
        return json({ error: 'staffNo is required.' }, 400);
      }
      const staffId = await staffIdByNo(sql, body.staffNo);
      if (!staffId) {
        return json({ error: 'No staff member found with that Staff ID.' }, 404);
      }
      const r = await sql`
        SELECT password_hash IS NOT NULL AS has_password,
               reset_token IS NOT NULL AS has_live_link,
               reset_token_expires,
               reset_token_expires IS NOT NULL AND reset_token_expires < now() AS link_expired,
               failed_attempts, locked_until
        FROM staff_accounts WHERE staff_id = ${staffId}`;
      const a = r.rows[0];
      if (!a) {
        return json({ ok: true, staffId, state: 'no-account',
          advice: 'No login has ever been created for this staff member. Run create-login.' });
      }
      const state = a.has_password
        ? (a.has_live_link ? 'active-with-open-reset' : 'active')
        : (a.has_live_link ? (a.link_expired ? 'link-expired' : 'awaiting-activation') : 'link-used-or-superseded');
      const advice = {
        'active': 'The password is already set. Sign in at /portal/staff/login/ — a new activation link is not needed.',
        'active-with-open-reset': 'The password is set and a reset link is also open. Either will work.',
        'awaiting-activation': 'A live link is outstanding. It is the only one that works; any earlier link is dead.',
        'link-expired': 'The link has passed its expiry. Run create-login for a fresh one.',
        'link-used-or-superseded': 'No live link and no password: the link was superseded by a newer one that was never used, or cleared. Run create-login.',
      }[state];
      return json({ ok: true, staffId, state, advice,
        hasPassword: a.has_password, hasLiveLink: a.has_live_link,
        linkExpires: a.reset_token_expires, linkExpired: a.link_expired,
        failedAttempts: a.failed_attempts, lockedUntil: a.locked_until });
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
      if (body.roleCode === 'EXE') {
        const exeErr = await requireExeToTouchExe(sql, auth);
        if (exeErr) return json({ error: exeErr }, 403);
      }
      const institutionId = await institutionIdByName(sql, body.institutionName);
      const officeId = await officeIdByName(sql, body.officeName);
      const grantedById = actingStaffId ?? (await staffIdByNo(sql, body.grantedByStaffNo));
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
      const targetRes = await sql`SELECT role_code FROM staff_roles WHERE id = ${body.staffRoleId} AND is_active = true`;
      if (!targetRes.rows.length) {
        return json({ error: 'No active role assignment found with that id.' }, 404);
      }
      if (targetRes.rows[0].role_code === 'EXE') {
        const exeErr = await requireExeToTouchExe(sql, auth);
        if (exeErr) return json({ error: exeErr }, 403);
      }
      const revokedById = actingStaffId ?? (await staffIdByNo(sql, body.revokedByStaffNo));
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
      const assignedById = actingStaffId ?? (await staffIdByNo(sql, body.assignedByStaffNo));
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
      const revokedById = actingStaffId ?? (await staffIdByNo(sql, body.revokedByStaffNo));
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

    if (action === 'update-staff-profile') {
      if (!body.staffNo) {
        return json({ error: 'staffNo is required.' }, 400);
      }
      const staffId = await staffIdByNo(sql, body.staffNo);
      if (!staffId) {
        return json({ error: 'No staff member found with that Staff ID.' }, 404);
      }
      await sql`
        UPDATE staff SET
          photo_url = COALESCE(${body.photoUrl || null}, photo_url),
          bio = COALESCE(${body.bio || null}, bio),
          public_email = COALESCE(${body.publicEmail || null}, public_email),
          public_phone = COALESCE(${body.publicPhone || null}, public_phone),
          updated_at = now()
        WHERE id = ${staffId}`;
      return json({ ok: true, staffId });
    }

    // Office Appointments — the "temporary internal-review record"
    // mechanism: staffNo omitted (or unmatched) leaves the seat
    // recorded as vacant/pending, which is exactly what an office
    // portal should render honestly until a real person is assigned.
    if (action === 'create-appointment') {
      if (!body.officeName || !body.appointmentTitle) {
        return json({ error: 'officeName and appointmentTitle are required.' }, 400);
      }
      const officeId = await officeIdByName(sql, body.officeName);
      if (!officeId) {
        return json({ error: 'No office found with that name.' }, 404);
      }
      const staffId = body.staffNo ? await staffIdByNo(sql, body.staffNo) : null;
      const created = await sql`
        INSERT INTO office_appointments (office_id, staff_id, appointment_title, is_acting, is_primary, started_at, notes)
        VALUES (${officeId}, ${staffId}, ${body.appointmentTitle}, ${!!body.isActing}, ${body.isPrimary !== false}, ${body.startedAt || null}, ${body.notes || null})
        RETURNING id`;
      return json({ ok: true, appointmentId: created.rows[0].id, staffId, isVacant: !staffId });
    }

    if (action === 'update-appointment') {
      if (!Number.isInteger(body.appointmentId)) {
        return json({ error: 'A valid numeric appointmentId is required.' }, 400);
      }
      const staffId = body.staffNo ? await staffIdByNo(sql, body.staffNo) : null;
      const updated = await sql`
        UPDATE office_appointments SET
          staff_id = CASE WHEN ${body.staffNo != null} THEN ${staffId} ELSE staff_id END,
          appointment_title = COALESCE(${body.appointmentTitle || null}, appointment_title),
          is_acting = COALESCE(${body.isActing != null ? !!body.isActing : null}, is_acting),
          notes = COALESCE(${body.notes || null}, notes)
        WHERE id = ${body.appointmentId}
        RETURNING id`;
      if (!updated.rows.length) {
        return json({ error: 'No appointment found with that id.' }, 404);
      }
      return json({ ok: true, appointmentId: body.appointmentId });
    }

    if (action === 'end-appointment') {
      if (!Number.isInteger(body.appointmentId)) {
        return json({ error: 'A valid numeric appointmentId is required.' }, 400);
      }
      const updated = await sql`
        UPDATE office_appointments SET ended_at = COALESCE(${body.endedAt || null}, CURRENT_DATE)
        WHERE id = ${body.appointmentId} AND ended_at IS NULL
        RETURNING id`;
      if (!updated.rows.length) {
        return json({ error: 'No active appointment found with that id.' }, 404);
      }
      return json({ ok: true, appointmentId: body.appointmentId });
    }

    if (action === 'create-meeting') {
      if (!body.officeName || !body.title || !body.meetingDate) {
        return json({ error: 'officeName, title, and meetingDate are required.' }, 400);
      }
      const officeId = await officeIdByName(sql, body.officeName);
      if (!officeId) {
        return json({ error: 'No office found with that name.' }, 404);
      }
      const createdByStaffId = actingStaffId ?? (await staffIdByNo(sql, body.createdByStaffNo));
      const created = await sql`
        INSERT INTO office_meetings (office_id, title, meeting_date, agenda_text, status, created_by_staff_id)
        VALUES (${officeId}, ${body.title}, ${body.meetingDate}, ${body.agendaText || null}, ${body.status || 'scheduled'}, ${createdByStaffId})
        RETURNING id`;
      return json({ ok: true, meetingId: created.rows[0].id });
    }

    if (action === 'update-meeting') {
      if (!Number.isInteger(body.meetingId)) {
        return json({ error: 'A valid numeric meetingId is required.' }, 400);
      }
      const updated = await sql`
        UPDATE office_meetings SET
          status = COALESCE(${body.status || null}, status),
          minutes_text = COALESCE(${body.minutesText || null}, minutes_text),
          updated_at = now()
        WHERE id = ${body.meetingId}
        RETURNING id`;
      if (!updated.rows.length) {
        return json({ error: 'No meeting found with that id.' }, 404);
      }
      return json({ ok: true, meetingId: body.meetingId });
    }

    if (action === 'create-document') {
      if (!body.officeName || !body.title) {
        return json({ error: 'officeName and title are required.' }, 400);
      }
      const officeId = await officeIdByName(sql, body.officeName);
      if (!officeId) {
        return json({ error: 'No office found with that name.' }, 404);
      }
      const uploadedByStaffId = actingStaffId ?? (await staffIdByNo(sql, body.uploadedByStaffNo));
      const created = await sql`
        INSERT INTO office_documents (office_id, title, file_url, external_url, description, uploaded_by_staff_id)
        VALUES (${officeId}, ${body.title}, ${body.fileUrl || null}, ${body.externalUrl || null}, ${body.description || null}, ${uploadedByStaffId})
        RETURNING id`;
      return json({ ok: true, documentId: created.rows[0].id });
    }

    if (action === 'update-office-content') {
      if (!body.officeName) {
        return json({ error: 'officeName is required.' }, 400);
      }
      const officeId = await officeIdByName(sql, body.officeName);
      if (!officeId) {
        return json({ error: 'No office found with that name.' }, 404);
      }
      await sql`
        UPDATE offices SET
          strategic_priorities = COALESCE(${body.strategicPriorities || null}, strategic_priorities),
          annual_objectives = COALESCE(${body.annualObjectives || null}, annual_objectives)
        WHERE id = ${officeId}`;
      return json({ ok: true, officeId });
    }

    if (action === 'create-resolution') {
      if (!body.officeName || !body.title) {
        return json({ error: 'officeName and title are required.' }, 400);
      }
      const officeId = await officeIdByName(sql, body.officeName);
      if (!officeId) {
        return json({ error: 'No office found with that name.' }, 404);
      }
      const createdByStaffId = actingStaffId ?? (await staffIdByNo(sql, body.createdByStaffNo));
      const created = await sql`
        INSERT INTO office_resolutions (office_id, resolution_number, title, status, summary_text, resolved_at, created_by_staff_id)
        VALUES (${officeId}, ${body.resolutionNumber || null}, ${body.title}, ${body.status || 'draft'}, ${body.summaryText || null}, ${body.resolvedAt || null}, ${createdByStaffId})
        RETURNING id`;
      return json({ ok: true, resolutionId: created.rows[0].id });
    }

    if (action === 'update-resolution') {
      if (!Number.isInteger(body.resolutionId)) {
        return json({ error: 'A valid numeric resolutionId is required.' }, 400);
      }
      const updated = await sql`
        UPDATE office_resolutions SET
          status = COALESCE(${body.status || null}, status),
          summary_text = COALESCE(${body.summaryText || null}, summary_text),
          resolved_at = COALESCE(${body.resolvedAt || null}, resolved_at)
        WHERE id = ${body.resolutionId}
        RETURNING id`;
      if (!updated.rows.length) {
        return json({ error: 'No resolution found with that id.' }, 404);
      }
      return json({ ok: true, resolutionId: body.resolutionId });
    }

    if (action === 'create-action-item') {
      if (!body.officeName || !body.title) {
        return json({ error: 'officeName and title are required.' }, 400);
      }
      const officeId = await officeIdByName(sql, body.officeName);
      if (!officeId) {
        return json({ error: 'No office found with that name.' }, 404);
      }
      const ownerStaffId = body.ownerStaffNo ? await staffIdByNo(sql, body.ownerStaffNo) : null;
      const createdByStaffId = actingStaffId ?? (await staffIdByNo(sql, body.createdByStaffNo));
      const created = await sql`
        INSERT INTO office_action_items (office_id, meeting_id, resolution_id, title, description, owner_staff_id, due_date, status, created_by_staff_id)
        VALUES (${officeId}, ${body.meetingId || null}, ${body.resolutionId || null}, ${body.title}, ${body.description || null}, ${ownerStaffId}, ${body.dueDate || null}, ${body.status || 'open'}, ${createdByStaffId})
        RETURNING id`;
      return json({ ok: true, actionItemId: created.rows[0].id });
    }

    if (action === 'update-action-item') {
      if (!Number.isInteger(body.actionItemId)) {
        return json({ error: 'A valid numeric actionItemId is required.' }, 400);
      }
      const ownerStaffId = body.ownerStaffNo ? await staffIdByNo(sql, body.ownerStaffNo) : null;
      const newStatus = body.status || null;
      const updated = await sql`
        UPDATE office_action_items SET
          status = COALESCE(${newStatus}, status),
          description = COALESCE(${body.description || null}, description),
          due_date = COALESCE(${body.dueDate || null}, due_date),
          owner_staff_id = COALESCE(${ownerStaffId}, owner_staff_id),
          completed_at = CASE WHEN ${newStatus} = 'done' THEN now() ELSE completed_at END
        WHERE id = ${body.actionItemId}
        RETURNING id`;
      if (!updated.rows.length) {
        return json({ error: 'No action item found with that id.' }, 404);
      }
      return json({ ok: true, actionItemId: body.actionItemId });
    }

    // SHRS Master Identity Architecture Directive, the Founder, Head of
    // Schools & Administrator's explicit rollout choice ("migrate everyone
    // now"): regenerates
    // identity_no for every staff record into the current
    // SHRS-[UNIT]-[OFFICE]-[JOINDATE]-[SEQUENCE] format (or the reserved
    // dateless SHRS-BOT-.../SHRS-CEO-... form for Board/CEO seats),
    // overwriting any existing value (including an already-current one,
    // so re-running deliberately re-migrates everyone rather than
    // silently no-op'ing). This knowingly breaks every already-issued QR
    // code/verification link for anyone whose number changes — that
    // trade-off was the Founder, Head of Schools & Administrator's
    // explicit, informed choice, not a
    // default. regenerateStaffIdentityNo itself skips (returns null) any
    // non-reserved record with no date_joined on file, rather than
    // inventing one — queried against every staff row here (not just
    // ones with a date_joined) so Board/CEO seats without one still
    // migrate. Under the Institutional Identity Number Architecture
    // Directive, this same action now also sweeps every student and
    // guardian record into their SHRS-/SHRS-PAR- format, so no legacy
    // SHR-STU-/SHR-PAR- number remains live anywhere.
    if (action === 'regenerate-identity-numbers') {
      const staffRes = await sql`SELECT id FROM staff`;
      let migrated = 0;
      const failures = [];
      for (const s of staffRes.rows) {
        try {
          const newNo = await regenerateStaffIdentityNo(sql, s.id);
          if (newNo) migrated++;
        } catch (err) {
          failures.push({ staffId: s.id, error: err && err.message ? err.message : 'unknown error' });
        }
      }
      const noDateRes = await sql`SELECT count(*)::int AS n FROM staff WHERE date_joined IS NULL`;

      const studentRes = await sql`SELECT id FROM students`;
      let migratedStudents = 0;
      const studentFailures = [];
      for (const s of studentRes.rows) {
        try {
          const newNo = await regenerateStudentIdentityNo(sql, s.id);
          if (newNo) migratedStudents++;
        } catch (err) {
          studentFailures.push({ studentId: s.id, error: err && err.message ? err.message : 'unknown error' });
        }
      }

      const guardianRes = await sql`SELECT id FROM guardians`;
      let migratedGuardians = 0;
      const guardianFailures = [];
      for (const g of guardianRes.rows) {
        try {
          const newNo = await regenerateGuardianIdentityNo(sql, g.id);
          if (newNo) migratedGuardians++;
        } catch (err) {
          guardianFailures.push({ guardianId: g.id, error: err && err.message ? err.message : 'unknown error' });
        }
      }

      await logStaffEvent(sql, {
        actorStaffId: actingStaffId, eventType: 'sensitive_action', targetType: 'staff', targetId: null,
        reason: 'Bulk migration to SHRS-... identity number format (staff, students, guardians)',
        metadata: {
          migrated, failed: failures.length, skippedNoDateJoined: noDateRes.rows[0].n,
          migratedStudents, failedStudents: studentFailures.length,
          migratedGuardians, failedGuardians: guardianFailures.length,
        },
      });
      return json({
        ok: true, migrated, failed: failures.length, failures,
        skippedNoDateJoined: noDateRes.rows[0].n,
        migratedStudents, failedStudents: studentFailures.length, studentFailures,
        migratedGuardians, failedGuardians: guardianFailures.length, guardianFailures,
      });
    }

    return json({ error: 'Unknown action. Expected one of: create-office, create-department, create-staff, update-staff-status, update-staff-profile, set-staff-email, create-login, login-status, grant-role, revoke-role, assign-class, revoke-class-assignment, create-appointment, update-appointment, end-appointment, create-meeting, update-meeting, create-document, update-office-content, create-resolution, update-resolution, create-action-item, update-action-item, regenerate-identity-numbers.' }, 400);
  } catch (err) {
    console.error('portal admin staff error', err);
    return json({ error: 'Could not complete that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
