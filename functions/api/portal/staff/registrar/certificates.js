// Certificate register — same permanence pattern as the existing Ijazah
// register (see sql/schema.sql's comment on `certificates`): "issue"
// records that a certificate was granted, it does not generate a
// physical/PDF document (no document-generation system exists in this
// project). Session-authenticated, Permission-Engine-gated against the
// `certificates` area (REG holds Create; PRIN's joint Approve is
// recorded via approvedByStaffNo, not a separate access gate, matching
// how student_lifecycle_events records joint sign-off).
//
// referenceNo is now auto-generated (SHR-<TYPE>-<YEAR>-<seq>) when the
// staff member leaves it blank, rather than requiring them to invent a
// consistent numbering scheme by hand — this is the public number
// printed on the certificate and looked up at /verify-certificate/, so
// consistency matters more than it did when this was pure internal
// filing. Staff can still supply their own (e.g. to match a pre-2026
// paper register) — auto-generation only fills the gap.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { logStaffEvent } from '../../../../_lib/audit.js';

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
  return `SHR-${abbr}-${year}-${String(seq).padStart(6, '0')}`;
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
    const grant = await hasPermissionFor(sql, staffId, 'certificates', 'C', null);
    if (!grant.granted) {
      return json({ error: 'Your role does not have authority to issue or revoke certificates.' }, 403);
    }

    if (action === 'issue') {
      const admissionNo = ((body && body.admissionNo) || '').trim();
      const certificateType = ((body && body.certificateType) || '').trim();
      let referenceNo = ((body && body.referenceNo) || '').trim();
      const issuedAt = (body && body.issuedAt) || new Date().toISOString().slice(0, 10);
      if (!admissionNo || !certificateType) {
        return json({ error: 'admissionNo and certificateType are required.' }, 400);
      }

      const studentRes = await sql`SELECT id, full_name FROM students WHERE admission_no = ${admissionNo}`;
      const student = studentRes.rows[0];
      if (!student) {
        return json({ error: 'No student found with that Institutional Student Number.' }, 404);
      }

      const approvedByStaffNo = (body && body.approvedByStaffNo) || null;

      if (!referenceNo) {
        referenceNo = await generateReferenceNo(sql, certificateType, issuedAt);
      }

      const created = await sql`
        INSERT INTO certificates (student_id, student_full_name, certificate_type, reference_no, issued_at, issued_by_staff_id)
        VALUES (${student.id}, ${student.full_name}, ${certificateType}, ${referenceNo}, ${issuedAt}, ${staffId})
        RETURNING id`;

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'certificate', targetId: created.rows[0].id,
        reason: body.reason || null, metadata: { admissionNo, certificateType, referenceNo, approvedByStaffNo },
      });

      return json({
        ok: true,
        certificateId: created.rows[0].id,
        referenceNo,
        verifyUrl: `/verify-certificate/?ref=${encodeURIComponent(referenceNo)}`,
        qrUrl: `/api/certificates/qr?ref=${encodeURIComponent(referenceNo)}`,
      });
    }

    if (action === 'revoke') {
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

    return json({ error: 'Unknown action. Expected one of: issue, revoke.' }, 400);
  } catch (err) {
    console.error('registrar certificates error', err);
    return json({ error: 'Could not complete that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
