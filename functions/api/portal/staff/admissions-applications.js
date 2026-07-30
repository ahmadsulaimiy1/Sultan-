// Staff-side admissions application review — the first real,
// non-bearer-token consumer of the Permission Engine built in the
// Staff Identity phase, closing the gap the Institutional Readiness
// Review's §3 named explicitly: "most of the system doesn't call the
// Permission Engine yet." Every check here goes through
// functions/_lib/permissions.js's hasPermission()/checkGrants(), never
// a hardcoded role comparison. See docs/account-creation-journey.md
// and docs/staff-identity-architecture.md.
//
// GET  — list applications the caller's effective grants allow them to
//        see (REG/ADM see all; PRIN sees only their own institution's).
// POST — { action: 'update-status', applicationId, status, decisionNote? }
//        requires the Approve (A) permission in the `admissions` area,
//        scoped to the application's own institution.
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { effectiveGrants, checkGrants } from '../../../_lib/permissions.js';
import { hasPermission } from '../../../_lib/permission-matrix.js';
import { logStaffEvent } from '../../../_lib/audit.js';

// Admissions Review Centre — the list/decide logic and audit logging
// (logStaffEvent below, target_type 'admissions_application') already
// existed; GET now also returns each application's full staff_audit_log
// history (not just the latest decision snapshot), so the Review
// Centre's "Audit Trail" is a real multi-entry timeline, not a label.

const VALID_STATUSES = ['submitted', 'under_review', 'waitlisted', 'offered', 'admitted', 'declined', 'withdrawn'];

function toApplication(r) {
  return {
    id: r.id, guardianId: r.guardian_id, applicantChildName: r.applicant_child_name,
    institution: r.institution_name, desiredClass: r.desired_class, notes: r.notes,
    status: r.status, decisionNote: r.decision_note, submittedAt: r.submitted_at, updatedAt: r.updated_at,
  };
}

async function requireStaffSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { staffId: session.staffId };
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  try {
    const grants = await effectiveGrants(sql, staffId);
    const viewable = grants.filter((g) => hasPermission(g.roleCode, 'admissions', 'V').granted);
    if (!viewable.length) {
      return json({ error: 'Your role does not currently include admissions visibility.' }, 403);
    }
    const unscoped = viewable.some((g) => g.institutionId == null);

    let rows;
    if (unscoped) {
      const res = await sql`
        SELECT aa.*, i.name AS institution_name
        FROM admissions_applications aa LEFT JOIN institutions i ON i.id = aa.institution_id
        ORDER BY aa.submitted_at DESC`;
      rows = res.rows;
    } else {
      const institutionIds = [...new Set(viewable.map((g) => g.institutionId))];
      const placeholders = institutionIds.map((_, i) => `$${i + 1}`).join(', ');
      const res = await sql(
        `SELECT aa.*, i.name AS institution_name FROM admissions_applications aa
         LEFT JOIN institutions i ON i.id = aa.institution_id
         WHERE aa.institution_id IN (${placeholders})
         ORDER BY aa.submitted_at DESC`,
        institutionIds
      );
      rows = res.rows;
    }
    const ids = rows.map((r) => r.id);
    let historyByApplication = {};
    if (ids.length) {
      const historyRes = await sql`
        SELECT l.target_id, l.event_type, l.reason, l.metadata, l.created_at, s.full_name AS actor_name
        FROM staff_audit_log l LEFT JOIN staff s ON s.id = l.actor_staff_id
        WHERE l.target_type = 'admissions_application' AND l.target_id = ANY(${ids})
        ORDER BY l.created_at DESC`;
      historyByApplication = historyRes.rows.reduce((acc, r) => {
        (acc[r.target_id] ||= []).push({
          eventType: r.event_type, reason: r.reason,
          previousStatus: r.metadata ? r.metadata.previousStatus : null,
          newStatus: r.metadata ? r.metadata.newStatus : null,
          actorName: r.actor_name, occurredAt: r.created_at,
        });
        return acc;
      }, {});
    }

    return json({
      ok: true,
      applications: rows.map((r) => ({ ...toApplication(r), history: historyByApplication[r.id] || [] })),
    });
  } catch (err) {
    console.error('staff admissions-applications list error', err);
    return json({ error: 'Could not load applications right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  if (body.action !== 'update-status') {
    return json({ error: 'Unknown action. Expected: update-status.' }, 400);
  }
  if (!Number.isInteger(body.applicationId) || !VALID_STATUSES.includes(body.status)) {
    return json({ error: `applicationId (number) and status (one of: ${VALID_STATUSES.join(', ')}) are required.` }, 400);
  }

  try {
    const appRes = await sql`SELECT id, institution_id, status FROM admissions_applications WHERE id = ${body.applicationId}`;
    const application = appRes.rows[0];
    if (!application) {
      return json({ error: 'No application found with that id.' }, 404);
    }

    const grants = await effectiveGrants(sql, staffId);
    const { granted } = checkGrants(grants, 'admissions', 'A', application.institution_id);
    if (!granted) {
      return json({ error: 'Your role does not have approval authority over this application.' }, 403);
    }

    await sql`
      UPDATE admissions_applications SET status = ${body.status}, decision_note = ${body.decisionNote || null},
        reviewed_by_staff_id = ${staffId}, updated_at = now()
      WHERE id = ${body.applicationId}`;

    await logStaffEvent(sql, {
      actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'admissions_application', targetId: body.applicationId,
      reason: body.decisionNote || null, metadata: { previousStatus: application.status, newStatus: body.status },
    });

    return json({ ok: true, applicationId: body.applicationId, status: body.status });
  } catch (err) {
    console.error('staff admissions-applications update error', err);
    return json({ error: 'Could not update that application right now — please try again shortly.' }, 500);
  }
}
