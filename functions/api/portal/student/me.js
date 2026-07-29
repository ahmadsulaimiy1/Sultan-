// Student Portal dashboard data: the student's own profile, attendance,
// full result history (transcript preview), and fee status — scoped
// directly to the session's own studentId, not via a guardian join. A
// student may be enrolled in more than one programme at once (e.g. Royal
// College AND Qur'an College AND Islamic & Arabic Studies) — the full
// list is returned as `enrolments`. If ANY enrolment is Qur'an College,
// also includes per-Juz' Hifz progress, current stage of the school's
// published 5-stage Hifz Journey, and any Ijazah register entries. No
// assignments/deadlines/announcements are returned — no course system
// exists yet to generate real ones (see docs/student-portal.md); the
// frontend renders an honest empty state for that section instead of
// this endpoint fabricating placeholder data.
import { getSql } from '../../../_lib/db.js';
import { readStudentSessionFromRequest } from '../../../_lib/session.js';
import { json } from '../../../_lib/http.js';
import { isQuranCollegeInstitution, hifzStageLabel, hifzStageDescription, fillJuzGrid } from '../../../_lib/hifz.js';
import { ensureStudentIdentityNo } from '../../../_lib/identity-no.js';
import { loadStudentFinanceSummary } from '../../../_lib/finance-summary.js';

export async function onRequestGet({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  let session;
  try {
    session = readStudentSessionFromRequest(request, env.SESSION_SECRET);
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
    const studentRes = await sql`SELECT id, full_name, admission_no, status, created_at FROM students WHERE id = ${session.studentId}`;
    const student = studentRes.rows[0];
    if (!student) {
      return json({ error: 'Not signed in.' }, 401);
    }

    const [attendance, results, fees, programmesRes, currentTermRes] = await Promise.all([
      sql`SELECT term, days_present, days_total FROM attendance_summary WHERE student_id = ${student.id} ORDER BY updated_at DESC LIMIT 1`,
      sql`SELECT term, subject, ca_score, exam_score, total_score, teacher_comment FROM term_results WHERE student_id = ${student.id} ORDER BY term, subject`,
      sql`SELECT term, amount_due, amount_paid FROM fee_status WHERE student_id = ${student.id} ORDER BY updated_at DESC LIMIT 1`,
      // A student may belong to more than one class at once (e.g. Royal
      // College *and* Qur'an College *and* Islamic & Arabic Studies) —
      // see sql/schema.sql's student_classes.
      sql`
        SELECT c.institution, c.name AS class_name, sc.is_primary
        FROM student_classes sc JOIN classes c ON c.id = sc.class_id
        WHERE sc.student_id = ${student.id}
        ORDER BY sc.is_primary DESC, c.institution`,
      sql`SELECT label FROM academic_terms WHERE is_current = true LIMIT 1`,
    ]);

    const enrolments = programmesRes.rows.map((r) => ({ institution: r.institution, className: r.class_name, isPrimary: r.is_primary }));
    const primary = enrolments.find((e) => e.isPrimary) || enrolments[0] || null;

    let hifz = null;
    if (enrolments.some((e) => isQuranCollegeInstitution(e.institution))) {
      const [progressRes, enrolmentRes, ijazahRes] = await Promise.all([
        sql`SELECT juz_number, status, murajaah_note, tajweed_note, muhaffiz_name, assessed_at FROM hifz_progress WHERE student_id = ${student.id}`,
        sql`SELECT stage_number, stage_updated_at, enrolled_at FROM hifz_enrolment WHERE student_id = ${student.id}`,
        sql`SELECT granted_date, examining_scholars, certified_scope, reference_no, revoked_at, revocation_note FROM ijazah_register WHERE student_id = ${student.id} ORDER BY granted_date DESC`,
      ]);
      const enrolment = enrolmentRes.rows[0];
      const juzGrid = fillJuzGrid(progressRes.rows);
      hifz = {
        stageNumber: enrolment ? enrolment.stage_number : 1,
        stageLabel: hifzStageLabel(enrolment ? enrolment.stage_number : 1),
        stageDescription: hifzStageDescription(enrolment ? enrolment.stage_number : 1),
        enrolledAt: enrolment ? enrolment.enrolled_at : null,
        juzVerifiedCount: juzGrid.filter((j) => j.status === 'verified').length,
        juzGrid,
        ijazahRecords: ijazahRes.rows,
      };
    }

    const identityNo = await ensureStudentIdentityNo(sql, student.id);
    const finance = await loadStudentFinanceSummary(sql, student.id);

    return json({
      fullName: student.full_name,
      admissionNo: student.admission_no,
      identityNo,
      admissionDate: student.created_at,
      academicSession: currentTermRes.rows[0] ? currentTermRes.rows[0].label : null,
      status: student.status,
      institution: primary ? primary.institution : null,
      className: primary ? primary.className : null,
      enrolments,
      attendance: attendance.rows[0] || null,
      results: results.rows,
      fees: fees.rows[0] || null,
      finance,
      hifz,
    });
  } catch (err) {
    console.error('student portal me error', err);
    return json({ error: 'Could not load your dashboard right now — please try again shortly.' }, 500);
  }
}
