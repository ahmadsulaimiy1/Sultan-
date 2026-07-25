// Token-protected endpoint for Qur'an College staff (Muhaffiz/Muhaffizah)
// to record Hifz progress, current stage, and Ijazah grants/revocations.
// Deliberately gated by its OWN token (PORTAL_QURAN_TOKEN), separate from
// PORTAL_ADMIN_TOKEN — Qur'an College staff entering memorisation/Tajweed
// data is a different trust boundary than whoever enters fees or general
// attendance, so it should be held by a narrower group. No admin UI yet,
// same "protected raw API" convention as admin/students.js — see
// docs/student-portal.md for the request shapes and curl examples.
//
// Three independent operations in one request body, all optional (send
// only what changed): `progress` (array, upserted into hifz_progress),
// `stage` (upserts hifz_enrolment.stage_number), `ijazah` (a single grant
// or revoke — grant fields are immutable once created; only revocation
// is ever settable afterward, per IQ-02 §7.6 "annotated, never deleted").
import { getSql } from '../../../_lib/db.js';
import { timingSafeEqualString } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { isQuranCollegeInstitution } from '../../../_lib/hifz.js';

const VALID_JUZ_STATUSES = ['not_started', 'memorising', 'completed_pending_review', 'verified'];

export async function onRequestPost({ request, env }) {
  const quranToken = env.PORTAL_QURAN_TOKEN;
  if (!quranToken) {
    return json({ error: 'Qur\'an College data entry is not configured yet — PORTAL_QURAN_TOKEN is not set.' }, 500);
  }
  if (!timingSafeEqualString(request.headers.get('x-quran-token'), quranToken)) {
    return json({ error: 'Invalid Qur\'an College token.' }, 403);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'No database is linked yet.' }, 500);
  }

  const body = await readJsonBody(request);
  const admissionNo = ((body && body.admissionNo) || '').trim();
  if (!admissionNo) {
    return json({ error: 'admissionNo is required.' }, 400);
  }

  try {
    const studentRes = await sql`
      SELECT s.id, s.full_name, c.institution
      FROM students s LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.admission_no = ${admissionNo}`;
    const student = studentRes.rows[0];
    if (!student) {
      return json({ error: 'No student found with that admission number.' }, 404);
    }
    if (!isQuranCollegeInstitution(student.institution)) {
      return json({ error: `${student.full_name} is not recorded as a Qur'an College student (institution on file: ${student.institution || 'none'}). Hifz records are only accepted for Qur'an College students — check the admission number, or update the student's class via /api/portal/admin/students first.` }, 400);
    }

    const updatedParts = [];

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
      await sql`
        INSERT INTO hifz_enrolment (student_id, stage_number)
        VALUES (${student.id}, ${body.stage.stageNumber})
        ON CONFLICT (student_id) DO UPDATE SET
          stage_number = EXCLUDED.stage_number, stage_updated_at = now()`;
      updatedParts.push('Hifz stage');
    }

    if (body.ijazah && body.ijazah.action === 'grant') {
      const g = body.ijazah;
      if (!g.grantedDate || !g.referenceNo) {
        return json({ error: 'ijazah.grant requires grantedDate and referenceNo.' }, 400);
      }
      await sql`
        INSERT INTO ijazah_register (student_id, student_full_name, granted_date, examining_scholars, certified_scope, reference_no)
        VALUES (${student.id}, ${student.full_name}, ${g.grantedDate}, ${g.examiningScholars || null}, ${g.certifiedScope || null}, ${g.referenceNo})`;
      updatedParts.push('Ijazah grant');
    } else if (body.ijazah && body.ijazah.action === 'revoke') {
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
    }

    if (!updatedParts.length) {
      return json({ error: 'Nothing to update — provide progress, stage, and/or ijazah.' }, 400);
    }

    return json({ ok: true, studentId: student.id, updated: updatedParts });
  } catch (err) {
    console.error('portal admin hifz-progress error', err);
    return json({ error: 'Could not save Hifz data: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
