// Runtime Permission Engine. Resolves a staff member's EFFECTIVE role
// grants (their own staff_roles, plus any active, non-expired
// delegation naming them as the delegate) and checks them against the
// static Matrix in permission-matrix.js. This is the ONLY place in the
// codebase that should ever answer "can this staff member do X" — every
// staff-facing endpoint calls requirePermission() below, never its own
// role-name comparison.
//
// Least privilege is the default at every layer: a staff member with no
// staff_roles rows has zero effective grants and every requirePermission()
// call fails closed (403), not open.
import { hasPermission } from './permission-matrix.js';
import { effectiveGrantsForServiceIdentity } from './service-identity.js';

// Active role assignments, scoped by institution/office exactly as
// staff_roles recorded them.
async function activeRoleGrants(sql, staffId) {
  const res = await sql`
    SELECT role_code, institution_id, office_id
    FROM staff_roles
    WHERE staff_id = ${staffId} AND is_active = true AND revoked_at IS NULL`;
  return res.rows.map((r) => ({ roleCode: r.role_code, institutionId: r.institution_id, officeId: r.office_id, source: 'role' }));
}

// Active, non-expired, non-revoked delegations where this staff member
// is the DELEGATE. Expiry is computed here at query time — see
// docs/staff-identity-architecture.md for why (no cron/background-worker
// infrastructure exists in this project to flip a status flag on a
// schedule; a computed check can't silently fall out of date).
async function activeDelegationGrants(sql, staffId) {
  const res = await sql`
    SELECT id, role_code, institution_id, office_id, delegator_staff_id
    FROM delegations
    WHERE delegate_staff_id = ${staffId}
      AND revoked_at IS NULL
      AND now() BETWEEN starts_at AND ends_at`;
  // delegationId/delegatorStaffId ride alongside role/scope so a caller
  // that persists what authorised an action (e.g. stage_certificate_batches'
  // delegation_id column) can record the SPECIFIC grant, not just that some
  // delegation existed — two active delegations to the same staff member
  // must never collapse into one indistinguishable "via delegation" note.
  return res.rows.map((r) => ({
    roleCode: r.role_code, institutionId: r.institution_id, officeId: r.office_id,
    source: 'delegation', delegationId: r.id, delegatorStaffId: r.delegator_staff_id,
  }));
}

// Every role a staff member effectively holds right now, from either
// source, with the source labelled — callers/audit entries can then say
// exactly which grant authorised an action, including "via a delegation
// from X, expiring Y."
export async function effectiveGrants(sql, staffId) {
  const [roles, delegations] = await Promise.all([
    activeRoleGrants(sql, staffId),
    activeDelegationGrants(sql, staffId),
  ]);
  return [...roles, ...delegations];
}

// Checks whether ANY of a staff member's effective grants authorise
// `permissionCode` in `areaCode`. If the Matrix cell that grants it
// names an institution-level scope ("own institution", "Qur'an College
// only", etc.) and the grant itself carries an institutionId, the
// caller's `institutionId` argument must match — this is the one layer
// of scope the engine can resolve generically. Anything finer ("own
// assigned classes", "own subject") is returned in `scope` for the
// endpoint to enforce itself, exactly as every admin endpoint in this
// codebase already does (e.g. admin/hifz-progress.js validating the
// target student's institution before writing).
export function checkGrants(grants, areaCode, permissionCode, institutionId) {
  for (const grant of grants) {
    const { granted, scope } = hasPermission(grant.roleCode, areaCode, permissionCode);
    if (!granted) continue;
    const institutionScoped = grant.institutionId != null && scope && /own institution|institution-wide|only$/i.test(scope) && !/aggregate/i.test(scope);
    if (institutionScoped && institutionId != null && grant.institutionId !== institutionId) continue;
    return { granted: true, scope, via: grant };
  }
  return { granted: false, scope: null, via: null };
}

// Convenience wrapper for the common case: load the staff member's
// grants and check in one call.
export async function hasPermissionFor(sql, staffId, areaCode, permissionCode, institutionId) {
  const grants = await effectiveGrants(sql, staffId);
  return checkGrants(grants, areaCode, permissionCode, institutionId);
}

// ── StromeX Autonomous Engineering Service Identity (AESI) ─────────────
// Governance Resolution Register 9.2/9.10. A service identity's grants
// come from service_identity_grants (functions/_lib/service-identity.js),
// never from staff_roles or delegations — deliberately a THIRD, separate
// resolution path rather than a role a service identity could be
// "granted" through the human system, which is exactly the conflation
// 9.3 already rules against.
//
// SERVICE_IDENTITY_DENYLIST is enforced HERE, in code, ahead of any
// database lookup — never only by what service_identity_grants happens
// to contain. The Founder's ruling (Governance Resolution Register 9.2)
// draws one line: certificate issuance, finance writes, safeguarding
// writes, and any delete are a human act, full stop, regardless of what
// a machine identity is nominally granted. A seeding mistake in the
// grants table — a wrong row, a copy-paste, a future migration bug —
// must be unable to cross this line; only a code change can move it,
// and a code change is reviewed the way every other change here is.
const SERVICE_IDENTITY_DENYLIST = new Set([
  'certificates:C', 'certificates:E',
  'finance:C', 'finance:E',
  'safeguarding:C', 'safeguarding:E',
]);
function serviceIdentityDenied(areaCode, permissionCode) {
  if (permissionCode === 'D') return true; // delete, in any area, always
  return SERVICE_IDENTITY_DENYLIST.has(`${areaCode}:${permissionCode}`);
}

export async function hasPermissionForServiceIdentity(sql, serviceIdentityId, areaCode, permissionCode, institutionId) {
  if (serviceIdentityDenied(areaCode, permissionCode)) {
    return { granted: false, scope: null, via: null, denyReason: 'reserved for a human act — Governance Resolution Register 9.2' };
  }
  const grants = await effectiveGrantsForServiceIdentity(sql, serviceIdentityId);
  for (const grant of grants) {
    if (grant.areaCode !== areaCode || grant.permissionCode !== permissionCode) continue;
    if (grant.institutionId != null && institutionId != null && grant.institutionId !== institutionId) continue;
    return { granted: true, scope: 'service_identity_grant', via: { source: 'service_identity', serviceIdentityId } };
  }
  return { granted: false, scope: null, via: null };
}
