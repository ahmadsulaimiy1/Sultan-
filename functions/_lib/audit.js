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
//
// ipAddress/userAgent/previousValue/newValue (all optional, all default
// null) were added for the Graduation Approval Workflow's audit-trail
// hardening directive — "IP address, device/browser, previous value,
// new value" — so an approval decision's full context, not just its
// outcome, is reconstructable. Every existing caller that doesn't pass
// them keeps working unchanged; only callers that genuinely have this
// context (a request object, a before/after state) need to supply it.
// delegationId (optional, default null): the specific `delegations.id` row
// that authorised actorStaffId to take this action, when their authority
// came from a delegation rather than their own staff_roles. StromeX
// delegation-of-authority requirement, 2026-08-22: a delegated action must
// be provably distinguishable from the delegate acting on personal
// authority, and the actor field alone can never carry that distinction —
// so callers that resolved a grant via effectiveGrants()/hasPermissionFor()
// pass its `via.delegationId` straight through rather than dropping it.
//
// actorServiceIdentityId (optional, default null): set instead of
// actorStaffId when the action was taken by the StromeX Autonomous
// Engineering Service Identity (AESI — Governance Resolution Register
// 9.2/9.10), never alongside it — a row attributed to a machine identity
// must never read as, or be confusable with, a human staff member acting
// on personal authority. Callers that authenticated a request via
// service-identity.js's readServiceIdentityFromRequest() pass its
// serviceIdentityId here and leave actorStaffId unset.
export async function logStaffEvent(sql, {
  actorStaffId, actorServiceIdentityId, eventType, targetType, targetId, reason, metadata,
  ipAddress, userAgent, previousValue, newValue, delegationId,
}) {
  if (!sql) return;
  await sql`
    INSERT INTO staff_audit_log (actor_staff_id, actor_service_identity_id, event_type, target_type, target_id, reason, metadata, ip_address, user_agent, previous_value, new_value, delegation_id)
    VALUES (
      ${actorStaffId ?? null}, ${actorServiceIdentityId ?? null}, ${eventType}, ${targetType ?? null}, ${targetId ?? null}, ${reason ?? null}, ${metadata ? JSON.stringify(metadata) : null},
      ${ipAddress ?? null}, ${userAgent ?? null}, ${previousValue ? JSON.stringify(previousValue) : null}, ${newValue ? JSON.stringify(newValue) : null},
      ${delegationId ?? null}
    )`;
}

// Extracts the two audit-hardening fields a Cloudflare Pages Function
// can genuinely read from a Request — CF-Connecting-IP (set by
// Cloudflare's edge, not spoofable by the client the way X-Forwarded-For
// can be) and the User-Agent header. Returns nulls, never throws, if a
// header is absent (e.g. this environment's local dev server).
export function requestAuditContext(request) {
  if (!request || !request.headers) return { ipAddress: null, userAgent: null };
  return {
    ipAddress: request.headers.get('cf-connecting-ip') || null,
    userAgent: request.headers.get('user-agent') || null,
  };
}
