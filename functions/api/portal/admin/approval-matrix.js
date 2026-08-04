// Graduation Approval Matrix — admin-configurable rules governing which
// graduation-workflow stages are institutionally required, replacing
// the Stage 2 award-based Founder trigger the client correctly flagged
// as an unsourced interpretation (Conditional Approval directive item
// 2: "the trigger must never be hardcoded... administrators should be
// able to modify the Approval Matrix without changing code").
//
// Gated to System Administrator or the Founder & CEO — the two
// authorities who can genuinely stand behind a rule that says "the
// Founder must review every graduate, because of [Constitution /
// Governance Charter / Board Resolution / Executive Directive]": a
// technical administrator maintaining the system, or the Founder
// themself. Neither `manual_escalation` rows nor per-student
// escalation are managed here — see functions/_lib/
// graduation-workflow.js's decideStage() 'escalate_to_founder' action
// for that one-off, per-record path.
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { effectiveGrants } from '../../../_lib/permissions.js';
import { logStaffEvent, requestAuditContext } from '../../../_lib/audit.js';
import { STAGE_BY_CODE } from '../../../_lib/graduation-workflow.js';

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

// Deliberately checks for the literal SYSADMIN/EXE role codes rather
// than an area+permission grant — system_settings:E is ALSO held by
// ICT ("operational settings only" per the Matrix), which must not
// carry authority over a constitutional-level rule set like this one.
// Only the System Administrator and the Founder & CEO may touch it.
async function requireMatrixAuthority(sql, staffId) {
  const grants = await effectiveGrants(sql, staffId);
  return grants.some((g) => g.roleCode === 'SYSADMIN' || g.roleCode === 'EXE');
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  if (!(await requireMatrixAuthority(sql, staffId))) {
    return json({ error: 'Your role does not have authority to view the Graduation Approval Matrix.' }, 403);
  }

  try {
    const res = await sql`
      SELECT gar.*, s.full_name AS created_by_name FROM graduation_approval_rules gar
      LEFT JOIN staff s ON s.id = gar.created_by_staff_id
      ORDER BY gar.is_active DESC, gar.created_at DESC`;
    return json({
      ok: true,
      stages: Object.values(STAGE_BY_CODE).map((s) => ({ code: s.code, label: s.label })),
      rules: res.rows.map((r) => ({
        id: r.id, targetStageCode: r.target_stage_code, triggerType: r.trigger_type, referenceText: r.reference_text,
        appliesGlobally: r.applies_globally, isActive: r.is_active, createdByName: r.created_by_name, createdAt: r.created_at,
        deactivatedAt: r.deactivated_at,
      })),
    });
  } catch (err) {
    console.error('approval-matrix GET error', err);
    return json({ error: 'Could not load the Approval Matrix right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  if (!(await requireMatrixAuthority(sql, staffId))) {
    return json({ error: 'Your role does not have authority to modify the Graduation Approval Matrix.' }, 403);
  }

  const body = await readJsonBody(request);
  const action = body && body.action;
  const auditCtx = requestAuditContext(request);

  try {
    if (action === 'create_rule') {
      const targetStageCode = (body.targetStageCode || '').trim();
      const triggerType = (body.triggerType || '').trim();
      if (!STAGE_BY_CODE[targetStageCode]) return json({ error: 'Unknown targetStageCode.' }, 400);
      if (!['constitution', 'governance_charter', 'board_resolution', 'executive_directive'].includes(triggerType)) {
        return json({ error: "triggerType must be one of: constitution, governance_charter, board_resolution, executive_directive. Manual escalation is recorded per-student, not here." }, 400);
      }
      const inserted = await sql`
        INSERT INTO graduation_approval_rules (target_stage_code, trigger_type, reference_text, applies_globally, created_by_staff_id)
        VALUES (${targetStageCode}, ${triggerType}, ${body.referenceText || null}, true, ${staffId})
        RETURNING id`;
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'graduation_approval_rule', targetId: inserted.rows[0].id,
        reason: body.referenceText || null, metadata: { action: 'create_rule', targetStageCode, triggerType },
        ipAddress: auditCtx.ipAddress, userAgent: auditCtx.userAgent, newValue: { targetStageCode, triggerType, isActive: true },
      });
      return json({ ok: true, ruleId: inserted.rows[0].id });
    }

    if (action === 'deactivate_rule') {
      const ruleId = Number(body.ruleId);
      if (!Number.isInteger(ruleId)) return json({ error: 'A valid numeric ruleId is required.' }, 400);
      const updated = await sql`
        UPDATE graduation_approval_rules SET is_active = false, deactivated_by_staff_id = ${staffId}, deactivated_at = now()
        WHERE id = ${ruleId} AND is_active = true
        RETURNING id`;
      if (!updated.rows.length) return json({ error: 'No active rule found with that id.' }, 404);
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'graduation_approval_rule', targetId: ruleId,
        reason: body.reason || null, metadata: { action: 'deactivate_rule' },
        ipAddress: auditCtx.ipAddress, userAgent: auditCtx.userAgent,
        previousValue: { isActive: true }, newValue: { isActive: false },
      });
      return json({ ok: true, ruleId });
    }

    return json({ error: 'Unknown action. Expected one of: create_rule, deactivate_rule.' }, 400);
  } catch (err) {
    console.error('approval-matrix POST error', err);
    return json({ error: 'Could not complete that action: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
