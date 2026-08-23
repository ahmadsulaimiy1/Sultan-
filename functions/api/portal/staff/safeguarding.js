// Safeguarding Intelligence Framework — the flagship "Institutional
// Capability Framework" build (Founder directive, 2026-07-30): real
// schema, real Permission Engine grants (area `safeguarding`, see
// functions/_lib/permission-matrix.js), a real seeded taxonomy
// (categories/risk levels transcribed from the adopted Child
// Protection & Safeguarding Policy, SW-01), and a real audit trail
// (safeguarding_case_log) — kept deliberately separate from the
// generic staff_audit_log per SW-01 §7.3's confidentiality
// requirement. Zero transactional case records exist yet; that is
// reported honestly (currentRecords: 0), never hidden behind a
// generic "not available" message.
//
// GET  — DSL: full framework status + real (possibly empty) case list.
//        EXE: aggregate counts only, no case content (Matrix scope
//        "aggregate only, no individual case content").
//        Anyone else: 403.
// POST — { action: 'report-case', ... } requires Create (C).
//        { action: 'update-case', ... } requires Edit (E).
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { effectiveGrants, checkGrants } from '../../../_lib/permissions.js';
import { hasPermission } from '../../../_lib/permission-matrix.js';
import { generateWithRetryOnConflict } from '../../../_lib/generate-with-retry.js';

const SUB_CAPABILITIES = [
  { key: 'incident_tracking', label: 'Incident Tracking', description: 'Every reported concern is logged the same day, with category, narrative, and reporting staff member on record.' },
  { key: 'risk_classification', label: 'Risk Classification', description: 'A seeded four-tier Low/Medium/High/Critical scale the DSL applies case by case, never a default hierarchy of concern types.' },
  { key: 'escalation_workflow', label: 'Escalation Workflow', description: 'Reported → Under Review → Early Help / External Referral → Resolved → Closed, matching SW-01 §7.4’s real decision structure.' },
  { key: 'parent_notification_workflow', label: 'Parent Notification Workflow', description: 'A recorded parent-notified flag and timestamp on every case, honouring SW-01 §7.5’s "unless it would place the child at greater risk" judgement call.' },
  { key: 'resolution_audit_trail', label: 'Resolution Audit Trail', description: 'A dedicated, confidential case log (safeguarding_case_log) — separate from academic and disciplinary records, exactly as SW-01 §7.3 requires.' },
];

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

function toCase(r) {
  return {
    id: r.id, caseNo: r.case_no, institution: r.institution_name,
    category: { code: r.category_code, label: r.category_label },
    riskLevel: r.risk_level_code ? { code: r.risk_level_code, label: r.risk_level_label } : null,
    status: r.status, decision: r.decision, summary: r.summary,
    externalAgency: r.external_agency, parentNotified: r.parent_notified,
    reportedAt: r.reported_at, resolvedAt: r.resolved_at, closedAt: r.closed_at, updatedAt: r.updated_at,
  };
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  try {
    const grants = await effectiveGrants(sql, staffId);
    const { granted, scope } = checkGrants(grants, 'safeguarding', 'V', null);
    if (!granted) {
      return json({ error: 'Your role does not include safeguarding visibility.' }, 403);
    }
    const aggregateOnly = /aggregate/i.test(scope || '');

    const [categoriesRes, riskLevelsRes] = await Promise.all([
      sql`SELECT code, label, description FROM safeguarding_case_categories ORDER BY sort_order`,
      sql`SELECT code, label, description, severity_rank FROM safeguarding_risk_levels ORDER BY severity_rank`,
    ]);
    const framework = {
      status: 'Operational Framework Ready',
      subCapabilities: SUB_CAPABILITIES,
      categories: categoriesRes.rows.map((r) => ({ code: r.code, label: r.label, description: r.description })),
      riskLevels: riskLevelsRes.rows.map((r) => ({ code: r.code, label: r.label, description: r.description })),
    };

    if (aggregateOnly) {
      const countRes = await sql`SELECT status, COUNT(*)::int AS n FROM safeguarding_cases GROUP BY status`;
      const byStatus = countRes.rows.reduce((acc, r) => { acc[r.status] = r.n; return acc; }, {});
      const total = countRes.rows.reduce((sum, r) => sum + r.n, 0);
      return json({ ok: true, framework, currentRecords: total, byStatus, scope: 'aggregate' });
    }

    const casesRes = await sql`
      SELECT sc.*, i.name AS institution_name,
             cat.code AS category_code, cat.label AS category_label,
             rl.code AS risk_level_code, rl.label AS risk_level_label
      FROM safeguarding_cases sc
      LEFT JOIN institutions i ON i.id = sc.institution_id
      LEFT JOIN safeguarding_case_categories cat ON cat.id = sc.category_id
      LEFT JOIN safeguarding_risk_levels rl ON rl.id = sc.risk_level_id
      ORDER BY sc.reported_at DESC`;
    const ids = casesRes.rows.map((r) => r.id);
    let logByCase = {};
    if (ids.length) {
      const logRes = await sql`
        SELECT l.case_id, l.action, l.notes, l.created_at, s.full_name AS actor_name
        FROM safeguarding_case_log l LEFT JOIN staff s ON s.id = l.actor_staff_id
        WHERE l.case_id = ANY(${ids})
        ORDER BY l.created_at DESC`;
      logByCase = logRes.rows.reduce((acc, r) => {
        (acc[r.case_id] ||= []).push({ action: r.action, notes: r.notes, actorName: r.actor_name, occurredAt: r.created_at });
        return acc;
      }, {});
    }

    return json({
      ok: true, framework, currentRecords: casesRes.rows.length,
      cases: casesRes.rows.map((r) => ({ ...toCase(r), log: logByCase[r.id] || [] })),
    });
  } catch (err) {
    console.error('staff safeguarding GET error', err);
    return json({ error: 'Could not load the Safeguarding Intelligence Framework right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);

  try {
    if (body.action === 'report-case') {
      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'safeguarding', 'C', body.institutionId || null);
      if (!granted) return json({ error: 'Your role does not have authority to report a safeguarding case.' }, 403);
      if (!body.categoryCode || typeof body.summary !== 'string' || !body.summary.trim()) {
        return json({ error: 'categoryCode and a non-empty summary are required.' }, 400);
      }
      const catRes = await sql`SELECT id FROM safeguarding_case_categories WHERE code = ${body.categoryCode}`;
      if (!catRes.rows.length) return json({ error: 'Unknown category code.' }, 400);

      const year = new Date().getFullYear();
      // TD-2: candidate + INSERT retried together on a unique-violation
      // (docs/technical-debt-register.md).
      const caseOutcome = await generateWithRetryOnConflict(
        sql,
        async () => {
          const countRes = await sql`SELECT COUNT(*)::int AS n FROM safeguarding_cases WHERE EXTRACT(YEAR FROM reported_at) = ${year}`;
          return `SHR-SG-${year}-${String((countRes.rows[0].n || 0) + 1).padStart(5, '0')}`;
        },
        (no) => sql`
          INSERT INTO safeguarding_cases (case_no, institution_id, student_id, category_id, summary, reported_by_staff_id)
          VALUES (${no}, ${body.institutionId || null}, ${body.studentId || null}, ${catRes.rows[0].id}, ${body.summary.trim()}, ${staffId})
          RETURNING id`
      );
      const caseNo = caseOutcome.value;
      const inserted = caseOutcome.result;
      const caseId = inserted.rows[0].id;
      await sql`
        INSERT INTO safeguarding_case_log (case_id, action, actor_staff_id, notes)
        VALUES (${caseId}, 'reported', ${staffId}, ${body.summary.trim()})`;

      return json({ ok: true, caseId, caseNo });
    }

    if (body.action === 'update-case') {
      if (!Number.isInteger(body.caseId)) return json({ error: 'caseId (number) is required.' }, 400);
      const caseRes = await sql`SELECT id, institution_id, status FROM safeguarding_cases WHERE id = ${body.caseId}`;
      const targetCase = caseRes.rows[0];
      if (!targetCase) return json({ error: 'No safeguarding case found with that id.' }, 404);

      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'safeguarding', 'E', targetCase.institution_id);
      if (!granted) return json({ error: 'Your role does not have authority to update this case.' }, 403);

      const VALID_STATUSES = ['reported', 'under_review', 'early_help', 'referred_external', 'resolved', 'closed'];
      const VALID_ACTIONS = ['reviewed', 'risk_assessed', 'early_help_started', 'referred_external', 'parent_notified', 'resolved', 'closed', 'reopened'];
      if (!VALID_ACTIONS.includes(body.logAction)) {
        return json({ error: `logAction must be one of: ${VALID_ACTIONS.join(', ')}` }, 400);
      }

      let riskLevelId = null;
      if (body.riskLevelCode) {
        const rlRes = await sql`SELECT id FROM safeguarding_risk_levels WHERE code = ${body.riskLevelCode}`;
        if (!rlRes.rows.length) return json({ error: 'Unknown risk level code.' }, 400);
        riskLevelId = rlRes.rows[0].id;
      }
      const nextStatus = VALID_STATUSES.includes(body.status) ? body.status : targetCase.status;

      await sql`
        UPDATE safeguarding_cases SET
          status = ${nextStatus},
          risk_level_id = COALESCE(${riskLevelId}, risk_level_id),
          decision = COALESCE(${body.decision || null}, decision),
          external_agency = COALESCE(${body.externalAgency || null}, external_agency),
          parent_notified = COALESCE(${body.parentNotified ?? null}, parent_notified),
          resolved_at = CASE WHEN ${nextStatus} = 'resolved' THEN now() ELSE resolved_at END,
          closed_at = CASE WHEN ${nextStatus} = 'closed' THEN now() ELSE closed_at END,
          updated_at = now()
        WHERE id = ${body.caseId}`;

      await sql`
        INSERT INTO safeguarding_case_log (case_id, action, actor_staff_id, notes)
        VALUES (${body.caseId}, ${body.logAction}, ${staffId}, ${body.notes || null})`;

      return json({ ok: true, caseId: body.caseId, status: nextStatus });
    }

    return json({ error: 'Unknown action. Expected: report-case or update-case.' }, 400);
  } catch (err) {
    console.error('staff safeguarding POST error', err);
    return json({ error: 'Could not save that safeguarding action right now — please try again shortly.' }, 500);
  }
}
