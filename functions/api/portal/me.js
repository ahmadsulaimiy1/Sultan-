import { getSql } from '../../_lib/db.js';
import { readSessionFromRequest } from '../../_lib/session.js';
import { json } from '../../_lib/http.js';
import { isQuranCollegeInstitution, hifzStageLabel } from '../../_lib/hifz.js';
import { computeProfileCompletion, recommendNextStep } from '../../_lib/profile-completion.js';
import { ensureGuardianIdentityNo } from '../../_lib/identity-no.js';
import { loadStudentFinanceSummary } from '../../_lib/finance-summary.js';

export async function onRequestGet({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }

  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
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
    const guardianRes = await sql`SELECT * FROM guardians WHERE id = ${session.guardianId}`;
    const guardian = guardianRes.rows[0];
    if (!guardian) {
      return json({ error: 'Not signed in.' }, 401);
    }

    const [studentsRes, emergencyContactsRes, educationalInterestsRes, prospectiveChildrenRes] = await Promise.all([
      sql`
        SELECT s.id, s.full_name, s.admission_no, s.status, s.is_sample_data, gs.relationship
        FROM students s
        JOIN guardian_student gs ON gs.student_id = s.id
        WHERE gs.guardian_id = ${session.guardianId}
        ORDER BY s.full_name`,
      sql`SELECT id FROM guardian_emergency_contacts WHERE guardian_id = ${session.guardianId}`,
      sql`SELECT institution_key FROM guardian_educational_interests WHERE guardian_id = ${session.guardianId}`,
      sql`
        SELECT COUNT(*)::int AS n FROM admissions_applications
        WHERE guardian_id = ${session.guardianId} AND status IN ('submitted', 'under_review', 'waitlisted', 'offered')`,
    ]);

    const children = [];
    for (const student of studentsRes.rows) {
      const [attendance, results, fees, enrolmentsRes] = await Promise.all([
        sql`SELECT term, days_present, days_total FROM attendance_summary WHERE student_id = ${student.id} ORDER BY updated_at DESC LIMIT 1`,
        sql`SELECT term, subject, ca_score, exam_score, total_score, teacher_comment FROM term_results WHERE student_id = ${student.id} ORDER BY updated_at DESC`,
        sql`SELECT term, amount_due, amount_paid FROM fee_status WHERE student_id = ${student.id} ORDER BY updated_at DESC LIMIT 1`,
        // A student may belong to more than one class at once (e.g. a
        // Royal College student also enrolled in Qur'an College and/or
        // Islamic & Arabic Studies) — see sql/schema.sql's student_classes.
        sql`
          SELECT c.institution, c.name AS class_name, sc.is_primary
          FROM student_classes sc JOIN classes c ON c.id = sc.class_id
          WHERE sc.student_id = ${student.id}
          ORDER BY sc.is_primary DESC, c.institution`,
      ]);

      const enrolments = enrolmentsRes.rows.map((r) => ({ institution: r.institution, className: r.class_name, isPrimary: r.is_primary }));
      const primary = enrolments.find((e) => e.isPrimary) || enrolments[0] || null;

      // Guardians see a Hifz *snapshot* only (stage + Juz' verified
      // count) — the student's own portal shows the full per-Juz' grid
      // and raw Muhaffiz notes; parents don't need that level of detail
      // in this summary card. Triggers off ANY Qur'an College enrolment,
      // not just the primary one, so a dual-enrolled student's Hifz
      // record still shows even if their primary class is elsewhere.
      let hifz = null;
      if (enrolments.some((e) => isQuranCollegeInstitution(e.institution))) {
        const [enrolmentRes, verifiedCountRes] = await Promise.all([
          sql`SELECT stage_number FROM hifz_enrolment WHERE student_id = ${student.id}`,
          sql`SELECT COUNT(*)::int AS n FROM hifz_progress WHERE student_id = ${student.id} AND status = 'verified'`,
        ]);
        const stageNumber = enrolmentRes.rows[0] ? enrolmentRes.rows[0].stage_number : 1;
        hifz = {
          stageNumber,
          stageLabel: hifzStageLabel(stageNumber),
          juzVerifiedCount: verifiedCountRes.rows[0] ? verifiedCountRes.rows[0].n : 0,
        };
      }

      const finance = await loadStudentFinanceSummary(sql, student.id);

      children.push({
        id: student.id,
        fullName: student.full_name,
        admissionNo: student.admission_no,
        status: student.status,
        relationship: student.relationship,
        isSampleData: !!student.is_sample_data,
        institution: primary ? primary.institution : null,
        className: primary ? primary.className : null,
        enrolments,
        attendance: attendance.rows[0] || null,
        results: results.rows,
        fees: fees.rows[0] || null,
        finance,
        hifz,
      });
    }

    const notificationsRes = await sql`
      SELECT id, message, created_at FROM notifications
      WHERE guardian_id = ${session.guardianId} AND read_at IS NULL
      ORDER BY created_at DESC LIMIT 20`;

    const { profileCompletionPct, sections } = computeProfileCompletion(guardian, {
      emergencyContactCount: emergencyContactsRes.rows.length,
      educationalInterestCount: educationalInterestsRes.rows.length,
    });

    const identityNo = await ensureGuardianIdentityNo(sql, session.guardianId);

    return json({
      fullName: guardian.full_name,
      title: guardian.title,
      preferredName: guardian.preferred_name,
      identityNo,
      identityType: guardian.identity_type,
      email: guardian.email,
      emailVerified: !!guardian.email_verified_at,
      mobileVerified: !!guardian.mobile_verified_at,
      profileCompletionPct,
      sections,
      recommendedNextStep: recommendNextStep(sections, !!guardian.email_verified_at),
      existingChildrenCount: children.length,
      prospectiveChildrenCount: prospectiveChildrenRes.rows[0] ? prospectiveChildrenRes.rows[0].n : 0,
      children,
      notifications: notificationsRes.rows,
    });
  } catch (err) {
    console.error('portal me error', err);
    return json({ error: 'Could not load your dashboard right now — please try again shortly.' }, 500);
  }
}
