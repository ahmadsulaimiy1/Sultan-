// Generic Graduation Approval Workflow endpoint — one endpoint every
// office's dashboard calls (the Graduation Control Centre, the generic
// Office Portal's Workflow Centre tab for academic-affairs/
// examinations/library/digital-services, and the Registrar/Principal/
// VP/Founder role-based views), rather than one bespoke endpoint per
// office. Adding a future office or institution to the chain is a
// STAGE_DEFINITIONS entry in functions/_lib/graduation-workflow.js,
// not a new endpoint — the scalability the Executive Directive asked
// for.
//
// GET  ?recordId=N  — full stage timeline for one graduation record
//                      (the Graduation Status Tracker), gated to staff
//                      who can view or decide at least one stage of it.
// GET  ?all=1        — the full graduating roster with a computed
//                      current-stage summary each — the Graduation
//                      Control Centre's main table. Gated to REG (V on
//                      graduation_records) or PRIN/EXE (V on
//                      graduation_clearances).
// GET  (no params)   — "my queue": every record currently awaiting a
//                      decision this staff member is authorised to
//                      make, across every office/role — the same data
//                      shape whether the viewer is Registry, Finance,
//                      a future Academic Affairs appointee, or the
//                      Founder.
// POST — { graduationRecordId, stageCode, action, note, targetStageCode }
//        action: 'clear' | 'request_correction' | 'return_to_stage' |
//        'escalate_to_founder'. Delegates entirely to
//        functions/_lib/graduation-workflow.js's decideStage() — this
//        file owns session/session-shape only, never the workflow's
//        own rules.
// POST { action: 'bulk_decide', graduationRecordIds: [...], stageCode,
//        bulkAction, note } — Conditional Approval directive item 9.
//        Delegates to bulkDecideStage(), which still runs every record
//        through decideStage() individually so each keeps its own
//        audit entry.
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { hasPermissionFor } from '../../../_lib/permissions.js';
import { requestAuditContext } from '../../../_lib/audit.js';
import {
  STAGE_DEFINITIONS, STAGE_BY_CODE, getClearances, canDecideStage, decideStage, bulkDecideStage,
  financeSignal, disciplinarySignal, librarySignal, ictSignal, recipientsForStage,
} from '../../../_lib/graduation-workflow.js';

async function requireStaffSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { staffId: session.staffId };
}

async function loadRecordSummary(sql, id) {
  const res = await sql`
    SELECT gr.id, gr.student_id, gr.full_name, gr.preferred_certificate_name, gr.graduation_session, gr.status,
           gr.requires_founder_review, s.admission_no, c.institution AS institution_name, ci.id AS institution_id
    FROM graduation_records gr
    JOIN students s ON s.id = gr.student_id
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN institutions ci ON ci.name = c.institution
    WHERE gr.id = ${id}`;
  return res.rows[0] || null;
}

async function staffCanViewRecord(sql, staffId, record) {
  const [chainView, recordsView] = await Promise.all([
    hasPermissionFor(sql, staffId, 'graduation_clearances', 'V', record.institution_id ?? null),
    hasPermissionFor(sql, staffId, 'graduation_records', 'V', record.institution_id ?? null),
  ]);
  if (chainView.granted || recordsView.granted) return true;
  for (const stage of STAGE_DEFINITIONS) {
    if (stage.authType === 'auto') continue;
    if (await canDecideStage(sql, staffId, stage.code, record.institution_id ?? null)) return true;
  }
  return false;
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const url = new URL(request.url);
  const recordId = Number(url.searchParams.get('recordId'));
  const wantsAll = url.searchParams.get('all') === '1';

  try {
    if (wantsAll) {
      const [chainView, recordsView] = await Promise.all([
        hasPermissionFor(sql, staffId, 'graduation_clearances', 'V', null),
        hasPermissionFor(sql, staffId, 'graduation_records', 'V', null),
      ]);
      if (!chainView.granted && !recordsView.granted) {
        return json({ error: 'Your role does not have authority to view the full graduation roster.' }, 403);
      }
      const rosterRes = await sql`
        SELECT gr.id, gr.full_name, gr.preferred_certificate_name, gr.graduation_session, gr.status, gr.requires_founder_review,
               s.admission_no, c.institution AS institution_name
        FROM graduation_records gr
        JOIN students s ON s.id = gr.student_id
        LEFT JOIN classes c ON c.id = s.class_id
        ORDER BY gr.status ASC, gr.full_name ASC`;
      const roster = await Promise.all(rosterRes.rows.map(async (r) => {
        const rows = await getClearances(sql, r.id);
        const current = rows.find((row) => row.status === 'pending' || row.status === 'correction_requested');
        return {
          id: r.id, fullName: r.full_name, preferredCertificateName: r.preferred_certificate_name,
          admissionNo: r.admission_no, institutionName: r.institution_name, graduationSession: r.graduation_session,
          status: r.status, requiresFounderReview: r.requires_founder_review,
          currentStage: current ? { code: current.stage_code, label: STAGE_BY_CODE[current.stage_code]?.label || current.stage_code, status: current.status } : null,
          clearedCount: rows.filter((row) => row.status === 'cleared' || row.status === 'not_applicable').length,
          totalStages: rows.length,
        };
      }));
      return json({ ok: true, roster });
    }

    if (Number.isInteger(recordId) && recordId > 0) {
      const record = await loadRecordSummary(sql, recordId);
      if (!record) return json({ error: 'No graduation record found with that id.' }, 404);
      if (!(await staffCanViewRecord(sql, staffId, record))) {
        return json({ error: 'Your role does not have authority to view this graduation record.' }, 403);
      }
      const rows = await getClearances(sql, recordId);
      const stages = await Promise.all(rows.map(async (r) => {
        const stageDef = STAGE_BY_CODE[r.stage_code];
        const recipients = stageDef && stageDef.authType !== 'auto'
          ? await recipientsForStage(sql, stageDef, record.institution_id ?? null)
          : null;
        return {
          code: r.stage_code, label: stageDef?.label || r.stage_code,
          sequencePosition: r.sequence_position, isBlocking: r.is_blocking, status: r.status,
          decidedByStaffId: r.decided_by_staff_id, decisionNote: r.decision_note, decidedAt: r.decided_at,
          canDecideNow: (r.status === 'pending' || r.status === 'correction_requested') && await canDecideStage(sql, staffId, r.stage_code, record.institution_id ?? null),
          hasAppointee: recipients === null ? true : recipients.length > 0,
        };
      }));
      const [finance, disciplinary, library, ict] = await Promise.all([
        financeSignal(sql, record.student_id),
        disciplinarySignal(sql, record.student_id),
        librarySignal(sql, record.student_id),
        ictSignal(sql, record.student_id),
      ]);
      return json({
        ok: true, record, stages,
        financeSignal: finance, disciplinarySignal: disciplinary, librarySignal: library, ictSignal: ict,
      });
    }

    // "My queue" — the current actionable stage per record, filtered to
    // ones this staff member can actually decide.
    const actionableRes = await sql`
      SELECT DISTINCT ON (gc.graduation_record_id)
        gc.id AS clearance_id, gc.graduation_record_id, gc.stage_code, gc.sequence_position, gc.status,
        gr.full_name, gr.preferred_certificate_name, gr.graduation_session, s.admission_no,
        c.institution AS institution_name, ci.id AS institution_id
      FROM graduation_clearances gc
      JOIN graduation_records gr ON gr.id = gc.graduation_record_id
      JOIN students s ON s.id = gr.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN institutions ci ON ci.name = c.institution
      WHERE gc.status IN ('pending', 'correction_requested')
      ORDER BY gc.graduation_record_id, gc.sequence_position ASC`;

    const mine = [];
    for (const row of actionableRes.rows) {
      if (await canDecideStage(sql, staffId, row.stage_code, row.institution_id ?? null)) {
        mine.push({
          recordId: row.graduation_record_id, fullName: row.full_name, preferredCertificateName: row.preferred_certificate_name,
          admissionNo: row.admission_no, institutionName: row.institution_name, graduationSession: row.graduation_session,
          stageCode: row.stage_code, stageLabel: STAGE_BY_CODE[row.stage_code]?.label || row.stage_code, status: row.status,
        });
      }
    }
    return json({ ok: true, queue: mine });
  } catch (err) {
    console.error('graduation-clearances GET error', err);
    return json({ error: 'Could not load graduation clearances right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  const action = body && body.action;
  const auditContext = requestAuditContext(request);

  if (action === 'bulk_decide') {
    const graduationRecordIds = Array.isArray(body.graduationRecordIds)
      ? body.graduationRecordIds.map(Number).filter(Number.isInteger) : [];
    const stageCode = body.stageCode;
    const bulkAction = body.bulkAction;
    if (!graduationRecordIds.length || !stageCode) {
      return json({ error: 'graduationRecordIds (non-empty) and stageCode are required.' }, 400);
    }
    if (!['clear', 'request_correction', 'return_to_stage'].includes(bulkAction)) {
      return json({ error: 'Unknown bulkAction. Expected one of: clear, request_correction, return_to_stage.' }, 400);
    }
    try {
      const results = await bulkDecideStage(sql, env, {
        graduationRecordIds, stageCode, decidingStaffId: staffId,
        action: bulkAction, note: body.note || null, auditContext,
      });
      return json({ ok: true, results });
    } catch (err) {
      console.error('graduation-clearances bulk POST error', err);
      return json({ error: 'Could not complete that bulk action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
    }
  }

  const graduationRecordId = Number(body && body.graduationRecordId);
  const stageCode = body && body.stageCode;
  if (!Number.isInteger(graduationRecordId) || (!stageCode && action !== 'escalate_to_founder')) {
    return json({ error: 'graduationRecordId and stageCode are required.' }, 400);
  }
  if (!['clear', 'request_correction', 'return_to_stage', 'escalate_to_founder'].includes(action)) {
    return json({ error: 'Unknown action. Expected one of: clear, request_correction, return_to_stage, escalate_to_founder, bulk_decide.' }, 400);
  }

  try {
    const result = await decideStage(sql, env, {
      graduationRecordId, stageCode: stageCode || 'founder', decidingStaffId: staffId,
      action, note: body.note || null, targetStageCode: body.targetStageCode || null, auditContext,
    });
    if (result.error) return json({ error: result.error }, 403);
    return json(result);
  } catch (err) {
    console.error('graduation-clearances POST error', err);
    return json({ error: 'Could not complete that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
