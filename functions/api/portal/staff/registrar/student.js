// The Registrar's Office's core view — a real academic-records lookup
// (profile, every current enrolment, the full lifecycle event history,
// attendance, results, fee status, certificates, and any admissions
// application that preceded enrolment), not a bare editable student
// table. Session-authenticated + Permission-Engine-gated, per
// docs/identity-migration-plan.md's target state for this office.
//
// "Academic Standing" is reported as the raw, honest inputs (current
// attendance %, latest term average) rather than a computed Good
// Standing/Probation label — AC-02 mentions promotion/probation
// threshold-setting but no numeric thresholds are published anywhere
// in this project's governance canon, so this endpoint doesn't invent
// one. A Registrar reads the real numbers and decides, same as today.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { isQuranCollegeInstitution, hifzStageLabel } from '../../../../_lib/hifz.js';

export async function onRequestGet({ request, env }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
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

  const url = new URL(request.url);
  const admissionNo = (url.searchParams.get('admissionNo') || '').trim();
  if (!admissionNo) {
    return json({ error: 'admissionNo query parameter is required.' }, 400);
  }

  try {
    const studentRes = await sql`
      SELECT s.id, s.full_name, s.admission_no, s.status, s.created_at,
             c.institution AS primary_institution, c.name AS primary_class, ci.id AS primary_institution_id
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN institutions ci ON ci.name = c.institution
      WHERE s.admission_no = ${admissionNo}`;
    const student = studentRes.rows[0];
    if (!student) {
      return json({ error: 'No student found with that Institutional Student Number.' }, 404);
    }

    // View permission check — institution-scoped for PRIN (checked
    // against this student's actual institution), unscoped for REG/AREG.
    // EXE's student_records grant is explicitly "aggregate only (no
    // individual PII)" in the Matrix — that qualifier is enforced here,
    // not just checked as a boolean, since this endpoint returns one
    // individual's full record, exactly what EXE's grant excludes.
    const grant = await hasPermissionFor(sql, session.staffId, 'student_records', 'V', student.primary_institution_id ?? null);
    if (!grant.granted || (grant.scope && /aggregate/i.test(grant.scope))) {
      return json({ error: 'Your role does not currently include visibility over individual student records.' }, 403);
    }

    const [enrolmentsRes, eventsRes, attendanceRes, resultsRes, feesRes, certificatesRes, guardiansRes, hifzRes] = await Promise.all([
      sql`SELECT c.institution, c.name AS class_name, sc.is_primary FROM student_classes sc JOIN classes c ON c.id = sc.class_id WHERE sc.student_id = ${student.id} ORDER BY sc.is_primary DESC, c.institution`,
      sql`
        SELECT sle.id, sle.event_type, sle.reason, sle.effective_date, sle.created_at,
               fc.institution AS from_institution, fc.name AS from_class,
               tc.institution AS to_institution, tc.name AS to_class,
               ds.full_name AS decided_by_name, aps.full_name AS approved_by_name
        FROM student_lifecycle_events sle
        LEFT JOIN classes fc ON fc.id = sle.from_class_id
        LEFT JOIN classes tc ON tc.id = sle.to_class_id
        LEFT JOIN staff ds ON ds.id = sle.decided_by_staff_id
        LEFT JOIN staff aps ON aps.id = sle.approved_by_staff_id
        WHERE sle.student_id = ${student.id}
        ORDER BY sle.effective_date DESC, sle.id DESC`,
      sql`SELECT term, days_present, days_total FROM attendance_summary WHERE student_id = ${student.id} ORDER BY updated_at DESC LIMIT 1`,
      sql`SELECT term, subject, ca_score, exam_score, total_score, teacher_comment FROM term_results WHERE student_id = ${student.id} ORDER BY updated_at DESC`,
      sql`SELECT term, amount_due, amount_paid FROM fee_status WHERE student_id = ${student.id} ORDER BY updated_at DESC LIMIT 1`,
      sql`SELECT id, certificate_type, reference_no, issued_at, revoked_at, revocation_note FROM certificates WHERE student_id = ${student.id} ORDER BY issued_at DESC`,
      sql`SELECT g.id, g.full_name, g.email, gs.relationship FROM guardian_student gs JOIN guardians g ON g.id = gs.guardian_id WHERE gs.student_id = ${student.id}`,
      sql`SELECT stage_number FROM hifz_enrolment WHERE student_id = ${student.id}`,
    ]);

    const enrolments = enrolmentsRes.rows.map((r) => ({ institution: r.institution, className: r.class_name, isPrimary: r.is_primary }));
    const latestAttendance = attendanceRes.rows[0] || null;
    const attendancePct = latestAttendance && latestAttendance.days_total
      ? Math.round((latestAttendance.days_present / latestAttendance.days_total) * 1000) / 10
      : null;
    const latestTermResults = resultsRes.rows.length ? resultsRes.rows.filter((r) => r.term === resultsRes.rows[0].term) : [];
    const latestTermAverage = latestTermResults.length
      ? Math.round((latestTermResults.reduce((sum, r) => sum + (Number(r.total_score) || 0), 0) / latestTermResults.length) * 10) / 10
      : null;

    let hifz = null;
    if (enrolments.some((e) => isQuranCollegeInstitution(e.institution))) {
      const stageNumber = hifzRes.rows[0] ? hifzRes.rows[0].stage_number : 1;
      hifz = { stageNumber, stageLabel: hifzStageLabel(stageNumber) };
    }

    return json({
      student: {
        id: student.id, fullName: student.full_name, admissionNo: student.admission_no, status: student.status,
        createdAt: student.created_at, primaryInstitution: student.primary_institution, primaryClass: student.primary_class,
      },
      enrolments,
      guardians: guardiansRes.rows.map((g) => ({ id: g.id, fullName: g.full_name, email: g.email, relationship: g.relationship })),
      lifecycleEvents: eventsRes.rows.map((r) => ({
        id: r.id, eventType: r.event_type, reason: r.reason, effectiveDate: r.effective_date, createdAt: r.created_at,
        from: r.from_class ? { institution: r.from_institution, className: r.from_class } : null,
        to: r.to_class ? { institution: r.to_institution, className: r.to_class } : null,
        decidedBy: r.decided_by_name, approvedBy: r.approved_by_name,
      })),
      academicStanding: { attendancePct, latestTerm: latestAttendance ? latestAttendance.term : null, latestTermAverage },
      results: resultsRes.rows,
      fees: feesRes.rows[0] || null,
      certificates: certificatesRes.rows.map((c) => ({
        id: c.id, certificateType: c.certificate_type, referenceNo: c.reference_no,
        issuedAt: c.issued_at, revokedAt: c.revoked_at, revocationNote: c.revocation_note,
      })),
      hifz,
    });
  } catch (err) {
    console.error('registrar student lookup error', err);
    return json({ error: 'Could not load that student record right now — please try again shortly.' }, 500);
  }
}
