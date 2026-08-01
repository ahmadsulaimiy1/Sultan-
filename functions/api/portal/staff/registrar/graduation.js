// Graduation Records — staff-side review (docs/shrs-graduation-
// documentation-system-architecture.md, Stage 1: "a basic staff review
// list"). Mirrors certificates.js's exact shape: session guard,
// Permission Engine checks per action, logStaffEvent after every
// mutation, and — for the one irreversible step (locking a record,
// after which the guardian can no longer edit it and document
// generation is free to build on it) — the same joint-sign-off pattern
// as certificate issuance: Registry requests, a distinct Principal
// approves, via functions/_lib/approvals.js's createApprovalRequest/
// decideApproval. Nothing here issues a certificate/transcript itself —
// that is Stage 3 (document generation); this stage only gets the
// underlying data to a locked, trustworthy state.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { logStaffEvent } from '../../../../_lib/audit.js';
import { createApprovalRequest, listPendingApprovals, decideApproval } from '../../../../_lib/approvals.js';

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

async function loadRecord(sql, recordId) {
  const res = await sql`
    SELECT gr.*, s.full_name, s.admission_no, c.institution AS institution_name, ci.id AS institution_id
    FROM graduation_records gr
    JOIN students s ON s.id = gr.student_id
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN institutions ci ON ci.name = c.institution
    WHERE gr.id = ${recordId}`;
  return res.rows[0] || null;
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const grant = await hasPermissionFor(sql, staffId, 'graduation_records', 'V', null);
  if (!grant.granted) {
    return json({ error: 'Your role does not have authority to view graduation records.' }, 403);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const graduationSession = url.searchParams.get('session');

  try {
    const staffRes = await sql`SELECT institution_id FROM staff WHERE id = ${staffId}`;
    const institutionId = staffRes.rows[0] ? staffRes.rows[0].institution_id : null;

    const rows = (
      institutionId != null
        ? await sql`
            SELECT gr.*, s.full_name, s.admission_no, c.institution AS institution_name, ci.id AS institution_id
            FROM graduation_records gr
            JOIN students s ON s.id = gr.student_id
            LEFT JOIN classes c ON c.id = s.class_id
            LEFT JOIN institutions ci ON ci.name = c.institution
            WHERE (ci.id = ${institutionId} OR ci.id IS NULL)
              AND (${status}::text IS NULL OR gr.status = ${status})
              AND (${graduationSession}::text IS NULL OR gr.graduation_session = ${graduationSession})
            ORDER BY gr.submitted_at ASC NULLS LAST, gr.updated_at DESC`
        : await sql`
            SELECT gr.*, s.full_name, s.admission_no, c.institution AS institution_name, ci.id AS institution_id
            FROM graduation_records gr
            JOIN students s ON s.id = gr.student_id
            LEFT JOIN classes c ON c.id = s.class_id
            LEFT JOIN institutions ci ON ci.name = c.institution
            WHERE (${status}::text IS NULL OR gr.status = ${status})
              AND (${graduationSession}::text IS NULL OR gr.graduation_session = ${graduationSession})
            ORDER BY gr.submitted_at ASC NULLS LAST, gr.updated_at DESC`
    ).rows;

    return json({
      ok: true,
      records: rows.map((r) => ({
        id: r.id, studentId: r.student_id, fullName: r.full_name, admissionNo: r.admission_no,
        institutionName: r.institution_name, graduationSession: r.graduation_session, status: r.status,
        preferredCertificateName: r.preferred_certificate_name, nameSpellingConfirmed: r.name_spelling_confirmed,
        correctionNote: r.correction_note, submittedAt: r.submitted_at, updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    console.error('registrar graduation list error', err);
    return json({ error: 'Could not load graduation records right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  const action = body && body.action;

  try {
    if (action === 'mark_under_review' || action === 'request_correction' || action === 'mark_verified') {
      const recordId = Number(body && body.recordId);
      if (!Number.isInteger(recordId)) return json({ error: 'A valid numeric recordId is required.' }, 400);

      const record = await loadRecord(sql, recordId);
      if (!record) return json({ error: 'No graduation record found with that id.' }, 404);

      const grant = await hasPermissionFor(sql, staffId, 'graduation_records', 'E', record.institution_id ?? null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to review this graduation record.' }, 403);
      }
      if (record.status === 'locked') {
        return json({ error: 'This graduation record is locked and can no longer be reviewed here.' }, 409);
      }

      let newStatus;
      let correctionNote = null;
      if (action === 'mark_under_review') {
        newStatus = 'under_review';
      } else if (action === 'request_correction') {
        const note = ((body && body.correctionNote) || '').trim();
        if (!note) return json({ error: 'correctionNote is required to request a correction.' }, 400);
        newStatus = 'under_review';
        correctionNote = note;
      } else {
        if (!['submitted', 'under_review'].includes(record.status)) {
          return json({ error: `A record at "${record.status}" cannot be marked verified.` }, 409);
        }
        newStatus = 'verified';
      }

      const updated = await sql`
        UPDATE graduation_records SET
          status = ${newStatus}, correction_note = ${correctionNote},
          reviewed_by_staff_id = ${staffId}, updated_at = now()
        WHERE id = ${recordId}
        RETURNING id, status`;

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'graduation_record', targetId: recordId,
        reason: correctionNote, metadata: { action, newStatus },
      });

      return json({ ok: true, recordId: updated.rows[0].id, status: updated.rows[0].status });
    }

    if (action === 'request_lock') {
      const recordId = Number(body && body.recordId);
      if (!Number.isInteger(recordId)) return json({ error: 'A valid numeric recordId is required.' }, 400);

      const record = await loadRecord(sql, recordId);
      if (!record) return json({ error: 'No graduation record found with that id.' }, 404);
      if (record.status !== 'verified') {
        return json({ error: 'Only a "verified" graduation record can be submitted for locking.' }, 409);
      }

      const grant = await hasPermissionFor(sql, staffId, 'graduation_records', 'E', record.institution_id ?? null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to request locking for this graduation record.' }, 403);
      }

      const approvalRequest = await createApprovalRequest(sql, {
        areaCode: 'graduation_records', targetType: 'graduation_record_lock',
        payload: { recordId, studentId: record.student_id, fullName: record.full_name },
        requestedByStaffId: staffId, approverRoleCode: 'PRIN', institutionId: record.institution_id ?? null,
      });

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'graduation_record_lock_request', targetId: approvalRequest.id,
        reason: body.reason || null, metadata: { recordId },
      });

      return json({
        ok: true, approvalId: approvalRequest.id, status: 'pending_approval',
        message: 'Submitted — a Principal must approve this before the graduation record is locked.',
      });
    }

    if (action === 'list_pending_locks') {
      const grant = await hasPermissionFor(sql, staffId, 'graduation_records', 'A', null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to decide graduation record locking.' }, 403);
      }
      const staffRes = await sql`SELECT institution_id FROM staff WHERE id = ${staffId}`;
      const pending = await listPendingApprovals(sql, {
        areaCode: 'graduation_records', institutionId: staffRes.rows[0] ? staffRes.rows[0].institution_id : null,
      });
      return json({
        ok: true,
        pending: pending.map((p) => ({
          id: p.id, requestedByName: p.requested_by_name, requestedAt: p.requested_at, ...p.payload,
        })),
      });
    }

    if (action === 'approve_lock' || action === 'reject_lock') {
      if (!Number.isInteger(body.approvalId)) {
        return json({ error: 'A valid numeric approvalId is required.' }, 400);
      }
      const result = await decideApproval(sql, {
        approvalId: body.approvalId, decidingStaffId: staffId, decision: action === 'approve_lock' ? 'approve' : 'reject',
        note: body.note || null, areaCode: 'graduation_records', permissionCode: 'A',
        performOnApprove: async ({ payload, decidingStaffId: approverId }) => {
          await sql`
            UPDATE graduation_records SET
              status = 'locked', locked_by_staff_id = ${approverId}, locked_at = now(), updated_at = now()
            WHERE id = ${payload.recordId}`;
          return String(payload.recordId);
        },
      });
      if (result.error) return json({ error: result.error }, 403);

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'graduation_record_lock_request', targetId: body.approvalId,
        reason: body.note || null, metadata: { decision: result.status },
      });

      if (result.status === 'approved') {
        return json({ ok: true, status: 'approved', recordId: Number(result.resultRef) });
      }
      return json({ ok: true, status: 'rejected' });
    }

    return json({
      error: 'Unknown action. Expected one of: mark_under_review, request_correction, mark_verified, request_lock, list_pending_locks, approve_lock, reject_lock.',
    }, 400);
  } catch (err) {
    console.error('registrar graduation error', err);
    return json({ error: 'Could not complete that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
