// Certificate register — same permanence pattern as the existing Ijazah
// register (see sql/schema.sql's comment on `certificates`): "issue"
// records that a certificate was granted, it does not generate a
// physical/PDF document (no document-generation system exists in this
// project).
//
// Approval Workflow Architecture (docs/approval-workflow-architecture.md),
// first real implementation: role-permission-matrix.md §4.13 gives REG
// 'C' (once graduation approved) and PRIN 'A' — "jointly" — on
// `certificates`. Until now that joint authority was recorded via an
// optional `approvedByStaffNo` field the REQUESTING staff member typed in
// themselves, never persisted on the certificate row and never verified
// against a real PRIN account or a real second person — a Registrar
// acting alone could issue any certificate regardless of what that field
// held. `issue` now creates a pending `staff_approvals` row instead of
// writing to `certificates` directly; the certificate is only actually
// created once a distinct staff member who genuinely holds `certificates`
// 'A' approves it, via functions/_lib/approvals.js's decideApproval().
//
// referenceNo is auto-generated (SHRS-<TYPE>-<YEAR>-<seq>) at APPROVAL
// time when left blank, not at request time — generating it earlier
// could hand out a reference number for a certificate a Principal then
// rejects. Staff can still supply their own reference (e.g. to match a
// pre-2026 paper register) at request time; that value is simply carried
// through untouched.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { logStaffEvent } from '../../../../_lib/audit.js';
import { createApprovalRequest, listPendingApprovals, decideApproval } from '../../../../_lib/approvals.js';
import { generateWithRetryOnConflict } from '../../../../_lib/generate-with-retry.js';

const TYPE_ABBREVIATIONS = {
  nursery_graduation: 'NUR', primary_graduation: 'PRI', junior_secondary: 'JSS', senior_secondary: 'SSS',
  hifz_completion: 'HFZ', arabic_studies: 'ARB', islamic_studies: 'ISL', competition: 'CMP',
  workshop: 'WKS', staff_training: 'TRN',
};

function abbreviateType(certificateType) {
  const known = TYPE_ABBREVIATIONS[certificateType.toLowerCase().replace(/\s+/g, '_')];
  if (known) return known;
  return certificateType.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'GEN';
}

async function generateReferenceNo(sql, certificateType, issuedAt) {
  const year = new Date(issuedAt).getFullYear();
  const abbr = abbreviateType(certificateType);
  const countRes = await sql`
    SELECT COUNT(*)::int AS n FROM certificates
    WHERE certificate_type = ${certificateType} AND EXTRACT(YEAR FROM issued_at) = ${year}`;
  const seq = (countRes.rows[0].n || 0) + 1;
  return `SHRS-${abbr}-${year}-${String(seq).padStart(6, '0')}`;
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

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const body = await readJsonBody(request);
  const action = body && body.action;

  try {
    if (action === 'issue') {
      const admissionNo = ((body && body.admissionNo) || '').trim();
      const certificateType = ((body && body.certificateType) || '').trim();
      const referenceNo = ((body && body.referenceNo) || '').trim() || null;
      const issuedAt = (body && body.issuedAt) || new Date().toISOString().slice(0, 10);
      if (!admissionNo || !certificateType) {
        return json({ error: 'admissionNo and certificateType are required.' }, 400);
      }

      const studentRes = await sql`
        SELECT s.id, s.full_name, ci.id AS institution_id
        FROM students s
        LEFT JOIN classes c ON c.id = s.class_id
        LEFT JOIN institutions ci ON ci.name = c.institution
        WHERE s.admission_no = ${admissionNo}`;
      const student = studentRes.rows[0];
      if (!student) {
        return json({ error: 'No student found with that Institutional Student Number.' }, 404);
      }

      const grant = await hasPermissionFor(sql, staffId, 'certificates', 'C', student.institution_id ?? null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to request a certificate for this student.' }, 403);
      }

      const approvalRequest = await createApprovalRequest(sql, {
        areaCode: 'certificates', targetType: 'certificate_issue',
        payload: { studentId: student.id, studentFullName: student.full_name, certificateType, referenceNo, issuedAt },
        requestedByStaffId: staffId, approverRoleCode: 'PRIN', institutionId: student.institution_id ?? null,
      });

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'certificate_request', targetId: approvalRequest.id,
        reason: body.reason || null, metadata: { admissionNo, certificateType, referenceNo },
      });

      return json({
        ok: true, approvalId: approvalRequest.id, status: 'pending_approval',
        message: 'Submitted — a Principal must approve this before the certificate is issued.',
      });
    }

    if (action === 'list_pending') {
      const grant = await hasPermissionFor(sql, staffId, 'certificates', 'A', null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to decide certificate approvals.' }, 403);
      }
      const staffRes = await sql`SELECT institution_id FROM staff WHERE id = ${staffId}`;
      const pending = await listPendingApprovals(sql, {
        areaCode: 'certificates', institutionId: staffRes.rows[0] ? staffRes.rows[0].institution_id : null,
      });
      return json({
        ok: true,
        pending: pending.map((p) => ({
          id: p.id, requestedByName: p.requested_by_name, requestedAt: p.requested_at, ...p.payload,
        })),
      });
    }

    if (action === 'approve' || action === 'reject') {
      if (!Number.isInteger(body.approvalId)) {
        return json({ error: 'A valid numeric approvalId is required.' }, 400);
      }
      const result = await decideApproval(sql, {
        approvalId: body.approvalId, decidingStaffId: staffId, decision: action === 'approve' ? 'approve' : 'reject',
        note: body.note || null, areaCode: 'certificates', permissionCode: 'A',
        performOnApprove: async ({ payload, approval, decidingStaffId: approverId }) => {
          const insertCertificate = (no) => sql`
            INSERT INTO certificates (student_id, student_full_name, certificate_type, reference_no, issued_at, issued_by_staff_id, approved_by_staff_id)
            VALUES (${payload.studentId}, ${payload.studentFullName}, ${payload.certificateType}, ${no}, ${payload.issuedAt}, ${approval.requested_by_staff_id}, ${approverId})`;
          if (payload.referenceNo) {
            await insertCertificate(payload.referenceNo);
            return payload.referenceNo;
          }
          // TD-2: candidate + INSERT retried together on a unique-violation
          // (docs/technical-debt-register.md) — only for the auto-generated
          // case; a staff-supplied reference is never silently replaced.
          const outcome = await generateWithRetryOnConflict(
            sql,
            () => generateReferenceNo(sql, payload.certificateType, payload.issuedAt),
            insertCertificate
          );
          return outcome.value;
        },
      });
      if (result.error) return json({ error: result.error }, 403);

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'certificate_request', targetId: body.approvalId,
        reason: body.note || null, metadata: { decision: result.status, resultRef: result.resultRef || null },
      });

      if (result.status === 'approved') {
        return json({
          ok: true, status: 'approved', referenceNo: result.resultRef,
          verifyUrl: `/verify-certificate/?ref=${encodeURIComponent(result.resultRef)}`,
          qrUrl: `/api/certificates/qr?ref=${encodeURIComponent(result.resultRef)}`,
        });
      }
      return json({ ok: true, status: 'rejected' });
    }

    if (action === 'revoke') {
      const grant = await hasPermissionFor(sql, staffId, 'certificates', 'C', null);
      if (!grant.granted) {
        return json({ error: 'Your role does not have authority to revoke certificates.' }, 403);
      }
      const referenceNo = ((body && body.referenceNo) || '').trim();
      const revocationNote = (body && body.revocationNote) || null;
      if (!referenceNo || !revocationNote) {
        return json({ error: 'referenceNo and revocationNote are both required to revoke a certificate.' }, 400);
      }
      const updated = await sql`
        UPDATE certificates SET revoked_at = now(), revocation_note = ${revocationNote}
        WHERE reference_no = ${referenceNo} AND revoked_at IS NULL
        RETURNING id`;
      if (!updated.rows.length) {
        return json({ error: 'No active certificate found with that reference number.' }, 404);
      }
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'certificate', targetId: updated.rows[0].id,
        reason: revocationNote, metadata: { referenceNo, revoked: true },
      });
      return json({ ok: true, certificateId: updated.rows[0].id });
    }

    return json({ error: 'Unknown action. Expected one of: issue, list_pending, approve, reject, revoke.' }, 400);
  } catch (err) {
    console.error('registrar certificates error', err);
    return json({ error: 'Could not complete that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
