// Examination Readiness Framework — shared, real engine covering both
// WAEC and NECO (parametrized by `examBody`, never duplicated
// table-for-table — see functions/api/portal/setup.js for why one
// engine is the correct real-world model). Same Institutional
// Capability Framework pattern as Safeguarding/Behaviour/Teacher
// Performance. Zero transactional records exist yet (Current
// Records: 0).
//
// GET  ?examBody=WAEC|NECO — framework status + real (possibly empty)
//        candidate list, scoped by institution grant.
// POST — { action: 'register-candidate' | 'update-subject-readiness' |
//          'record-mock-result' | 'flag-risk' | 'resolve-flag' }
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { effectiveGrants, checkGrants } from '../../../_lib/permissions.js';
import { hasPermission } from '../../../_lib/permission-matrix.js';

function subCapabilities(examBody) {
  return [
    { key: 'candidate_tracking', label: 'Candidate Tracking', description: 'Every ' + examBody + ' candidate on a real register, tied to the actual student record.' },
    { key: 'registration_tracking', label: 'Registration Tracking', description: 'Not Registered → Registered → Confirmed → Sat — the real registration lifecycle.' },
    { key: 'subject_readiness', label: 'Subject Readiness', description: 'Per-subject syllabus-coverage status: On Track, At Risk, or Critical.' },
    { key: 'mock_examinations', label: 'Mock Examinations', description: 'Real mock scores logged per subject and round, the actual input to risk flagging.' },
    { key: 'risk_indicators', label: 'Risk Indicators', description: 'Five standard readiness risk factors — registration, coverage, mock performance, attendance, fees.' },
    { key: 'performance_forecasts', label: 'Performance Forecasts', description: 'Aggregate readiness-by-subject counts, computed from real mock and coverage data as it accumulates — not a projected score.' },
  ];
}

async function requireStaffSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { staffId: session.staffId };
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const url = new URL(request.url);
  const examBody = url.searchParams.get('examBody') === 'NECO' ? 'NECO' : 'WAEC';

  try {
    const grants = await effectiveGrants(sql, staffId);
    const { granted } = checkGrants(grants, 'exam_readiness', 'V', null);
    if (!granted) return json({ error: 'Your role does not include examination-readiness visibility.' }, 403);
    const viewable = grants.filter((g) => hasPermission(g.roleCode, 'exam_readiness', 'V').granted);
    const unscoped = viewable.some((g) => g.institutionId == null);

    const indicatorsRes = await sql`SELECT code, label, description FROM exam_readiness_risk_indicators ORDER BY sort_order`;
    const framework = {
      status: 'Operational Framework Ready',
      examBody,
      subCapabilities: subCapabilities(examBody),
      riskIndicators: indicatorsRes.rows.map((r) => ({ code: r.code, label: r.label, description: r.description })),
    };

    let candidateRows;
    if (unscoped) {
      const res = await sql`
        SELECT c.*, s.full_name AS student_name, i.name AS institution_name
        FROM exam_candidates c LEFT JOIN students s ON s.id = c.student_id LEFT JOIN institutions i ON i.id = c.institution_id
        WHERE c.exam_body = ${examBody} ORDER BY c.exam_year DESC, c.updated_at DESC`;
      candidateRows = res.rows;
    } else {
      const institutionIds = [...new Set(viewable.map((g) => g.institutionId).filter((x) => x != null))];
      if (!institutionIds.length) candidateRows = [];
      else {
        const res = await sql`
          SELECT c.*, s.full_name AS student_name, i.name AS institution_name
          FROM exam_candidates c LEFT JOIN students s ON s.id = c.student_id LEFT JOIN institutions i ON i.id = c.institution_id
          WHERE c.exam_body = ${examBody} AND c.institution_id = ANY(${institutionIds})
          ORDER BY c.exam_year DESC, c.updated_at DESC`;
        candidateRows = res.rows;
      }
    }

    const candidateIds = candidateRows.map((r) => r.id);
    let subjectsByCandidate = {}, flagsByCandidate = {};
    if (candidateIds.length) {
      const [subjRes, flagRes] = await Promise.all([
        sql`SELECT * FROM exam_subject_readiness WHERE candidate_id = ANY(${candidateIds}) ORDER BY subject`,
        sql`SELECT f.*, ind.label AS indicator_label FROM exam_readiness_flags f
            LEFT JOIN exam_readiness_risk_indicators ind ON ind.id = f.indicator_id
            WHERE f.candidate_id = ANY(${candidateIds}) AND f.resolved_at IS NULL ORDER BY f.flagged_at DESC`,
      ]);
      subjectsByCandidate = subjRes.rows.reduce((acc, r) => { (acc[r.candidate_id] ||= []).push(r); return acc; }, {});
      flagsByCandidate = flagRes.rows.reduce((acc, r) => { (acc[r.candidate_id] ||= []).push(r); return acc; }, {});
    }

    return json({
      ok: true, framework, currentRecords: candidateRows.length,
      candidates: candidateRows.map((r) => ({
        id: r.id, student: r.student_name, institution: r.institution_name, examYear: r.exam_year,
        registrationStatus: r.registration_status,
        subjects: (subjectsByCandidate[r.id] || []).map((s) => ({ subject: s.subject, status: s.readiness_status, notes: s.notes })),
        openFlags: (flagsByCandidate[r.id] || []).map((f) => ({ id: f.id, indicator: f.indicator_label, notes: f.notes, flaggedAt: f.flagged_at })),
      })),
    });
  } catch (err) {
    console.error('staff exam-readiness GET error', err);
    return json({ error: 'Could not load the Examination Readiness Framework right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);

  try {
    if (body.action === 'register-candidate') {
      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'exam_readiness', 'C', body.institutionId || null);
      if (!granted) return json({ error: 'Your role does not have authority to register an examination candidate.' }, 403);
      if (!Number.isInteger(body.studentId) || !['WAEC', 'NECO'].includes(body.examBody) || !Number.isInteger(body.examYear)) {
        return json({ error: 'studentId (number), examBody (WAEC or NECO), and examYear (number) are required.' }, 400);
      }
      const inserted = await sql`
        INSERT INTO exam_candidates (student_id, exam_body, exam_year, institution_id)
        VALUES (${body.studentId}, ${body.examBody}, ${body.examYear}, ${body.institutionId || null})
        ON CONFLICT (student_id, exam_body, exam_year) DO UPDATE SET updated_at = now()
        RETURNING id`;
      return json({ ok: true, candidateId: inserted.rows[0].id });
    }

    if (body.action === 'update-subject-readiness') {
      if (!Number.isInteger(body.candidateId) || typeof body.subject !== 'string' || !body.subject.trim()) {
        return json({ error: 'candidateId (number) and a non-empty subject are required.' }, 400);
      }
      const candRes = await sql`SELECT institution_id FROM exam_candidates WHERE id = ${body.candidateId}`;
      if (!candRes.rows.length) return json({ error: 'No candidate found with that id.' }, 404);
      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'exam_readiness', 'E', candRes.rows[0].institution_id);
      if (!granted) return json({ error: 'Your role does not have authority to update this candidate.' }, 403);
      const status = ['on_track', 'at_risk', 'critical'].includes(body.status) ? body.status : 'on_track';
      await sql`
        INSERT INTO exam_subject_readiness (candidate_id, subject, readiness_status, notes)
        VALUES (${body.candidateId}, ${body.subject.trim()}, ${status}, ${body.notes || null})`;
      return json({ ok: true });
    }

    if (body.action === 'record-mock-result') {
      if (!Number.isInteger(body.candidateId) || typeof body.subject !== 'string' || !body.subject.trim() || typeof body.mockRound !== 'string' || body.score == null) {
        return json({ error: 'candidateId, subject, mockRound, and score are required.' }, 400);
      }
      const candRes = await sql`SELECT institution_id FROM exam_candidates WHERE id = ${body.candidateId}`;
      if (!candRes.rows.length) return json({ error: 'No candidate found with that id.' }, 404);
      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'exam_readiness', 'C', candRes.rows[0].institution_id);
      if (!granted) return json({ error: 'Your role does not have authority to record a mock result.' }, 403);
      await sql`
        INSERT INTO exam_mock_results (candidate_id, subject, mock_round, score, max_score, recorded_by_staff_id)
        VALUES (${body.candidateId}, ${body.subject.trim()}, ${body.mockRound.trim()}, ${body.score}, ${body.maxScore || 100}, ${staffId})`;
      return json({ ok: true });
    }

    if (body.action === 'flag-risk') {
      if (!Number.isInteger(body.candidateId) || !body.indicatorCode) {
        return json({ error: 'candidateId (number) and indicatorCode are required.' }, 400);
      }
      const candRes = await sql`SELECT institution_id FROM exam_candidates WHERE id = ${body.candidateId}`;
      if (!candRes.rows.length) return json({ error: 'No candidate found with that id.' }, 404);
      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'exam_readiness', 'C', candRes.rows[0].institution_id);
      if (!granted) return json({ error: 'Your role does not have authority to flag risk for this candidate.' }, 403);
      const indRes = await sql`SELECT id FROM exam_readiness_risk_indicators WHERE code = ${body.indicatorCode}`;
      if (!indRes.rows.length) return json({ error: 'Unknown risk indicator code.' }, 400);
      await sql`
        INSERT INTO exam_readiness_flags (candidate_id, indicator_id, notes, flagged_by_staff_id)
        VALUES (${body.candidateId}, ${indRes.rows[0].id}, ${body.notes || null}, ${staffId})`;
      return json({ ok: true });
    }

    if (body.action === 'resolve-flag') {
      if (!Number.isInteger(body.flagId)) return json({ error: 'flagId (number) is required.' }, 400);
      const flagRes = await sql`SELECT f.id, c.institution_id FROM exam_readiness_flags f JOIN exam_candidates c ON c.id = f.candidate_id WHERE f.id = ${body.flagId}`;
      if (!flagRes.rows.length) return json({ error: 'No flag found with that id.' }, 404);
      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'exam_readiness', 'E', flagRes.rows[0].institution_id);
      if (!granted) return json({ error: 'Your role does not have authority to resolve this flag.' }, 403);
      await sql`UPDATE exam_readiness_flags SET resolved_at = now() WHERE id = ${body.flagId}`;
      return json({ ok: true });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error('staff exam-readiness POST error', err);
    return json({ error: 'Could not save that action right now — please try again shortly.' }, 500);
  }
}
