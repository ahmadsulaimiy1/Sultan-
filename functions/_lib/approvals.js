// Generic Approval Workflow (docs/approval-workflow-architecture.md) — a
// real second-party sign-off, not a free-text field an endpoint trusts
// blindly. Several areas in role-permission-matrix.md describe a joint
// authority ("Registrar + Principal jointly", "Qur'an College Officer
// jointly with Principal") that, until this helper existed, every
// endpoint recorded via an optional *StaffNo request field the caller
// themselves supplied — never verified against a real role, a real
// session, or a real second person. This file is the one place that
// actually enforces it: an action that needs joint sign-off creates a
// pending `staff_approvals` row instead of executing immediately; the
// real side effect only runs once a distinct staff member who genuinely
// holds the required approving permission decides on it.
//
// This does not change how single-approver actions work anywhere else —
// only areas an endpoint deliberately opts into by calling
// createApprovalRequest()/decideApproval() instead of writing directly.
import { hasPermissionFor } from './permissions.js';

export async function createApprovalRequest(sql, { areaCode, targetType, payload, requestedByStaffId, approverRoleCode, institutionId }) {
  const created = await sql`
    INSERT INTO staff_approvals (area_code, target_type, payload, requested_by_staff_id, approver_role_code, institution_id)
    VALUES (${areaCode}, ${targetType}, ${JSON.stringify(payload)}, ${requestedByStaffId}, ${approverRoleCode}, ${institutionId ?? null})
    RETURNING id, requested_at`;
  return created.rows[0];
}

// institutionId, when given, also includes school-wide (NULL-scoped)
// requests in the same queue — a Principal reviewing their own
// institution's pending items should also see anything not tied to one
// institution in particular, the same way REG's own grants read today.
export async function listPendingApprovals(sql, { areaCode, institutionId }) {
  const res = institutionId != null
    ? await sql`
        SELECT sa.*, s.full_name AS requested_by_name
        FROM staff_approvals sa
        LEFT JOIN staff s ON s.id = sa.requested_by_staff_id
        WHERE sa.area_code = ${areaCode} AND sa.status = 'pending'
          AND (sa.institution_id = ${institutionId} OR sa.institution_id IS NULL)
        ORDER BY sa.requested_at ASC`
    : await sql`
        SELECT sa.*, s.full_name AS requested_by_name
        FROM staff_approvals sa
        LEFT JOIN staff s ON s.id = sa.requested_by_staff_id
        WHERE sa.area_code = ${areaCode} AND sa.status = 'pending'
        ORDER BY sa.requested_at ASC`;
  return res.rows;
}

// Enforces the two things that made every prior "joint approval" purely
// recordable rather than real:
//   1. Separation of duties — the deciding staff member cannot be the
//      same person who requested the action.
//   2. A real permission check — the decider must actually hold
//      `permissionCode` in `areaCode` right now, via the SAME Permission
//      Engine every other endpoint uses (hasPermissionFor), not a
//      role-name string the requester typed in.
// On approve, `performOnApprove({ payload, approval, decidingStaffId })`
// runs the real side effect (e.g. the actual INSERT INTO certificates)
// and its return value is stored as `result_ref`. On reject, nothing
// executes — the request is simply marked rejected with the decider's
// note.
export async function decideApproval(sql, { approvalId, decidingStaffId, decision, note, areaCode, permissionCode, performOnApprove }) {
  const res = await sql`SELECT * FROM staff_approvals WHERE id = ${approvalId} AND status = 'pending'`;
  const approval = res.rows[0];
  if (!approval) {
    return { error: 'No pending approval found with that id.' };
  }
  if (approval.requested_by_staff_id === decidingStaffId) {
    return { error: 'You cannot approve or reject your own request — a second, distinct staff member must decide.' };
  }
  const grant = await hasPermissionFor(sql, decidingStaffId, areaCode, permissionCode, approval.institution_id ?? null);
  if (!grant.granted) {
    return { error: `Your role does not have authority to decide this request (${areaCode}: ${permissionCode}).` };
  }

  if (decision === 'approve') {
    const resultRef = await performOnApprove({ payload: approval.payload, approval, decidingStaffId });
    await sql`
      UPDATE staff_approvals SET
        status = 'approved', decided_by_staff_id = ${decidingStaffId},
        decision_note = ${note || null}, result_ref = ${resultRef || null}, decided_at = now()
      WHERE id = ${approvalId}`;
    return { ok: true, status: 'approved', resultRef, approval };
  }
  if (decision === 'reject') {
    await sql`
      UPDATE staff_approvals SET
        status = 'rejected', decided_by_staff_id = ${decidingStaffId},
        decision_note = ${note || null}, decided_at = now()
      WHERE id = ${approvalId}`;
    return { ok: true, status: 'rejected', approval };
  }
  return { error: 'decision must be "approve" or "reject".' };
}
