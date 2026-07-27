// Migration Phase D item #4 (docs/identity-migration-plan.md,
// docs/identity-migration-register.md): Qur'an College data entry moved
// off its bearer token onto the Staff Identity Platform, mirroring the
// Founder Dashboard's dual-auth pattern (docs/identity-migration-register.md
// item #1) — staff session + Permission Engine is now the PRIMARY path;
// PORTAL_QURAN_TOKEN remains a FALLBACK ONLY, since MUH and QC-OFF are
// still 'proposed' roles with no real account confirmed to exist in any
// reachable environment (docs/identity-migration-plan.md's Teacher
// Identity status update). Removing the token now would lock this
// endpoint out entirely.
//
// The Matrix's hifz_records/ijazah_records cells (permission-matrix.js)
// are enforced per-action, not as one blanket grant, because they
// genuinely differ:
//   - Juz' progress (V,C,E): MUH or QC-OFF. MUH's scope is "own assigned
//     students only" — but teacher_class_assignments (the table that
//     resolves TCH's equivalent finer scope) has never been provisioned
//     for MUH (no onboarding path exists yet, per the plan above), so
//     there is nothing real to check a MUH grant against. Per this
//     project's least-privilege default (permissions.js: "fails closed,
//     not open"), a MUH-role staff session is refused here rather than
//     silently granted QC-OFF's institution-wide breadth — a named gap,
//     not a silent one, until MUH onboarding is built.
//   - Stage advancement (A): QC-OFF or PRIN only — the Matrix does not
//     give MUH the 'A' permission on hifz_records at all.
//   - Ijazah grant (C on ijazah_records): QC-OFF only — PRIN's row has
//     no 'C'. The Matrix's "A jointly with QC-OFF" note on PRIN describes
//     a two-party approval step that docs/identity-migration-register.md
//     §"Approval Workflow Architecture" names as not built anywhere in
//     this codebase yet; QC-OFF's own 'C' grant is what gates creation
//     today, same single-step behaviour the bearer token always had.
//   - Ijazah revocation (Ar on ijazah_records): PRIN only — QC-OFF's row
//     has no 'Ar'. Per IQ-02, revoking a permanent credential is
//     deliberately a narrower authority than granting one.
//
// The student's institution is still validated explicitly
// (isQuranCollegeInstitution) regardless of auth method — this is the
// same "endpoint enforces the finer scope" role permissions.js's own
// header comment describes, since the Matrix's "Qur'an College only"
// scope text on PRIN's rows doesn't parse cleanly through checkGrants()'s
// generic institution regex (it doesn't end in "...only").
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest, timingSafeEqualString } from '../../../_lib/session.js';
import { hasPermissionFor } from '../../../_lib/permissions.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { isQuranCollegeInstitution } from '../../../_lib/hifz.js';
import { logStaffEvent } from '../../../_lib/audit.js';

const VALID_JUZ_STATUSES = ['not_started', 'memorising', 'completed_pending_review', 'verified'];

async function resolveAuth(request, env) {
  if (env.SESSION_SECRET) {
    let session = null;
    try {
      session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
    } catch (err) {
      session = null;
    }
    if (session) return { method: 'staff_session', staffId: session.staffId };
  }
  const quranToken = env.PORTAL_QURAN_TOKEN;
  if (quranToken && timingSafeEqualString(request.headers.get('x-quran-token'), quranToken)) {
    return { method: 'bearer_token', staffId: null };
  }
  return null;
}

// Staff-session grant check for one action. Bearer-token requests skip
// this entirely (legacy single-secret behaviour, unchanged). Returns
// null (allowed) or an error message string.
async function checkStaffGrant(sql, staffId, areaCode, permissionCode, institutionId) {
  const grant = await hasPermissionFor(sql, staffId, areaCode, permissionCode, institutionId);
  if (!grant.granted) {
    return `Your role does not have authority for this action (${areaCode}: ${permissionCode}).`;
  }
  if (grant.via.roleCode === 'MUH') {
    return 'Muhaffiz-role accounts are not yet onboarded with assigned-student data for this endpoint to check against — this action is refused rather than granted broader access than the Matrix intends. Contact the Qur\'an College Officer (QC-OFF) role in the meantime.';
  }
  return null;
}

export async function onRequestPost({ request, env }) {
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'No database is linked yet.' }, 500);
  }

  const auth = await resolveAuth(request, env);
  if (!auth) {
    return json({ error: 'Not authorised. Sign in with a Qur\'an College Officer or Principal staff account, or supply a valid Qur\'an College token.' }, 403);
  }

  const body = await readJsonBody(request);
  const admissionNo = ((body && body.admissionNo) || '').trim();
  if (!admissionNo) {
    return json({ error: 'admissionNo is required.' }, 400);
  }

  try {
    const studentRes = await sql`
      SELECT s.id, s.full_name, c.institution, ci.id AS institution_id
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN institutions ci ON ci.name = c.institution
      WHERE s.admission_no = ${admissionNo}`;
    const student = studentRes.rows[0];
    if (!student) {
      return json({ error: 'No student found with that admission number.' }, 404);
    }
    if (!isQuranCollegeInstitution(student.institution)) {
      return json({ error: `${student.full_name} is not recorded as a Qur'an College student (institution on file: ${student.institution || 'none'}). Hifz records are only accepted for Qur'an College students — check the admission number, or update the student's class via /api/portal/admin/students first.` }, 400);
    }

    const updatedParts = [];
    const auditMeta = { admissionNo };

    if (Array.isArray(body.progress) && body.progress.length && auth.method === 'staff_session') {
      const err = await checkStaffGrant(sql, auth.staffId, 'hifz_records', 'C', student.institution_id ?? null);
      if (err) return json({ error: err }, 403);
    }
    if (Array.isArray(body.progress)) {
      for (const p of body.progress) {
        const juzNumber = Number(p.juzNumber);
        if (!Number.isInteger(juzNumber) || juzNumber < 1 || juzNumber > 30) continue;
        const status = VALID_JUZ_STATUSES.includes(p.status) ? p.status : 'memorising';
        await sql`
          INSERT INTO hifz_progress (student_id, juz_number, status, murajaah_note, tajweed_note, muhaffiz_name, assessed_at)
          VALUES (${student.id}, ${juzNumber}, ${status}, ${p.murajaahNote || null}, ${p.tajweedNote || null}, ${p.muhaffizName || null}, ${p.assessedAt || null})
          ON CONFLICT (student_id, juz_number) DO UPDATE SET
            status = EXCLUDED.status, murajaah_note = EXCLUDED.murajaah_note,
            tajweed_note = EXCLUDED.tajweed_note, muhaffiz_name = EXCLUDED.muhaffiz_name,
            assessed_at = EXCLUDED.assessed_at, updated_at = now()`;
      }
      if (body.progress.length) updatedParts.push('Hifz progress');
    }

    if (body.stage && Number.isInteger(body.stage.stageNumber) && body.stage.stageNumber >= 1 && body.stage.stageNumber <= 5) {
      if (auth.method === 'staff_session') {
        const err = await checkStaffGrant(sql, auth.staffId, 'hifz_records', 'A', student.institution_id ?? null);
        if (err) return json({ error: err }, 403);
      }
      await sql`
        INSERT INTO hifz_enrolment (student_id, stage_number)
        VALUES (${student.id}, ${body.stage.stageNumber})
        ON CONFLICT (student_id) DO UPDATE SET
          stage_number = EXCLUDED.stage_number, stage_updated_at = now()`;
      updatedParts.push('Hifz stage');
      auditMeta.stageNumber = body.stage.stageNumber;
    }

    if (body.ijazah && body.ijazah.action === 'grant') {
      if (auth.method === 'staff_session') {
        const err = await checkStaffGrant(sql, auth.staffId, 'ijazah_records', 'C', student.institution_id ?? null);
        if (err) return json({ error: err }, 403);
      }
      const g = body.ijazah;
      if (!g.grantedDate || !g.referenceNo) {
        return json({ error: 'ijazah.grant requires grantedDate and referenceNo.' }, 400);
      }
      await sql`
        INSERT INTO ijazah_register (student_id, student_full_name, granted_date, examining_scholars, certified_scope, reference_no)
        VALUES (${student.id}, ${student.full_name}, ${g.grantedDate}, ${g.examiningScholars || null}, ${g.certifiedScope || null}, ${g.referenceNo})`;
      updatedParts.push('Ijazah grant');
      auditMeta.ijazahReferenceNo = g.referenceNo;
    } else if (body.ijazah && body.ijazah.action === 'revoke') {
      if (auth.method === 'staff_session') {
        const err = await checkStaffGrant(sql, auth.staffId, 'ijazah_records', 'Ar', student.institution_id ?? null);
        if (err) return json({ error: err }, 403);
      }
      const r = body.ijazah;
      if (!r.referenceNo) {
        return json({ error: 'ijazah.revoke requires referenceNo.' }, 400);
      }
      const revoked = await sql`
        UPDATE ijazah_register SET revoked_at = now(), revocation_note = ${r.revocationNote || null}
        WHERE reference_no = ${r.referenceNo} AND student_id = ${student.id}
        RETURNING id`;
      if (!revoked.rows.length) {
        return json({ error: 'No matching Ijazah record found for that reference number and student.' }, 404);
      }
      updatedParts.push('Ijazah revocation');
      auditMeta.ijazahReferenceNo = r.referenceNo;
    }

    if (!updatedParts.length) {
      return json({ error: 'Nothing to update — provide progress, stage, and/or ijazah.' }, 400);
    }

    if (auth.method === 'staff_session') {
      await logStaffEvent(sql, {
        actorStaffId: auth.staffId, eventType: 'sensitive_action', targetType: 'hifz_ijazah', targetId: student.id,
        reason: body.reason || null, metadata: { ...auditMeta, updated: updatedParts },
      });
    }

    return json({ ok: true, studentId: student.id, updated: updatedParts, authMethod: auth.method });
  } catch (err) {
    console.error('portal admin hifz-progress error', err);
    return json({ error: 'Could not save Hifz data: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
