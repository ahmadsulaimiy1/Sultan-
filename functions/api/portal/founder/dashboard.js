// Founder/Executive Dashboard — read-only aggregate view across all
// four institutions. Deliberately NOT a login: gated by its own bearer
// token (PORTAL_FOUNDER_TOKEN, separate from PORTAL_ADMIN_TOKEN and
// PORTAL_QURAN_TOKEN — whoever holds this sees institution-wide
// aggregates, a narrower, more sensitive trust boundary than day-to-day
// data entry), matching the "protected API, simple page" pattern this
// project already uses for admin endpoints. No new schema — every
// number here is a real aggregate over tables that already exist.
//
// Per docs/digital-institution-blueprint.md's own finding: this
// endpoint exists partly to make honest which requested KPIs the
// current data can support. Where it can't (revenue, staff headcount,
// admissions pipeline, boarding occupancy), it says so explicitly
// rather than fabricating a number — see the `notYetAvailable` field.
//
// Sample institutional records (is_sample_data = true, seeded by
// /api/portal/setup for admin/testing use) are excluded from every
// count below, so this never quietly reports sample data as real
// institutional numbers.
import { getSql } from '../../../_lib/db.js';
import { timingSafeEqualString } from '../../../_lib/session.js';
import { json } from '../../../_lib/http.js';
import { HIFZ_STAGES } from '../../../_lib/hifz.js';

const SAMPLE_FILTER = `is_sample_data = false`;

export async function onRequestGet({ request, env }) {
  const founderToken = env.PORTAL_FOUNDER_TOKEN;
  if (!founderToken) {
    return json({ error: 'The Founder Dashboard is not configured yet — PORTAL_FOUNDER_TOKEN is not set.' }, 500);
  }
  if (!timingSafeEqualString(request.headers.get('x-founder-token'), founderToken)) {
    return json({ error: 'Invalid token.' }, 403);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'No database is linked yet.' }, 500);
  }

  try {
    const [
      byStatusRes,
      byInstitutionRes,
      dualEnrolledRes,
      guardianCountRes,
      attendanceRes,
      feesRes,
      hifzEnrolledRes,
      hifzStageRes,
      juzVerifiedRes,
      ijazahGrantedRes,
      resultsRecordedRes,
    ] = await Promise.all([
      sql.query(`SELECT status, COUNT(*)::int AS n FROM students WHERE ${SAMPLE_FILTER} GROUP BY status ORDER BY status`),
      sql.query(`
        SELECT c.institution, COUNT(*)::int AS n
        FROM students s LEFT JOIN classes c ON c.id = s.class_id
        WHERE ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')} AND s.status = 'active'
        GROUP BY c.institution ORDER BY n DESC`),
      sql.query(`
        SELECT COUNT(*)::int AS n FROM (
          SELECT sc.student_id FROM student_classes sc
          JOIN students s ON s.id = sc.student_id
          WHERE ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}
          GROUP BY sc.student_id HAVING COUNT(*) > 1
        ) t`),
      sql.query(`SELECT COUNT(*)::int AS n FROM guardians WHERE ${SAMPLE_FILTER}`),
      sql.query(`
        SELECT AVG(days_present::float / NULLIF(days_total, 0)) AS pct, COUNT(*)::int AS n
        FROM (
          SELECT DISTINCT ON (a.student_id) a.student_id, a.days_present, a.days_total
          FROM attendance_summary a JOIN students s ON s.id = a.student_id
          WHERE ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}
          ORDER BY a.student_id, a.updated_at DESC
        ) latest WHERE days_total > 0`),
      sql.query(`
        SELECT SUM(amount_due)::float AS due, SUM(amount_paid)::float AS paid, COUNT(*)::int AS n
        FROM (
          SELECT DISTINCT ON (f.student_id) f.student_id, f.amount_due, f.amount_paid
          FROM fee_status f JOIN students s ON s.id = f.student_id
          WHERE ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}
          ORDER BY f.student_id, f.updated_at DESC
        ) latest`),
      sql.query(`
        SELECT COUNT(*)::int AS n FROM hifz_enrolment he
        JOIN students s ON s.id = he.student_id WHERE ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}`),
      sql.query(`
        SELECT he.stage_number, COUNT(*)::int AS n FROM hifz_enrolment he
        JOIN students s ON s.id = he.student_id WHERE ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}
        GROUP BY he.stage_number ORDER BY he.stage_number`),
      sql.query(`
        SELECT COUNT(*)::int AS n FROM hifz_progress hp
        JOIN students s ON s.id = hp.student_id
        WHERE hp.status = 'verified' AND ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}`),
      sql.query(`
        SELECT COUNT(*)::int AS n FROM ijazah_register ir
        JOIN students s ON s.id = ir.student_id
        WHERE ir.revoked_at IS NULL AND ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}`),
      sql.query(`
        SELECT COUNT(*)::int AS n FROM term_results tr
        JOIN students s ON s.id = tr.student_id WHERE ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}`),
    ]);

    const byStatus = {};
    for (const row of byStatusRes.rows) byStatus[row.status] = row.n;
    const totalStudents = Object.values(byStatus).reduce((a, b) => a + b, 0);

    const stageCounts = new Map(hifzStageRes.rows.map((r) => [r.stage_number, r.n]));
    const hifzStageBreakdown = HIFZ_STAGES.map((s) => ({ stageNumber: s.number, label: s.label, count: stageCounts.get(s.number) || 0 }));

    const attendance = attendanceRes.rows[0];
    const fees = feesRes.rows[0];

    return json({
      generatedAt: new Date().toISOString(),
      sampleDataExcluded: true,
      students: {
        totalActive: byStatus.active || 0,
        byStatus,
        byInstitution: byInstitutionRes.rows.map((r) => ({ institution: r.institution || 'Unassigned', count: r.n })),
        dualEnrolledCount: dualEnrolledRes.rows[0] ? dualEnrolledRes.rows[0].n : 0,
      },
      guardians: { total: guardianCountRes.rows[0] ? guardianCountRes.rows[0].n : 0 },
      attendance: {
        averagePercent: attendance && attendance.pct != null ? Math.round(attendance.pct * 1000) / 10 : null,
        studentsWithRecordedAttendance: attendance ? attendance.n : 0,
        note: 'Based on each student\'s most recently recorded term — not a live daily figure.',
      },
      academics: {
        resultRecordsOnFile: resultsRecordedRes.rows[0] ? resultsRecordedRes.rows[0].n : 0,
        note: 'Result records exist, but with too few real entries yet to report a meaningful school-wide performance metric — see docs/founder-dashboard.md.',
      },
      hifz: {
        enrolledCount: hifzEnrolledRes.rows[0] ? hifzEnrolledRes.rows[0].n : 0,
        stageBreakdown: hifzStageBreakdown,
        juzVerifiedTotal: juzVerifiedRes.rows[0] ? juzVerifiedRes.rows[0].n : 0,
        ijazahsCurrentlyGranted: ijazahGrantedRes.rows[0] ? ijazahGrantedRes.rows[0].n : 0,
      },
      fees: {
        totalDue: fees && fees.due != null ? fees.due : 0,
        totalPaid: fees && fees.paid != null ? fees.paid : 0,
        totalOutstanding: fees && fees.due != null ? fees.due - (fees.paid || 0) : 0,
        recordsOnFile: fees ? fees.n : 0,
        note: 'The sum of amount_due/amount_paid fields staff have entered to date — a snapshot, not a real ledger with receipts or instalments. See FN-03 in the policy index.',
      },
      notYetAvailable: [
        { label: 'Revenue', reason: 'No real fee ledger exists yet — fees.totalPaid above is a due/paid snapshot, not recognised revenue. Blocked on FN-03 Tuition & Fees Policy (listed Missing in the policy index).' },
        { label: 'Staff / teacher headcount', reason: 'No staff identity system exists yet — see docs/digital-institution-blueprint.md Phase 2.' },
        { label: 'Admissions pipeline', reason: 'Only post-enrolment records exist today; there is no applications/offers/waiting-list workflow yet.' },
        { label: 'Boarding occupancy', reason: 'Boarding classes can be recorded, but there is no room/occupancy data model yet.' },
      ],
    });
  } catch (err) {
    console.error('founder dashboard error', err);
    return json({ error: 'Could not load the dashboard right now — please try again shortly.' }, 500);
  }
}
