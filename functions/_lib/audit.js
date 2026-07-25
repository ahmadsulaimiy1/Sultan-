// The Audit System's write path. Every sensitive Staff Identity Platform
// action calls logStaffEvent() — role grants/revocations, delegation
// create/revoke, exports, and any other action a permission check gated
// on X (Export) or above. Login/failed-login/lockout events reuse the
// existing auth_audit_log with actor_type = 'staff' (see
// functions/api/portal/staff/login.js) rather than duplicating that
// table — this file is specifically for the events auth_audit_log was
// never meant to carry.
//
// "The institution should know: Who did what? When? Why?" — event_type
// and actor_staff_id answer who/what, created_at (DB default) answers
// when, and `reason` is required wherever an action can meaningfully
// have one (role grants, delegations) so "why" isn't left to guesswork
// after the fact.
export async function logStaffEvent(sql, { actorStaffId, eventType, targetType, targetId, reason, metadata }) {
  if (!sql) return;
  await sql`
    INSERT INTO staff_audit_log (actor_staff_id, event_type, target_type, target_id, reason, metadata)
    VALUES (${actorStaffId ?? null}, ${eventType}, ${targetType ?? null}, ${targetId ?? null}, ${reason ?? null}, ${metadata ? JSON.stringify(metadata) : null})`;
}
