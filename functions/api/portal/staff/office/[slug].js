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
// Framework" section. Also returns the Board Papers Centre's action-item
// register (office_action_items), with isOverdue computed here at query
// time rather than by a cron job, which this project doesn't have.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';
import { listPendingApprovals } from '../../../../_lib/approvals.js';
import { isQuranCollegeInstitution, HIFZ_STAGES } from '../../../../_lib/hifz.js';
import { effectiveGrants, checkGrants } from '../../../../_lib/permissions.js';

// Operational Framework cards — the Leadership Dashboards retrofit. Seven
// Institutional Capability Frameworks now exist with real schema and
// Permission Engine grants (see functions/api/portal/staff/<name>.js);
// this replaces the corresponding `notYetTracked` entries with the same
// "Operational Framework Ready" presentation used on each framework's own
// page — Framework status, Records count, Assigned staff, Last update,
// Compliance state, Action required — instead of leaving them listed as
// a gap now that the gap is closed. Genuinely untracked items (no
// framework built yet) stay in the trimmed NOT_YET_TRACKED list below.
//
// Each card is gated by the SAME Permission Engine check the framework's
// own staff API enforces (checkGrants against this office's institution)
// — a viewer without View rights for an area (e.g. non-DSL staff and
// Safeguarding, per SW-01 §7.3 confidentiality) sees only that the
// framework exists and is ready, never its record counts or compliance
// detail. This is the identical confidentiality-by-omission rule already
// governing the framework's own page, applied here too, not a new rule.
const FRAMEWORK_RESTRICTED_NOTE = {
  safeguarding: 'Detail is confidential to the Designated Safeguarding Lead, per SW-01 §7.3.',
  behaviour: "Detail is visible to this student's Class Teacher, VP Administration, and the Principal, per SD-02 §7.",
  teacher_performance: 'Detail is visible to the Principal and VP Administration.',
  exam_readiness: 'Detail is visible to the Registrar and Academic Registrar.',
  arabic_fluency: 'Detail is visible to Arabic Faculty and the Principal.',
  tajweed_compliance: 'Detail is visible to the Muhaffiz/Muhaffizah and the Principal.',
  boarding_intelligence: 'Detail is visible to the Boarding Officer, the Principal, and (where safeguarding-relevant) the Designated Safeguarding Lead.',
};

async function safeguardingCard(sql, institutionId) {
  const [caseRes, staffRes] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n, MAX(updated_at) AS last_update,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed'))::int AS open_n
        FROM safeguarding_cases WHERE institution_id = ${institutionId}`,
    sql`SELECT COUNT(DISTINCT staff_id)::int AS n FROM staff_roles WHERE role_code = 'DSL' AND is_active = true`,
  ]);
  const r = caseRes.rows[0];
  return {
    recordsCount: r.n, assignedStaff: staffRes.rows[0].n, lastUpdate: r.last_update,
    complianceState: r.n === 0 ? 'Nominal — no cases on record' : (r.open_n > 0 ? r.open_n + ' case(s) open' : 'All cases closed'),
    actionRequired: r.open_n > 0 ? r.open_n + ' case(s) awaiting review disposition' : 'None',
  };
}

async function behaviourCard(sql, institutionId) {
  const [incRes, staffRes] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n, MAX(updated_at) AS last_update,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved'))::int AS open_n
        FROM behaviour_incidents WHERE institution_id = ${institutionId}`,
    sql`SELECT COUNT(DISTINCT staff_id)::int AS n FROM staff_roles WHERE is_active = true AND (
          role_code = 'VP' OR (role_code IN ('PRIN', 'TCH') AND institution_id = ${institutionId})
        )`,
  ]);
  const r = incRes.rows[0];
  return {
    recordsCount: r.n, assignedStaff: staffRes.rows[0].n, lastUpdate: r.last_update,
    complianceState: r.n === 0 ? 'Nominal — no incidents on record' : (r.open_n > 0 ? r.open_n + ' incident(s) open' : 'All incidents resolved'),
    actionRequired: r.open_n > 0 ? r.open_n + ' incident(s) awaiting resolution' : 'None',
  };
}

async function teacherPerformanceCard(sql, institutionId) {
  const [obsRes, revRes, staffRes] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n, MAX(updated_at) AS last_update,
        COUNT(*) FILTER (WHERE status IN ('scheduled', 'follow_up_required'))::int AS open_n
        FROM teacher_observations WHERE institution_id = ${institutionId}`,
    sql`SELECT COUNT(*)::int AS n, MAX(updated_at) AS last_update,
        COUNT(*) FILTER (WHERE status IN ('scheduled', 'in_progress'))::int AS open_n
        FROM teacher_reviews WHERE institution_id = ${institutionId}`,
    sql`SELECT COUNT(DISTINCT staff_id)::int AS n FROM staff_roles WHERE is_active = true AND (
          role_code = 'VP' OR (role_code = 'PRIN' AND institution_id = ${institutionId})
        )`,
  ]);
  const obs = obsRes.rows[0]; const rev = revRes.rows[0];
  const n = obs.n + rev.n; const openN = obs.open_n + rev.open_n;
  const lastDates = [obs.last_update, rev.last_update].filter(Boolean).sort();
  return {
    recordsCount: n, assignedStaff: staffRes.rows[0].n, lastUpdate: lastDates.length ? lastDates[lastDates.length - 1] : null,
    complianceState: n === 0 ? 'Nominal — no observations/reviews on record' : (openN > 0 ? openN + ' item(s) in progress' : 'All observations/reviews completed'),
    actionRequired: openN > 0 ? openN + ' observation/review item(s) awaiting completion' : 'None',
  };
}

async function examReadinessCard(sql, institutionId) {
  const [candRes, staffRes] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n, MAX(updated_at) AS last_update,
        COUNT(*) FILTER (WHERE registration_status = 'not_registered')::int AS unregistered_n
        FROM exam_candidates WHERE institution_id = ${institutionId}`,
    sql`SELECT COUNT(DISTINCT staff_id)::int AS n FROM staff_roles WHERE is_active = true AND role_code IN ('REG', 'AREG')`,
  ]);
  const r = candRes.rows[0];
  return {
    recordsCount: r.n, assignedStaff: staffRes.rows[0].n, lastUpdate: r.last_update,
    complianceState: r.n === 0 ? 'Nominal — no candidates registered yet' : (r.unregistered_n > 0 ? r.unregistered_n + ' candidate(s) not yet registered' : 'All candidates registered'),
    actionRequired: r.unregistered_n > 0 ? r.unregistered_n + ' candidate(s) awaiting registration' : 'None',
  };
}

async function arabicFluencyCard(sql, institutionId) {
  const [assessRes, staffRes] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n, MAX(assessed_at) AS last_update FROM arabic_fluency_assessments WHERE institution_id = ${institutionId}`,
    sql`SELECT COUNT(DISTINCT staff_id)::int AS n FROM staff_roles WHERE is_active = true AND role_code = 'ARB' AND institution_id = ${institutionId}`,
  ]);
  const r = assessRes.rows[0];
  return {
    recordsCount: r.n, assignedStaff: staffRes.rows[0].n, lastUpdate: r.last_update,
    complianceState: r.n === 0 ? 'Nominal — no assessments on record yet' : 'Assessment cycle in progress',
    actionRequired: r.n === 0 ? 'Schedule the first assessment cycle' : 'None',
  };
}

async function tajweedComplianceCard(sql, institutionId) {
  const [assessRes, staffRes] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n, MAX(assessed_at) AS last_update,
        COUNT(*) FILTER (WHERE compliance_level = 'developing')::int AS developing_n
        FROM tajweed_assessments WHERE institution_id = ${institutionId}`,
    sql`SELECT COUNT(DISTINCT staff_id)::int AS n FROM staff_roles WHERE is_active = true AND role_code = 'MUH' AND institution_id = ${institutionId}`,
  ]);
  const r = assessRes.rows[0];
  return {
    recordsCount: r.n, assignedStaff: staffRes.rows[0].n, lastUpdate: r.last_update,
    complianceState: r.n === 0 ? 'Nominal — no assessments on record yet' : (r.developing_n > 0 ? r.developing_n + ' student(s) at developing level' : 'All assessed students at competent level or above'),
    actionRequired: r.n === 0 ? 'Schedule the first assessment cycle' : 'None',
  };
}

async function boardingCard(sql, institutionId) {
  const [welfareRes, roomRes, staffRes] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n, MAX(recorded_at) AS last_update,
        COUNT(*) FILTER (WHERE status = 'open')::int AS open_n
        FROM boarding_welfare_logs WHERE institution_id = ${institutionId}`,
    sql`SELECT COUNT(*)::int AS n, MAX(recorded_at) AS last_update FROM boarding_room_checks WHERE institution_id = ${institutionId}`,
    sql`SELECT COUNT(DISTINCT staff_id)::int AS n FROM staff_roles WHERE is_active = true AND role_code = 'BRD'`,
  ]);
  const w = welfareRes.rows[0]; const rc = roomRes.rows[0];
  const n = w.n + rc.n;
  const lastDates = [w.last_update, rc.last_update].filter(Boolean).sort();
  return {
    recordsCount: n, assignedStaff: staffRes.rows[0].n, lastUpdate: lastDates.length ? lastDates[lastDates.length - 1] : null,
    complianceState: n === 0 ? 'Nominal — no welfare entries or room checks on record yet' : (w.open_n > 0 ? w.open_n + ' welfare entry/entries open' : 'All welfare entries resolved'),
    actionRequired: w.open_n > 0 ? w.open_n + ' welfare entry/entries awaiting resolution' : 'None',
  };
}

// Which framework cards render on which office's Operations Centre, in
// the order the original notYetTracked list named them.
const OFFICE_FRAMEWORKS = {
  'head-teacher': [
    { key: 'safeguarding', label: 'Safeguarding Alerts', areaCode: 'safeguarding', href: '/portal/staff/safeguarding/', load: safeguardingCard },
    { key: 'behaviour', label: 'Behaviour Cases', areaCode: 'behaviour', href: '/portal/staff/behaviour/', load: behaviourCard },
  ],
  'principal-royal-college': [
    { key: 'exam_readiness', label: 'WAEC / NECO Readiness', areaCode: 'exam_readiness', href: '/portal/staff/waec-readiness/', load: examReadinessCard },
    { key: 'teacher_performance', label: 'Teacher Performance', areaCode: 'teacher_performance', href: '/portal/staff/teacher-performance/', load: teacherPerformanceCard },
    { key: 'behaviour', label: 'Discipline Intelligence', areaCode: 'behaviour', href: '/portal/staff/behaviour/', load: behaviourCard },
  ],
  raees: [
    { key: 'arabic_fluency', label: 'Arabic Fluency Metrics', areaCode: 'arabic_fluency', href: '/portal/staff/arabic-fluency/', load: arabicFluencyCard },
  ],
  mudeer: [
    { key: 'tajweed_compliance', label: 'Tajweed Compliance', areaCode: 'tajweed_compliance', href: '/portal/staff/tajweed-compliance/', load: tajweedComplianceCard },
    { key: 'boarding_intelligence', label: 'Boarding Performance', areaCode: 'boarding_intelligence', href: '/portal/staff/boarding-intelligence/', load: boardingCard },
  ],
};

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

    const [appointmentsRes, staffCountRes, meetingsRes, documentsRes, committeesRes, resolutionsRes, actionItemsRes] = await Promise.all([
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
      sql`
        SELECT ai.id, ai.title, ai.description, ai.due_date, ai.status, ai.created_at, ai.completed_at,
               (ai.due_date IS NOT NULL AND ai.due_date < CURRENT_DATE
                 AND ai.status NOT IN ('done', 'cancelled')) AS is_overdue,
               owner.staff_no AS owner_staff_no, owner.full_name AS owner_name
        FROM office_action_items ai
        LEFT JOIN staff owner ON owner.id = ai.owner_staff_id
        WHERE ai.office_id = ${office.id}
        ORDER BY (ai.status IN ('open', 'in_progress')) DESC, ai.due_date ASC NULLS LAST, ai.created_at DESC LIMIT 100`,
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
        studentsByStatusRes, staffCountRes2, attendanceRes, admissionsRes, hifzEnrolledRes, hifzStageRes, ijazahGrantedRes, institutionRowRes,
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
        sql`SELECT id FROM institutions WHERE name = ${institutionName}`,
      ]);
      const institutionId = institutionRowRes.rows[0] ? institutionRowRes.rows[0].id : null;

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

      // Genuinely remaining gaps — no framework has been built for these
      // yet, so they stay honestly named rather than upgraded.
      const NOT_YET_TRACKED = {
        'head-teacher': [
          { label: 'Parent Concerns Triage', reason: 'Institutional Messaging (see the Messages tab) carries real parent correspondence, but nothing categorizes a message as a "concern" requiring escalation yet.' },
          { label: 'Teacher Workload', reason: 'No timetable/workload data model exists yet.' },
        ],
        'principal-royal-college': [
          { label: 'Student Rankings', reason: 'Too few real term_results entries school-wide to compute a meaningful ranking — see the Founder Command Centre\'s Academic Health note.' },
          { label: 'Academic Intervention Cases', reason: 'No intervention/support-plan tracking exists yet.' },
          { label: 'Graduation Readiness', reason: 'No graduation-requirements checklist system exists yet.' },
        ],
        raees: [
          { label: 'Teacher Deployment Intelligence', reason: 'No timetable/deployment data model exists yet.' },
          { label: 'Curriculum Completion', reason: 'No syllabus-coverage tracking exists yet.' },
        ],
        mudeer: [
          { label: "Muraja'ah Health", reason: 'Hifz stage progress is real (below); a separate revision-retention metric is not yet tracked.' },
          { label: 'Teacher Capacity', reason: 'No Muhaffiz/Muhaffizah caseload-capacity model exists yet.' },
          { label: 'Student Risk Alerts', reason: 'No at-risk flagging system exists yet.' },
        ],
      };

      const grants = await effectiveGrants(sql, session.staffId);
      const frameworkConfigs = OFFICE_FRAMEWORKS[office.slug] || [];
      const operationalFrameworks = await Promise.all(frameworkConfigs.map(async (cfg) => {
        const base = { key: cfg.key, label: cfg.label, status: 'Operational Framework Ready', href: cfg.href };
        const { granted } = institutionId != null ? checkGrants(grants, cfg.areaCode, 'V', institutionId) : { granted: false };
        if (!granted) {
          return { ...base, restricted: true, restrictedNote: FRAMEWORK_RESTRICTED_NOTE[cfg.areaCode] || null };
        }
        const detail = await cfg.load(sql, institutionId);
        return { ...base, restricted: false, ...detail };
      }));

      operations = {
        institution: institutionName,
        students: { total: Object.values(studentsByStatus).reduce((a, b) => a + b, 0), byStatus: studentsByStatus },
        staff: { total: staffCountRes2.rows[0] ? staffCountRes2.rows[0].n : 0 },
        attendance: { averagePercent: attendance && attendance.pct != null ? Math.round(attendance.pct * 1000) / 10 : null, studentsWithRecordedAttendance: attendance ? attendance.n : 0 },
        admissionsPipeline: { byStatus: admissionsByStatus, total: Object.values(admissionsByStatus).reduce((a, b) => a + b, 0) },
        hifz,
        operationalFrameworks,
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
      actionItems: actionItemsRes.rows.map((r) => ({
        id: r.id, title: r.title, description: r.description, dueDate: r.due_date, status: r.status,
        createdAt: r.created_at, completedAt: r.completed_at, isOverdue: !!r.is_overdue,
        owner: r.owner_staff_no ? { staffNo: r.owner_staff_no, fullName: r.owner_name } : null,
      })),
      workflow: { areaCode: areaCode || null, pending: pendingApprovals },
      operations,
    });
  } catch (err) {
    console.error('office portal data error', err);
    return json({ error: 'Could not load this office: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
