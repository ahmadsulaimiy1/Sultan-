// Disciplinary Register — the real case data behind Disciplinary
// Clearance (Conditional Approval directive item 3: "design the
// underlying Disciplinary Register architecture now... disciplinary
// cases, warnings, suspensions, commendations, behavioural reports,
// investigation status, final disposition"). Reuses the EXISTING
// `behaviour` permission area (owner: VP Administration, also granted
// to the student's own Principal and, for reporting only, teachers) —
// see functions/_lib/permission-matrix.js — rather than inventing a
// second permission area for what is the same authority over the same
// kind of record. Even though every case is entered manually today,
// functions/_lib/graduation-workflow.js's disciplinarySignal() reads
// this table live, so Disciplinary Clearance is decided against real
// data the moment any case exists — "intelligent rather than merely a
// checkbox," per the directive's own words.
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { hasPermissionFor } from '../../../_lib/permissions.js';
import { logStaffEvent, requestAuditContext } from '../../../_lib/audit.js';

async function requireStaffSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { staffId: session.staffId };
}

async function studentInstitutionId(sql, studentId) {
  const res = await sql`
    SELECT ci.id AS institution_id FROM students s
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN institutions ci ON ci.name = c.institution
    WHERE s.id = ${studentId}`;
  return res.rows[0] ? res.rows[0].institution_id : null;
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const url = new URL(request.url);
  const studentId = Number(url.searchParams.get('studentId'));
  if (!Number.isInteger(studentId)) return json({ error: 'A valid numeric studentId is required.' }, 400);

  const institutionId = await studentInstitutionId(sql, studentId);
  const grant = await hasPermissionFor(sql, staffId, 'behaviour', 'V', institutionId);
  if (!grant.granted) return json({ error: 'Your role does not have authority to view disciplinary records.' }, 403);

  try {
    const res = await sql`
      SELECT dc.*, s.full_name AS reported_by_name FROM disciplinary_cases dc
      LEFT JOIN staff s ON s.id = dc.reported_by_staff_id
      WHERE dc.student_id = ${studentId}
      ORDER BY dc.reported_at DESC`;
    return json({
      ok: true,
      cases: res.rows.map((r) => ({
        id: r.id, caseType: r.case_type, severity: r.severity, description: r.description, status: r.status,
        finalDisposition: r.final_disposition, reportedByName: r.reported_by_name, reportedAt: r.reported_at, resolvedAt: r.resolved_at,
      })),
    });
  } catch (err) {
    console.error('disciplinary-cases GET error', err);
    return json({ error: 'Could not load disciplinary records right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  const action = body && body.action;
  const auditCtx = requestAuditContext(request);

  try {
    if (action === 'report') {
      const studentId = Number(body.studentId);
      const caseType = (body.caseType || '').trim();
      const description = (body.description || '').trim();
      if (!Number.isInteger(studentId) || !caseType || !description) {
        return json({ error: 'studentId, caseType, and description are required.' }, 400);
      }
      const institutionId = await studentInstitutionId(sql, studentId);
      const grant = await hasPermissionFor(sql, staffId, 'behaviour', 'C', institutionId);
      if (!grant.granted) return json({ error: 'Your role does not have authority to report a disciplinary matter.' }, 403);

      const inserted = await sql`
        INSERT INTO disciplinary_cases (student_id, case_type, severity, description, reported_by_staff_id)
        VALUES (${studentId}, ${caseType}, ${body.severity || null}, ${description}, ${staffId})
        RETURNING id`;
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'disciplinary_case', targetId: inserted.rows[0].id,
        reason: description, metadata: { action: 'report', caseType },
        ipAddress: auditCtx.ipAddress, userAgent: auditCtx.userAgent, newValue: { caseType, status: 'open' },
      });
      return json({ ok: true, caseId: inserted.rows[0].id });
    }

    if (action === 'update_status') {
      const caseId = Number(body.caseId);
      const status = (body.status || '').trim();
      if (!Number.isInteger(caseId) || !['open', 'under_investigation', 'resolved', 'dismissed'].includes(status)) {
        return json({ error: 'A valid caseId and status are required.' }, 400);
      }
      const caseRes = await sql`SELECT student_id, status AS current_status FROM disciplinary_cases WHERE id = ${caseId}`;
      const existing = caseRes.rows[0];
      if (!existing) return json({ error: 'No disciplinary case found with that id.' }, 404);
      const institutionId = await studentInstitutionId(sql, existing.student_id);
      const grant = await hasPermissionFor(sql, staffId, 'behaviour', 'E', institutionId);
      if (!grant.granted) return json({ error: 'Your role does not have authority to update disciplinary records.' }, 403);

      const isResolving = status === 'resolved' || status === 'dismissed';
      await sql`
        UPDATE disciplinary_cases SET
          status = ${status}, final_disposition = ${body.finalDisposition || null},
          resolved_by_staff_id = ${isResolving ? staffId : null}, resolved_at = ${isResolving ? new Date().toISOString() : null},
          updated_at = now()
        WHERE id = ${caseId}`;
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'disciplinary_case', targetId: caseId,
        reason: body.finalDisposition || null, metadata: { action: 'update_status', status },
        ipAddress: auditCtx.ipAddress, userAgent: auditCtx.userAgent,
        previousValue: { status: existing.current_status }, newValue: { status },
      });
      return json({ ok: true, caseId, status });
    }

    return json({ error: 'Unknown action. Expected one of: report, update_status.' }, 400);
  } catch (err) {
    console.error('disciplinary-cases POST error', err);
    return json({ error: 'Could not complete that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
