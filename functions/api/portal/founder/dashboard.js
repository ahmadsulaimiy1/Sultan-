// Founder/Executive Dashboard — read-only aggregate view across all
// four institutions. No new schema — every number here is a real
// aggregate over tables that already exist.
//
// Executive Identity migration (docs/executive-identity-design.md,
// docs/identity-migration-register.md item #1): the Permission Engine
// already grants EXE the `analytics` area's View permission, scoped
// "all institutions, aggregate" (permission-matrix.js) — the same
// staff-session + hasPermissionFor() pattern every other staff-facing
// endpoint in this project uses. That is now the PRIMARY auth path
// here, so a real signed-in staff member with the EXE role views this
// dashboard as themselves, not as an anonymous holder of a shared
// secret.
//
// PORTAL_FOUNDER_TOKEN remains a FALLBACK, deliberately not removed
// yet: no real EXE staff account has been confirmed to exist in any
// reachable environment (see docs/digital-campus-master-deployment-directive.md),
// so removing the only currently-working access path would lock this
// dashboard out entirely. Retire the fallback once a real EXE account
// is confirmed working — see the Identity Migration Register for the
// exact condition.
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
import { readStaffSessionFromRequest, timingSafeEqualString } from '../../../_lib/session.js';
import { hasPermissionFor } from '../../../_lib/permissions.js';
import { json } from '../../../_lib/http.js';
import { HIFZ_STAGES } from '../../../_lib/hifz.js';

const SAMPLE_FILTER = `is_sample_data = false`;

export async function onRequestGet({ request, env }) {
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'No database is linked yet.' }, 500);
  }

  let authMethod = null;
  let viewedBy = null;

  if (env.SESSION_SECRET) {
    let staffSession = null;
    try {
      staffSession = readStaffSessionFromRequest(request, env.SESSION_SECRET);
    } catch (err) {
      staffSession = null;
    }
    if (staffSession) {
      const grant = await hasPermissionFor(sql, staffSession.staffId, 'analytics', 'V', null);
      if (grant.granted) {
        authMethod = 'staff_session';
        const staffRes = await sql`SELECT full_name FROM staff WHERE id = ${staffSession.staffId}`;
        viewedBy = staffRes.rows[0] ? staffRes.rows[0].full_name : null;
      }
    }
  }

  if (!authMethod) {
    const founderToken = env.PORTAL_FOUNDER_TOKEN;
    if (founderToken && timingSafeEqualString(request.headers.get('x-founder-token'), founderToken)) {
      authMethod = 'bearer_token';
    }
  }

  if (!authMethod) {
    return json({ error: 'Not authorised. Sign in with an Executive-role staff account, or supply a valid Founder token.' }, 403);
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
      sql(`SELECT status, COUNT(*)::int AS n FROM students WHERE ${SAMPLE_FILTER} GROUP BY status ORDER BY status`),
      sql(`
        SELECT c.institution, COUNT(*)::int AS n
        FROM students s LEFT JOIN classes c ON c.id = s.class_id
        WHERE ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')} AND s.status = 'active'
        GROUP BY c.institution ORDER BY n DESC`),
      sql(`
        SELECT COUNT(*)::int AS n FROM (
          SELECT sc.student_id FROM student_classes sc
          JOIN students s ON s.id = sc.student_id
          WHERE ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}
          GROUP BY sc.student_id HAVING COUNT(*) > 1
        ) t`),
      sql(`SELECT COUNT(*)::int AS n FROM guardians WHERE ${SAMPLE_FILTER}`),
      sql(`
        SELECT AVG(days_present::float / NULLIF(days_total, 0)) AS pct, COUNT(*)::int AS n
        FROM (
          SELECT DISTINCT ON (a.student_id) a.student_id, a.days_present, a.days_total
          FROM attendance_summary a JOIN students s ON s.id = a.student_id
          WHERE ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}
          ORDER BY a.student_id, a.updated_at DESC
        ) latest WHERE days_total > 0`),
      sql(`
        SELECT SUM(amount_due)::float AS due, SUM(amount_paid)::float AS paid, COUNT(*)::int AS n
        FROM (
          SELECT DISTINCT ON (f.student_id) f.student_id, f.amount_due, f.amount_paid
          FROM fee_status f JOIN students s ON s.id = f.student_id
          WHERE ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}
          ORDER BY f.student_id, f.updated_at DESC
        ) latest`),
      sql(`
        SELECT COUNT(*)::int AS n FROM hifz_enrolment he
        JOIN students s ON s.id = he.student_id WHERE ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}`),
      sql(`
        SELECT he.stage_number, COUNT(*)::int AS n FROM hifz_enrolment he
        JOIN students s ON s.id = he.student_id WHERE ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}
        GROUP BY he.stage_number ORDER BY he.stage_number`),
      sql(`
        SELECT COUNT(*)::int AS n FROM hifz_progress hp
        JOIN students s ON s.id = hp.student_id
        WHERE hp.status = 'verified' AND ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}`),
      sql(`
        SELECT COUNT(*)::int AS n FROM ijazah_register ir
        JOIN students s ON s.id = ir.student_id
        WHERE ir.revoked_at IS NULL AND ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}`),
      sql(`
        SELECT COUNT(*)::int AS n FROM term_results tr
        JOIN students s ON s.id = tr.student_id WHERE ${SAMPLE_FILTER.replace('is_sample_data', 's.is_sample_data')}`),
    ]);

    // Institutional Command Centre (Founder Command Centre directive) —
    // real, computed institution-wide metrics no earlier phase needed:
    // staff headcount, active classes, governance seat fill rate,
    // upcoming governance meetings, and disclosed-threshold concern
    // counts. Every number below is a real aggregate; none is invented,
    // and every threshold used (75% attendance, a sub-50 subject score)
    // is stated plainly wherever it's shown, not silently applied.
    const [
      staffTotalRes, staffByInstitutionRes, activeClassesRes, attendanceByInstitutionRes,
      governanceRes, admissionsPendingRes, upcomingMeetingsRes, attendanceConcernRes, academicConcernRes,
      outstandingInvoiceCountRes,
    ] = await Promise.all([
      sql`SELECT COUNT(*)::int AS n FROM staff WHERE status = 'active'`,
      sql`
        SELECT COALESCE(i.name, 'Central / Multiple Institutions') AS institution, COUNT(*)::int AS n
        FROM staff st LEFT JOIN institutions i ON i.id = st.institution_id
        WHERE st.status = 'active' GROUP BY i.name ORDER BY n DESC`,
      sql`
        SELECT COUNT(DISTINCT c.id)::int AS n FROM classes c
        JOIN students s ON s.class_id = c.id
        WHERE s.status = 'active' AND s.is_sample_data = false`,
      sql`
        SELECT c.institution, AVG(latest.days_present::float / NULLIF(latest.days_total, 0)) AS pct
        FROM (
          SELECT DISTINCT ON (a.student_id) a.student_id, a.days_present, a.days_total
          FROM attendance_summary a JOIN students s ON s.id = a.student_id
          WHERE s.is_sample_data = false
          ORDER BY a.student_id, a.updated_at DESC
        ) latest
        JOIN students s2 ON s2.id = latest.student_id
        JOIN classes c ON c.id = s2.class_id
        WHERE latest.days_total > 0
        GROUP BY c.institution`,
      sql`SELECT COUNT(*) FILTER (WHERE staff_id IS NOT NULL)::int AS filled, COUNT(*)::int AS total FROM office_appointments WHERE ended_at IS NULL`,
      sql`SELECT COUNT(*)::int AS n FROM admissions_applications WHERE status IN ('submitted', 'under_review')`,
      sql`SELECT COUNT(*)::int AS n, MIN(meeting_date) AS soonest FROM office_meetings WHERE status = 'scheduled' AND meeting_date >= CURRENT_DATE AND meeting_date <= CURRENT_DATE + INTERVAL '30 days'`,
      sql`
        SELECT COUNT(*)::int AS n FROM (
          SELECT DISTINCT ON (a.student_id) a.student_id, a.days_present, a.days_total
          FROM attendance_summary a JOIN students s ON s.id = a.student_id
          WHERE s.is_sample_data = false AND s.status = 'active'
          ORDER BY a.student_id, a.updated_at DESC
        ) latest WHERE latest.days_total > 0 AND (latest.days_present::float / latest.days_total) < 0.75`,
      sql`
        SELECT COUNT(DISTINCT tr.student_id)::int AS n FROM term_results tr
        JOIN students s ON s.id = tr.student_id
        WHERE s.is_sample_data = false AND s.status = 'active' AND tr.total_score < 50`,
      sql`
        SELECT COUNT(*)::int AS n FROM invoices i JOIN students s ON s.id = i.student_id
        WHERE i.status IN ('unpaid', 'partial') AND s.is_sample_data = false`,
    ]);

    // Founder Command Centre Phase 2 (Founder Override Directive,
    // Priority 3) — Executive Timeline: a real, anonymised feed of
    // recent institutional events, unioned from four tables that
    // already record them (no new schema). Deliberately generic —
    // event category and, where the underlying record already has one,
    // its own institutional-level title (an office/committee/resolution
    // name, never a staff or student name) — same level of disclosure
    // the rest of this dashboard already uses for aggregate figures.
    const [auditEventsRes, meetingsHeldRes, resolutionsAdoptedRes, approvalsDecidedRes] = await Promise.all([
      sql`SELECT event_type, created_at FROM staff_audit_log ORDER BY created_at DESC LIMIT 6`,
      sql`SELECT o.name AS office_name, m.title, m.meeting_date AS at FROM office_meetings m JOIN offices o ON o.id = m.office_id WHERE m.status = 'held' ORDER BY m.meeting_date DESC LIMIT 6`,
      sql`SELECT o.name AS office_name, r.title, r.resolved_at AS at FROM office_resolutions r JOIN offices o ON o.id = r.office_id WHERE r.status = 'adopted' AND r.resolved_at IS NOT NULL ORDER BY r.resolved_at DESC LIMIT 6`,
      sql`SELECT area_code, status, decided_at AS at FROM staff_approvals WHERE status IN ('approved', 'rejected') AND decided_at IS NOT NULL ORDER BY decided_at DESC LIMIT 6`,
    ]);
    const AUDIT_EVENT_LABEL = {
      role_granted: 'A staff role was granted',
      role_revoked: 'A staff role was revoked',
      delegation_created: 'A delegation of authority was created',
      delegation_revoked: 'A delegation of authority was revoked',
      record_export: 'A data export was performed',
      sensitive_action: 'A sensitive administrative action was recorded',
    };
    const timeline = []
      .concat(auditEventsRes.rows.map((r) => ({ at: r.created_at, category: 'Governance & Access', label: AUDIT_EVENT_LABEL[r.event_type] || 'An administrative event was recorded' })))
      .concat(meetingsHeldRes.rows.map((r) => ({ at: r.at, category: 'Meetings', label: r.office_name + ' held a meeting: ' + r.title })))
      .concat(resolutionsAdoptedRes.rows.map((r) => ({ at: r.at, category: 'Governance', label: r.office_name + ' adopted a resolution: ' + r.title })))
      .concat(approvalsDecidedRes.rows.map((r) => ({
        at: r.at, category: 'Approvals',
        label: (r.status === 'approved' ? 'An approval request was approved' : 'An approval request was declined') + ' (' + r.area_code.replace(/_/g, ' ') + ')',
      })))
      .filter((e) => e.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 8);

    // Finance Platform (Priority 3) — real revenue/collection numbers,
    // computed from the actual invoice/receipt ledger, not the legacy
    // fee_status due/paid snapshot below (kept separately as `fees`,
    // unchanged, for backward compatibility with existing displays).
    const [
      revenueByMonthRes, revenueByInstitutionRes, outstandingByInstitutionRes, invoiceTotalsRes, scholarshipExposureRes,
    ] = await Promise.all([
      sql`
        SELECT to_char(date_trunc('month', r.paid_at), 'YYYY-MM') AS month, SUM(r.amount)::float AS total
        FROM receipts r JOIN invoices i ON i.id = r.invoice_id JOIN students s ON s.id = i.student_id
        WHERE r.revoked_at IS NULL AND s.is_sample_data = false AND r.paid_at >= (now() - interval '6 months')
        GROUP BY 1 ORDER BY 1`,
      sql`
        SELECT inst.name AS institution, SUM(r.amount)::float AS total
        FROM receipts r JOIN invoices i ON i.id = r.invoice_id JOIN students s ON s.id = i.student_id
        JOIN institutions inst ON inst.id = i.institution_id
        WHERE r.revoked_at IS NULL AND s.is_sample_data = false
        GROUP BY inst.name ORDER BY total DESC`,
      sql`
        SELECT inst.name AS institution, SUM(i.total_amount - COALESCE(p.paid, 0))::float AS outstanding
        FROM invoices i
        JOIN students s ON s.id = i.student_id
        JOIN institutions inst ON inst.id = i.institution_id
        LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid FROM receipts WHERE revoked_at IS NULL GROUP BY invoice_id) p ON p.invoice_id = i.id
        WHERE i.status IN ('unpaid', 'partial') AND s.is_sample_data = false
        GROUP BY inst.name ORDER BY outstanding DESC`,
      sql`
        SELECT SUM(i.total_amount)::float AS total_invoiced, SUM(COALESCE(p.paid, 0))::float AS total_paid
        FROM invoices i
        JOIN students s ON s.id = i.student_id
        LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid FROM receipts WHERE revoked_at IS NULL GROUP BY invoice_id) p ON p.invoice_id = i.id
        WHERE i.status != 'cancelled' AND s.is_sample_data = false`,
      sql`
        SELECT SUM(i.scholarship_discount)::float AS total_discount
        FROM invoices i JOIN students s ON s.id = i.student_id
        WHERE i.status != 'cancelled' AND s.is_sample_data = false`,
    ]);

    const byStatus = {};
    for (const row of byStatusRes.rows) byStatus[row.status] = row.n;
    const totalStudents = Object.values(byStatus).reduce((a, b) => a + b, 0);

    const stageCounts = new Map(hifzStageRes.rows.map((r) => [r.stage_number, r.n]));
    const hifzStageBreakdown = HIFZ_STAGES.map((s) => ({ stageNumber: s.number, label: s.label, count: stageCounts.get(s.number) || 0 }));

    const attendance = attendanceRes.rows[0];
    const fees = feesRes.rows[0];

    // Executive Overview / Institutional Health Score — every input is
    // a real, already-computed rate; the score is their plain average
    // over whichever inputs actually have enough data to be meaningful
    // (never padded with a fabricated placeholder for a missing one).
    // Disclosed in full on the dashboard itself, not just here.
    const invoiceTotals = invoiceTotalsRes.rows[0];
    const collectionRatePercent = invoiceTotals && invoiceTotals.total_invoiced
      ? Math.round((invoiceTotals.total_paid / invoiceTotals.total_invoiced) * 1000) / 10
      : null;
    const governance = governanceRes.rows[0];
    const governanceFillPercent = governance && governance.total
      ? Math.round((governance.filled / governance.total) * 1000) / 10
      : null;
    const resultsOnFile = resultsRecordedRes.rows[0] ? resultsRecordedRes.rows[0].n : 0;
    const ACADEMIC_HEALTH_MIN_RECORDS = 10;
    let academicHealthPercent = null;
    if (resultsOnFile >= ACADEMIC_HEALTH_MIN_RECORDS) {
      const avgRes = await sql`
        SELECT AVG(tr.total_score)::float AS avg FROM term_results tr
        JOIN students s ON s.id = tr.student_id WHERE s.is_sample_data = false`;
      academicHealthPercent = avgRes.rows[0] && avgRes.rows[0].avg != null ? Math.round(avgRes.rows[0].avg * 10) / 10 : null;
    }
    const attendanceAveragePercent = attendance && attendance.pct != null ? Math.round(attendance.pct * 1000) / 10 : null;
    const healthInputs = [attendanceAveragePercent, collectionRatePercent, governanceFillPercent].filter((v) => v != null);
    const institutionalHealthScore = healthInputs.length
      ? Math.round((healthInputs.reduce((a, b) => a + b, 0) / healthInputs.length) * 10) / 10
      : null;

    // Four Schools Overview — one real card per institution, merged
    // from the per-institution queries above. SCHOOL_DISPLAY maps the
    // stored institution name to the "Sultan Hanafi"-prefixed public
    // name (Phase 0b naming convention) without touching stored data.
    const SCHOOL_DISPLAY = {
      'Nursery & Primary': 'Sultan Hanafi Nursery & Primary School',
      'Royal College': 'Sultan Hanafi Royal College',
      'Islamic & Arabic Studies': 'Sultan Hanafi School of Islamic & Arabic Studies',
      "Qur'an College": "Sultan Hanafi Qur'an College",
    };
    const studentsByInst = new Map(byInstitutionRes.rows.map((r) => [r.institution, r.n]));
    const staffByInst = new Map(staffByInstitutionRes.rows.map((r) => [r.institution, r.n]));
    const attendanceByInst = new Map(attendanceByInstitutionRes.rows.map((r) => [r.institution, r.pct]));
    const revenueByInst = new Map(revenueByInstitutionRes.rows.map((r) => [r.institution, r.total]));
    const outstandingByInst = new Map(outstandingByInstitutionRes.rows.map((r) => [r.institution, r.outstanding]));
    const schools = Object.keys(SCHOOL_DISPLAY).map((name) => {
      const collected = revenueByInst.get(name) || 0;
      const outstanding = outstandingByInst.get(name) || 0;
      const instCollectionRate = (collected + outstanding) > 0 ? Math.round((collected / (collected + outstanding)) * 1000) / 10 : null;
      const instAttendance = attendanceByInst.has(name) ? Math.round(attendanceByInst.get(name) * 1000) / 10 : null;
      return {
        institution: name,
        displayName: SCHOOL_DISPLAY[name],
        activeStudents: studentsByInst.get(name) || 0,
        staff: staffByInst.get(name) || 0,
        attendancePercent: instAttendance,
        collectionRatePercent: instCollectionRate,
      };
    });

    // School Performance Ranking — a real composite (plain average of
    // whichever of the two measured rates a school actually has),
    // never padded with a fabricated number for a missing input. A
    // school with neither rate yet computable is listed as unranked
    // rather than silently dropped or given a 0.
    const schoolRanking = schools
      .map((s) => {
        const inputs = [s.attendancePercent, s.collectionRatePercent].filter((v) => v != null);
        const composite = inputs.length ? Math.round((inputs.reduce((a, b) => a + b, 0) / inputs.length) * 10) / 10 : null;
        return { displayName: s.displayName, compositeScore: composite };
      })
      .sort((a, b) => (b.compositeScore == null ? -1 : b.compositeScore) - (a.compositeScore == null ? -1 : a.compositeScore))
      .map((s, i) => ({ ...s, rank: s.compositeScore != null ? i + 1 : null }));

    // Strategic Watchlist — a curated top-5 view of the real concern
    // counts already computed for the Executive Alerts Centre above
    // (not a separate data source). Only items with a real, non-zero
    // count are eligible; capped at 5, most-concerning first.
    const watchlistCandidates = [
      { label: 'Admissions Requiring Approval', count: admissionsPendingRes.rows[0] ? admissionsPendingRes.rows[0].n : 0, href: '/portal/staff/admissions/' },
      { label: 'Outstanding Invoices', count: outstandingInvoiceCountRes.rows[0] ? outstandingInvoiceCountRes.rows[0].n : 0, href: '/portal/office/finance/' },
      { label: 'Attendance Concerns (below 75%)', count: attendanceConcernRes.rows[0] ? attendanceConcernRes.rows[0].n : 0, href: '/portal/office/registrar/' },
      { label: 'Academic Concerns (sub-50 score on file)', count: academicConcernRes.rows[0] ? academicConcernRes.rows[0].n : 0, href: '/portal/office/registrar/' },
      { label: 'Governance Meetings in Next 30 Days', count: upcomingMeetingsRes.rows[0] ? upcomingMeetingsRes.rows[0].n : 0, href: '/portal/office/executive/' },
    ];
    const watchlist = watchlistCandidates
      .filter((w) => w.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return json({
      generatedAt: new Date().toISOString(),
      sampleDataExcluded: true,
      // 'staff_session' means this request was attributable to a real,
      // named EXE-role staff account; 'bearer_token' means it used the
      // legacy shared-secret fallback — see the header comment above.
      authMethod,
      viewedBy,
      // Executive Overview — the Founder Command Centre's top strip.
      // Every figure here is also broken out in full detail further
      // down (students, fees, finance, etc.) — this is a summary, not
      // a separate data source.
      overview: {
        totalStudents: byStatus.active || 0,
        totalStaff: staffTotalRes.rows[0] ? staffTotalRes.rows[0].n : 0,
        totalGuardians: guardianCountRes.rows[0] ? guardianCountRes.rows[0].n : 0,
        totalActiveClasses: activeClassesRes.rows[0] ? activeClassesRes.rows[0].n : 0,
        totalOutstandingFees: outstandingByInstitutionRes.rows.reduce((sum, r) => sum + (r.outstanding || 0), 0),
        attendanceHealthPercent: attendanceAveragePercent,
        academicHealthPercent,
        academicHealthNote: academicHealthPercent == null
          ? `Not yet computed — fewer than ${ACADEMIC_HEALTH_MIN_RECORDS} result records on file school-wide.`
          : 'Average total score across every recorded result, all institutions.',
        governanceHealthPercent: governanceFillPercent,
        governanceHealthNote: 'Share of real office/committee/council seats currently filled (not vacant "Pending Appointment").',
        institutionalHealthScore,
        institutionalHealthScoreNote: institutionalHealthScore == null
          ? 'Not yet computed — none of the underlying rates (attendance, fee collection, governance fill) have enough data yet.'
          : 'Computed as the plain average of measured attendance rate, fee collection rate, and governance seat-fill rate — not a subjective rating, and it moves automatically as more real data is recorded.',
      },
      schools,
      schoolRanking,
      watchlist,
      timeline,
      alerts: {
        admissionsPending: admissionsPendingRes.rows[0] ? admissionsPendingRes.rows[0].n : 0,
        outstandingInvoices: outstandingInvoiceCountRes.rows[0] ? outstandingInvoiceCountRes.rows[0].n : 0,
        outstandingFeesTotal: outstandingByInstitutionRes.rows.reduce((sum, r) => sum + (r.outstanding || 0), 0),
        governanceMeetingsNext30Days: upcomingMeetingsRes.rows[0] ? upcomingMeetingsRes.rows[0].n : 0,
        nextGovernanceMeetingDate: upcomingMeetingsRes.rows[0] ? upcomingMeetingsRes.rows[0].soonest : null,
        attendanceConcerns: attendanceConcernRes.rows[0] ? attendanceConcernRes.rows[0].n : 0,
        attendanceConcernsThreshold: 'Active students whose most recently recorded attendance is below 75%.',
        academicConcerns: academicConcernRes.rows[0] ? academicConcernRes.rows[0].n : 0,
        academicConcernsThreshold: 'Active students with at least one recorded subject/term score below 50.',
        staffMatters: null,
        staffMattersNote: 'Not yet tracked — no staff-matters/HR case system exists yet.',
        systemNotifications: null,
        systemNotificationsNote: 'Not yet tracked — no system-level alerting exists yet beyond what is shown here.',
      },
      // Strategic Progress Centre — Vision 2035 framework. No adopted
      // Board strategy document exists yet, so this is a clearly-labelled
      // template scaffold (same honest pattern as office Strategic
      // Priorities), never asserted as real institutional fact.
      strategicProgress: {
        adopted: false,
        note: 'No Vision 2035 strategy has been formally adopted by the Board of Trustees yet. The structure below is a planning framework only.',
      },
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
        note: 'The legacy fee_status due/paid snapshot, kept for backward compatibility — superseded by the real invoice/receipt ledger in `finance` below (Priority 3).',
      },
      finance: {
        revenueByMonth: revenueByMonthRes.rows.map((r) => ({ month: r.month, total: r.total || 0 })),
        revenueByInstitution: revenueByInstitutionRes.rows.map((r) => ({ institution: r.institution, total: r.total || 0 })),
        outstandingByInstitution: outstandingByInstitutionRes.rows.map((r) => ({ institution: r.institution, outstanding: r.outstanding || 0 })),
        totalInvoiced: invoiceTotalsRes.rows[0] ? (invoiceTotalsRes.rows[0].total_invoiced || 0) : 0,
        totalCollected: invoiceTotalsRes.rows[0] ? (invoiceTotalsRes.rows[0].total_paid || 0) : 0,
        collectionRatePercent: (() => {
          const t = invoiceTotalsRes.rows[0];
          if (!t || !t.total_invoiced) return null;
          return Math.round((t.total_paid / t.total_invoiced) * 1000) / 10;
        })(),
        scholarshipExposure: scholarshipExposureRes.rows[0] ? (scholarshipExposureRes.rows[0].total_discount || 0) : 0,
        note: 'Real revenue and collection figures computed from the actual invoice/receipt ledger built in Priority 3 — includes only recorded, staff-entered payments; no online payment gateway exists yet.',
      },
      notYetAvailable: [
        { label: 'Boarding occupancy', reason: 'Boarding classes can be recorded, but there is no room/occupancy data model yet.' },
        { label: 'Staff Matters case tracking', reason: 'No HR case/incident system exists yet — Staff Identity records identity and roles, not open matters.' },
        { label: 'Board Papers / Vision 2035 adopted strategy', reason: 'No Board Papers Centre or adopted strategic plan exists yet — see the Strategic Progress Centre above for the current framework-only placeholder.' },
      ],
    });
  } catch (err) {
    console.error('founder dashboard error', err);
    return json({ error: 'Could not load the dashboard right now — please try again shortly.' }, 500);
  }
}
