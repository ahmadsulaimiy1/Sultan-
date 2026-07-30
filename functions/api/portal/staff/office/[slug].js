// Institutional Portal Ecosystem — the one data endpoint every office
// portal page (see js/portal-office.js) renders from. Session-gated
// (any authenticated staff member), not public: office directory
// information (who holds the seat, what the office does) is an
// internal-institution resource, not published outside the staff
// portal.
//
// Returns the office record, its current appointment(s) — including
// honest vacant seats, since office_appointments.staff_id can be NULL —
// its meetings and documents (both start empty per office and only grow
// through the admin panel, never fabricated here), and, where a real
// SYSTEM_AREA maps to this office, its pending workflow queue via the
// existing generic Approval Workflow engine. Offices with no such
// mapping get an honest empty queue, not an invented one. Also returns
// this office's committee sub-offices (if any) and its resolutions
// register — both start empty/vacant like everything else here; see
// docs/institutional-portal-architecture.md's "Level 3 Institutional
// Framework" section.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';
import { listPendingApprovals } from '../../../../_lib/approvals.js';
import { isQuranCollegeInstitution, HIFZ_STAGES } from '../../../../_lib/hifz.js';

// Operations Centre — real, institution-scoped daily-operations data for
// the four School Leadership offices. This is the honest answer to
// "governance exists, daily operations don't": every figure below is a
// real aggregate over that specific office's own institution, computed
// the same way the Founder Command Centre computes its institution-wide
// versions — never a separate, less-honest code path. Where the
// directive named a metric with no real underlying data model yet
// (Safeguarding Alerts, Behaviour Cases, Teacher Workload/Performance,
// WAEC/NECO Readiness, Student Rankings, Arabic Fluency Metrics, Tajweed
// Compliance beyond stage number, Boarding Performance, Discipline
// Intelligence, Predictive warnings), it is listed in `notYetTracked`
// with the real reason — never a fabricated number standing in for it.
const SCHOOL_LEADERSHIP_INSTITUTION = {
  'head-teacher': 'Nursery & Primary',
  'principal-royal-college': 'Royal College',
  raees: 'Islamic & Arabic Studies',
  mudeer: "Qur'an College",
};

// Only offices with a real, already-governed permission area get a
// workflow queue wired in — everything else honestly has none yet.
const OFFICE_AREA_CODE = {
  certificates: 'certificates',
  registrar: 'transcripts',
  admissions: 'admissions',
  finance: 'finance',
};

export async function onRequestGet({ request, env, params }) {
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

  const slug = params && params.slug;
  if (!slug) {
    return json({ error: 'Office slug is required.' }, 400);
  }

  try {
    const officeRes = await sql`
      SELECT o.id, o.name, o.office_type, o.office_kind, o.layer, o.slug, o.description, o.parent_office_id,
             o.strategic_priorities, o.annual_objectives, p.name AS parent_office_name
      FROM offices o
      LEFT JOIN offices p ON p.id = o.parent_office_id
      WHERE o.slug = ${slug} AND o.is_active = true`;
    const office = officeRes.rows[0];
    if (!office) {
      return json({ error: 'No office found with that slug.' }, 404);
    }

    const [appointmentsRes, staffCountRes, meetingsRes, documentsRes, committeesRes, resolutionsRes] = await Promise.all([
      sql`
        SELECT oa.id, oa.appointment_title, oa.is_acting, oa.is_primary, oa.started_at, oa.notes,
               s.id AS staff_id, s.staff_no, s.full_name, s.preferred_name, s.position_title,
               s.photo_url, s.bio, s.public_email, s.public_phone
        FROM office_appointments oa
        LEFT JOIN staff s ON s.id = oa.staff_id
        WHERE oa.office_id = ${office.id} AND oa.ended_at IS NULL
        ORDER BY oa.is_primary DESC, oa.started_at ASC NULLS LAST`,
      sql`SELECT COUNT(*)::int AS n FROM staff WHERE office_id = ${office.id} AND status = 'active'`,
      sql`
        SELECT id, title, meeting_date, agenda_text, minutes_text, status, created_at
        FROM office_meetings WHERE office_id = ${office.id}
        ORDER BY meeting_date DESC LIMIT 25`,
      sql`
        SELECT id, title, file_url, external_url, description, created_at
        FROM office_documents WHERE office_id = ${office.id}
        ORDER BY created_at DESC LIMIT 50`,
      sql`
        SELECT id, name, slug FROM offices
        WHERE parent_office_id = ${office.id} AND office_kind = 'committee' AND is_active = true
        ORDER BY name ASC`,
      sql`
        SELECT id, resolution_number, title, status, summary_text, resolved_at, created_at
        FROM office_resolutions WHERE office_id = ${office.id}
        ORDER BY created_at DESC LIMIT 50`,
    ]);

    const areaCode = OFFICE_AREA_CODE[office.slug];
    const pendingApprovals = areaCode
      ? (await listPendingApprovals(sql, { areaCode })).map((r) => ({
          id: r.id, targetType: r.target_type, requestedByName: r.requested_by_name, requestedAt: r.requested_at,
        }))
      : [];

    let operations = null;
    const institutionName = SCHOOL_LEADERSHIP_INSTITUTION[office.slug];
    if (institutionName) {
      const [
        studentsByStatusRes, staffCountRes2, attendanceRes, admissionsRes, hifzEnrolledRes, hifzStageRes, ijazahGrantedRes,
      ] = await Promise.all([
        sql`
          SELECT s.status, COUNT(*)::int AS n FROM students s
          JOIN classes c ON c.id = s.class_id
          WHERE c.institution = ${institutionName} AND s.is_sample_data = false
          GROUP BY s.status`,
        sql`
          SELECT COUNT(*)::int AS n FROM staff st
          JOIN institutions i ON i.id = st.institution_id
          WHERE i.name = ${institutionName} AND st.status = 'active'`,
        sql`
          SELECT AVG(latest.days_present::float / NULLIF(latest.days_total, 0)) AS pct, COUNT(*)::int AS n
          FROM (
            SELECT DISTINCT ON (a.student_id) a.student_id, a.days_present, a.days_total
            FROM attendance_summary a JOIN students s ON s.id = a.student_id
            WHERE s.is_sample_data = false
            ORDER BY a.student_id, a.updated_at DESC
          ) latest
          JOIN students s2 ON s2.id = latest.student_id
          JOIN classes c ON c.id = s2.class_id
          WHERE c.institution = ${institutionName} AND latest.days_total > 0`,
        sql`
          SELECT aa.status, COUNT(*)::int AS n FROM admissions_applications aa
          JOIN institutions i ON i.id = aa.institution_id
          WHERE i.name = ${institutionName}
          GROUP BY aa.status`,
        isQuranCollegeInstitution(institutionName)
          ? sql`SELECT COUNT(*)::int AS n FROM hifz_enrolment he JOIN students s ON s.id = he.student_id WHERE s.is_sample_data = false`
          : Promise.resolve({ rows: [{ n: 0 }] }),
        isQuranCollegeInstitution(institutionName)
          ? sql`SELECT stage_number, COUNT(*)::int AS n FROM hifz_enrolment he JOIN students s ON s.id = he.student_id WHERE s.is_sample_data = false GROUP BY stage_number`
          : Promise.resolve({ rows: [] }),
        isQuranCollegeInstitution(institutionName)
          ? sql`SELECT COUNT(*)::int AS n FROM ijazah_register ir JOIN students s ON s.id = ir.student_id WHERE ir.revoked_at IS NULL AND s.is_sample_data = false`
          : Promise.resolve({ rows: [{ n: 0 }] }),
      ]);

      const studentsByStatus = {};
      for (const r of studentsByStatusRes.rows) studentsByStatus[r.status] = r.n;
      const attendance = attendanceRes.rows[0];
      const admissionsByStatus = {};
      for (const r of admissionsRes.rows) admissionsByStatus[r.status] = r.n;

      let hifz = null;
      if (isQuranCollegeInstitution(institutionName)) {
        const stageCounts = new Map(hifzStageRes.rows.map((r) => [r.stage_number, r.n]));
        hifz = {
          enrolledCount: hifzEnrolledRes.rows[0] ? hifzEnrolledRes.rows[0].n : 0,
          stageBreakdown: HIFZ_STAGES.map((s) => ({ stageNumber: s.number, label: s.label, count: stageCounts.get(s.number) || 0 })),
          ijazahsCurrentlyGranted: ijazahGrantedRes.rows[0] ? ijazahGrantedRes.rows[0].n : 0,
          awaitingExamination: stageCounts.get(4) || 0,
        };
      }

      const NOT_YET_TRACKED = {
        'head-teacher': [
          { label: 'Safeguarding Alerts', reason: 'No safeguarding incident/case tracking system exists yet — a real gap, not a zero.' },
          { label: 'Parent Concerns Triage', reason: 'Institutional Messaging (see the Messages tab) carries real parent correspondence, but nothing categorizes a message as a "concern" requiring escalation yet.' },
          { label: 'Behaviour Cases', reason: 'No behaviour/discipline incident log exists yet for this age group.' },
          { label: 'Teacher Workload', reason: 'No timetable/workload data model exists yet.' },
        ],
        'principal-royal-college': [
          { label: 'WAEC / NECO Readiness', reason: 'No external-examination registration or mock-result tracking exists yet.' },
          { label: 'Student Rankings', reason: 'Too few real term_results entries school-wide to compute a meaningful ranking — see the Founder Command Centre\'s Academic Health note.' },
          { label: 'Teacher Performance', reason: 'No teacher performance/appraisal system exists yet.' },
          { label: 'Discipline Intelligence', reason: 'No behaviour/discipline incident log exists yet.' },
          { label: 'Academic Intervention Cases', reason: 'No intervention/support-plan tracking exists yet.' },
          { label: 'Graduation Readiness', reason: 'No graduation-requirements checklist system exists yet.' },
        ],
        raees: [
          { label: 'Arabic Fluency Metrics', reason: 'No fluency assessment/scoring system exists yet beyond standard term_results subject scores.' },
          { label: 'Teacher Deployment Intelligence', reason: 'No timetable/deployment data model exists yet.' },
          { label: 'Curriculum Completion', reason: 'No syllabus-coverage tracking exists yet.' },
        ],
        mudeer: [
          { label: "Muraja'ah Health", reason: 'Hifz stage progress is real (below); a separate revision-retention metric is not yet tracked.' },
          { label: 'Boarding Performance', reason: 'No boarding/room-occupancy data model exists yet.' },
          { label: 'Tajweed Compliance', reason: 'Tajweed confirmation is part of the real Stage 3 completion standard (see Hifz stage breakdown below), but no separate ongoing compliance score is tracked.' },
          { label: 'Teacher Capacity', reason: 'No Muhaffiz/Muhaffizah caseload-capacity model exists yet.' },
          { label: 'Student Risk Alerts', reason: 'No at-risk flagging system exists yet.' },
        ],
      };

      operations = {
        institution: institutionName,
        students: { total: Object.values(studentsByStatus).reduce((a, b) => a + b, 0), byStatus: studentsByStatus },
        staff: { total: staffCountRes2.rows[0] ? staffCountRes2.rows[0].n : 0 },
        attendance: { averagePercent: attendance && attendance.pct != null ? Math.round(attendance.pct * 1000) / 10 : null, studentsWithRecordedAttendance: attendance ? attendance.n : 0 },
        admissionsPipeline: { byStatus: admissionsByStatus, total: Object.values(admissionsByStatus).reduce((a, b) => a + b, 0) },
        hifz,
        notYetTracked: NOT_YET_TRACKED[office.slug] || [],
      };
    }

    const appointments = appointmentsRes.rows.map((r) => ({
      id: r.id,
      title: r.appointment_title,
      isActing: r.is_acting,
      isPrimary: r.is_primary,
      startedAt: r.started_at,
      notes: r.notes,
      isVacant: !r.staff_id,
      staff: r.staff_id ? {
        staffNo: r.staff_no,
        fullName: r.full_name,
        preferredName: r.preferred_name,
        positionTitle: r.position_title,
        photoUrl: r.photo_url,
        bio: r.bio,
        publicEmail: r.public_email,
        publicPhone: r.public_phone,
      } : null,
    }));

    return json({
      office: {
        id: office.id,
        name: office.name,
        officeType: office.office_type,
        officeKind: office.office_kind,
        layer: office.layer,
        slug: office.slug,
        description: office.description,
        parentOfficeName: office.parent_office_name,
        strategicPriorities: office.strategic_priorities,
        annualObjectives: office.annual_objectives,
      },
      appointments,
      staffCount: staffCountRes.rows[0].n,
      meetings: meetingsRes.rows.map((r) => ({
        id: r.id, title: r.title, meetingDate: r.meeting_date, agendaText: r.agenda_text,
        minutesText: r.minutes_text, status: r.status, createdAt: r.created_at,
      })),
      documents: documentsRes.rows.map((r) => ({
        id: r.id, title: r.title, fileUrl: r.file_url, externalUrl: r.external_url,
        description: r.description, createdAt: r.created_at,
      })),
      committees: committeesRes.rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug })),
      resolutions: resolutionsRes.rows.map((r) => ({
        id: r.id, resolutionNumber: r.resolution_number, title: r.title, status: r.status,
        summaryText: r.summary_text, resolvedAt: r.resolved_at, createdAt: r.created_at,
      })),
      workflow: { areaCode: areaCode || null, pending: pendingApprovals },
      operations,
    });
  } catch (err) {
    console.error('office portal data error', err);
    return json({ error: 'Could not load this office: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
