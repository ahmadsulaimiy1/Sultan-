// Institutional Excellence 2030 — Executive Reporting System.
//
// A real, period-bounded report generator, not a document-authoring
// tool: given an office slug and a period type (monthly/quarterly/
// annual), it aggregates that office's own already-real transactional
// data (invoices/receipts, certificates, lifecycle events, admissions
// applications) over the resolved date range, plus a small set of
// as-of-now snapshot figures for offices whose only real numbers are
// current counts (students/staff/attendance/hifz — the same Operations
// Centre data the office API already computes). Session-gated like the
// rest of the office directory (any authenticated staff member) — this
// endpoint reads no data that isn't already visible elsewhere in the
// portal, it only re-shapes it into a report.
//
// Offices with neither a transactional table nor an Operations Centre
// entry (the ~21 generic governance/HR/digital/etc. portals) return
// available:false with the honest reason, matching the same
// "no fabricated report" discipline as renderReports()'s prior
// "not yet built" placeholder — the placeholder was correct; this file
// makes it correct for fewer offices, not zero.
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json } from '../../../_lib/http.js';
import { isQuranCollegeInstitution } from '../../../_lib/hifz.js';

const SCHOOL_LEADERSHIP_INSTITUTION = {
  'head-teacher': 'Nursery and Primary',
  'principal-royal-college': 'Royal College',
  raees: 'Islamic and Arabic Studies',
  mudeer: "Qur'an College",
};

const PERIOD_TYPES = ['monthly', 'quarterly', 'annual'];

function resolvePeriod(periodType, anchorStr) {
  const anchor = anchorStr ? new Date(anchorStr + 'T00:00:00Z') : new Date();
  if (isNaN(anchor.getTime())) return null;
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  let start, end, label;
  if (periodType === 'monthly') {
    start = new Date(Date.UTC(y, m, 1));
    end = new Date(Date.UTC(y, m + 1, 1));
    label = start.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  } else if (periodType === 'quarterly') {
    const q = Math.floor(m / 3);
    start = new Date(Date.UTC(y, q * 3, 1));
    end = new Date(Date.UTC(y, q * 3 + 3, 1));
    label = 'Q' + (q + 1) + ' ' + y;
  } else if (periodType === 'annual') {
    start = new Date(Date.UTC(y, 0, 1));
    end = new Date(Date.UTC(y + 1, 0, 1));
    label = String(y);
  } else {
    return null;
  }
  return { start, end, label };
}

async function financeSection(sql, start, end) {
  const [issuedRes, paidRes, outstandingRes] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n, COALESCE(SUM(total_amount),0)::numeric AS total
        FROM invoices WHERE created_at >= ${start} AND created_at < ${end} AND status != 'cancelled'`,
    sql`SELECT COUNT(*)::int AS n, COALESCE(SUM(amount),0)::numeric AS total
        FROM receipts WHERE paid_at >= ${start} AND paid_at < ${end} AND revoked_at IS NULL`,
    sql`SELECT COUNT(*)::int AS n FROM invoices WHERE status IN ('unpaid', 'partial')`,
  ]);
  return {
    invoicesIssued: { count: issuedRes.rows[0].n, totalAmount: Number(issuedRes.rows[0].total) },
    paymentsReceived: { count: paidRes.rows[0].n, totalAmount: Number(paidRes.rows[0].total) },
    outstandingInvoicesAsOfNow: outstandingRes.rows[0].n,
  };
}

async function registrarSection(sql, start, end) {
  const [certRes, lifecycleRes] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM certificates
        WHERE issued_at >= ${start} AND issued_at < ${end} AND revoked_at IS NULL`,
    sql`SELECT event_type, COUNT(*)::int AS n FROM student_lifecycle_events
        WHERE effective_date >= ${start} AND effective_date < ${end} GROUP BY event_type`,
  ]);
  const lifecycleByType = {};
  for (const r of lifecycleRes.rows) lifecycleByType[r.event_type] = r.n;
  return { certificatesIssued: certRes.rows[0].n, lifecycleEvents: lifecycleByType };
}

async function admissionsSection(sql, start, end, institutionName) {
  const [receivedRes, decidedRes] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM admissions_applications aa
        JOIN institutions i ON i.id = aa.institution_id
        WHERE aa.submitted_at >= ${start} AND aa.submitted_at < ${end}
          AND (${institutionName}::text IS NULL OR i.name = ${institutionName})`,
    sql`SELECT aa.status, COUNT(*)::int AS n FROM admissions_applications aa
        JOIN institutions i ON i.id = aa.institution_id
        WHERE aa.updated_at >= ${start} AND aa.updated_at < ${end}
          AND aa.status IN ('offered', 'admitted', 'declined')
          AND (${institutionName}::text IS NULL OR i.name = ${institutionName})
        GROUP BY aa.status`,
  ]);
  const decidedByStatus = {};
  for (const r of decidedRes.rows) decidedByStatus[r.status] = r.n;
  return { applicationsReceived: receivedRes.rows[0].n, decisionsRecorded: decidedByStatus };
}

// School Leadership offices: current (as-of-now) snapshot — same shape
// as the office API's Operations Centre, computed the same way — plus
// the real period-bound flow figures (admissions decided, lifecycle
// events) for that specific institution.
async function schoolLeadershipSection(sql, slug, start, end) {
  const institutionName = SCHOOL_LEADERSHIP_INSTITUTION[slug];
  const [studentsByStatusRes, staffCountRes, attendanceRes, hifzEnrolledRes, ijazahGrantedRes, lifecycleRes] = await Promise.all([
    sql`SELECT s.status, COUNT(*)::int AS n FROM students s
        JOIN classes c ON c.id = s.class_id
        WHERE c.institution = ${institutionName} AND s.is_sample_data = false
        GROUP BY s.status`,
    sql`SELECT COUNT(*)::int AS n FROM staff st
        JOIN institutions i ON i.id = st.institution_id
        WHERE i.name = ${institutionName} AND st.status = 'active'`,
    sql`SELECT AVG(latest.days_present::float / NULLIF(latest.days_total, 0)) AS pct
        FROM (
          SELECT DISTINCT ON (a.student_id) a.student_id, a.days_present, a.days_total
          FROM attendance_summary a JOIN students s ON s.id = a.student_id
          WHERE s.is_sample_data = false
          ORDER BY a.student_id, a.updated_at DESC
        ) latest
        JOIN students s2 ON s2.id = latest.student_id
        JOIN classes c ON c.id = s2.class_id
        WHERE c.institution = ${institutionName} AND latest.days_total > 0`,
    isQuranCollegeInstitution(institutionName)
      ? sql`SELECT COUNT(*)::int AS n FROM hifz_enrolment he JOIN students s ON s.id = he.student_id WHERE s.is_sample_data = false`
      : Promise.resolve({ rows: [{ n: 0 }] }),
    isQuranCollegeInstitution(institutionName)
      ? sql`SELECT COUNT(*)::int AS n FROM ijazah_register ir JOIN students s ON s.id = ir.student_id WHERE ir.revoked_at IS NULL AND s.is_sample_data = false`
      : Promise.resolve({ rows: [{ n: 0 }] }),
    sql`SELECT event_type, COUNT(*)::int AS n FROM student_lifecycle_events sle
        JOIN students s ON s.id = sle.student_id
        JOIN classes c ON c.id = s.class_id
        WHERE c.institution = ${institutionName}
          AND sle.effective_date >= ${start} AND sle.effective_date < ${end}
        GROUP BY event_type`,
  ]);
  const studentsByStatus = {};
  for (const r of studentsByStatusRes.rows) studentsByStatus[r.status] = r.n;
  const lifecycleByType = {};
  for (const r of lifecycleRes.rows) lifecycleByType[r.event_type] = r.n;
  const admissions = await admissionsSection(sql, start, end, institutionName);
  const attendance = attendanceRes.rows[0];
  return {
    asOfNow: {
      students: { total: Object.values(studentsByStatus).reduce((a, b) => a + b, 0), byStatus: studentsByStatus },
      staff: { total: staffCountRes.rows[0] ? staffCountRes.rows[0].n : 0 },
      attendanceAveragePercent: attendance && attendance.pct != null ? Math.round(attendance.pct * 1000) / 10 : null,
      hifzEnrolledCount: isQuranCollegeInstitution(institutionName) ? (hifzEnrolledRes.rows[0] ? hifzEnrolledRes.rows[0].n : 0) : null,
      ijazahsCurrentlyGranted: isQuranCollegeInstitution(institutionName) ? (ijazahGrantedRes.rows[0] ? ijazahGrantedRes.rows[0].n : 0) : null,
    },
    inPeriod: {
      lifecycleEvents: lifecycleByType,
      admissionsDecisionsRecorded: admissions.decisionsRecorded,
      admissionsApplicationsReceived: admissions.applicationsReceived,
    },
  };
}

// Founder/Executive: the same computations, institution-unfiltered, so
// it's a genuine roll-up rather than a re-derivation with different
// logic — never duplicated with a second, potentially-diverging code
// path for "the same number, institution-wide."
async function executiveSection(sql, start, end) {
  const [finance, registrar, admissions] = await Promise.all([
    financeSection(sql, start, end),
    registrarSection(sql, start, end),
    admissionsSection(sql, start, end, null),
  ]);
  const [studentsRes, staffRes] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM students WHERE is_sample_data = false AND status = 'active'`,
    sql`SELECT COUNT(*)::int AS n FROM staff WHERE status = 'active'`,
  ]);
  return {
    asOfNow: { activeStudents: studentsRes.rows[0].n, activeStaff: staffRes.rows[0].n },
    inPeriod: { finance, registrar, admissions },
  };
}

const SECTION_BUILDERS = {
  finance: (sql, start, end) => financeSection(sql, start, end).then((finance) => ({ finance })),
  registrar: (sql, start, end) => registrarSection(sql, start, end).then((registrar) => ({ registrar })),
  admissions: (sql, start, end) => admissionsSection(sql, start, end, null).then((admissions) => ({ admissions })),
  executive: (sql, start, end) => executiveSection(sql, start, end),
};

export async function onRequestGet({ request, env }) {
  if (!env.SESSION_SECRET) return json({ error: 'Portal is not configured yet.' }, 500);
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  if (!session) return json({ error: 'Not signed in.' }, 401);
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const url = new URL(request.url);
  const officeSlug = url.searchParams.get('office');
  const periodType = url.searchParams.get('period') || 'monthly';
  const anchor = url.searchParams.get('anchor');
  if (!officeSlug) return json({ error: 'office is required.' }, 400);
  if (!PERIOD_TYPES.includes(periodType)) return json({ error: 'period must be monthly, quarterly, or annual.' }, 400);
  const period = resolvePeriod(periodType, anchor);
  if (!period) return json({ error: 'Invalid anchor date.' }, 400);

  try {
    const isSchoolLeadership = Object.prototype.hasOwnProperty.call(SCHOOL_LEADERSHIP_INSTITUTION, officeSlug);
    const builder = SECTION_BUILDERS[officeSlug];
    if (!builder && !isSchoolLeadership) {
      return json({
        available: false,
        reason: 'No transactional or operational data exists yet for this office to generate a report from. Real, working reports exist today for Finance, the Registrar\'s Office, Admissions, the four School Leadership offices, and the Executive/Founder roll-up.',
        periodType,
        period: { label: period.label, start: period.start.toISOString(), end: period.end.toISOString() },
      });
    }
    const data = isSchoolLeadership
      ? await schoolLeadershipSection(sql, officeSlug, period.start, period.end)
      : await builder(sql, period.start, period.end);

    return json({
      available: true,
      officeSlug,
      periodType,
      period: { label: period.label, start: period.start.toISOString(), end: period.end.toISOString() },
      generatedAt: new Date().toISOString(),
      data,
    });
  } catch (err) {
    return json({ error: 'Could not generate this report: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
