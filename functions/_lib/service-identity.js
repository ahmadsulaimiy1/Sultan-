// StromeX Autonomous Engineering Service Identity (AESI) — Governance
// Resolution Register 9.2/9.10. A dedicated, non-human institutional
// actor: its own row (service_identities), its own permission grants
// (service_identity_grants), its own immutable audit attribution
// (staff_audit_log.actor_service_identity_id) — never a staff_roles
// grant, never indistinguishable from a human acting on personal
// authority. That is the exact failure mode 9.1/9.3 already named and
// ruled against for a HUMAN delegate; a machine identity gets no
// exception.
//
// Authenticates over a bearer API key: a high-entropy token, shown once
// at creation, stored here only as a SHA-256 hash — the same "the
// plaintext is never stored" property staff_accounts.reset_token and
// otp.js's codes already have. A lost token cannot be recovered, only
// revoked and reissued.
//
// HARD CODE-LEVEL DENYLIST. certificates:C, finance:C/E, safeguarding:C/E,
// and every 'D' (delete) permission are refused for a service identity
// regardless of what service_identity_grants contains — enforced in
// hasPermissionForServiceIdentity() in permissions.js, not here, so a
// seeding mistake in this table can never accidentally hand a machine
// identity the authority the Founder's ruling reserves for an explicit
// human act (issuing an official certificate, deleting a record,
// touching a child's safeguarding case, moving money).
import crypto from 'node:crypto';

export function generateServiceIdentityToken() {
  return `aesi_${crypto.randomBytes(24).toString('base64url')}`;
}

export function hashServiceIdentityToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

// Creates a new service identity and returns the ONE-TIME plaintext
// token alongside its id. Nothing after this call can recover the
// plaintext — only the hash is persisted.
export async function createServiceIdentity(sql, { name, description, createdByStaffId }) {
  const token = generateServiceIdentityToken();
  const hash = hashServiceIdentityToken(token);
  const res = await sql`
    INSERT INTO service_identities (name, description, api_key_hash, created_by)
    VALUES (${name}, ${description || null}, ${hash}, ${createdByStaffId})
    RETURNING id`;
  return { id: res.rows[0].id, token };
}

export async function revokeServiceIdentity(sql, { serviceIdentityId, revokedByStaffId, note }) {
  await sql`
    UPDATE service_identities SET revoked_at = now(), revoked_by = ${revokedByStaffId}, revocation_note = ${note || null}
    WHERE id = ${serviceIdentityId} AND revoked_at IS NULL`;
}

// Reads the Authorization: Bearer header and resolves it to a live,
// non-revoked service identity — or null. Never throws on a malformed/
// absent header; an endpoint that wants to also accept a human staff
// session tries that path separately.
export async function readServiceIdentityFromRequest(request, sql) {
  const auth = request.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(aesi_\S+)$/);
  if (!m) return null;
  const hash = hashServiceIdentityToken(m[1]);
  const res = await sql`
    SELECT id, name FROM service_identities
    WHERE api_key_hash = ${hash} AND revoked_at IS NULL`;
  if (!res.rows[0]) return null;
  return { serviceIdentityId: res.rows[0].id, name: res.rows[0].name };
}

export async function grantServiceIdentityPermission(sql, {
  serviceIdentityId, areaCode, permissionCode, institutionId, grantedByStaffId,
}) {
  await sql`
    INSERT INTO service_identity_grants (service_identity_id, area_code, permission_code, institution_id, granted_by)
    VALUES (${serviceIdentityId}, ${areaCode}, ${permissionCode}, ${institutionId || null}, ${grantedByStaffId})
    ON CONFLICT (service_identity_id, area_code, permission_code, institution_id)
      DO UPDATE SET revoked_at = NULL, revoked_by = NULL, granted_at = now(), granted_by = ${grantedByStaffId}`;
}

export async function revokeServiceIdentityPermission(sql, {
  serviceIdentityId, areaCode, permissionCode, institutionId, revokedByStaffId,
}) {
  await sql`
    UPDATE service_identity_grants SET revoked_at = now(), revoked_by = ${revokedByStaffId}
    WHERE service_identity_id = ${serviceIdentityId} AND area_code = ${areaCode} AND permission_code = ${permissionCode}
      AND institution_id IS NOT DISTINCT FROM ${institutionId || null} AND revoked_at IS NULL`;
}

export async function effectiveGrantsForServiceIdentity(sql, serviceIdentityId) {
  const res = await sql`
    SELECT area_code, permission_code, institution_id FROM service_identity_grants
    WHERE service_identity_id = ${serviceIdentityId} AND revoked_at IS NULL`;
  return res.rows.map((r) => ({ areaCode: r.area_code, permissionCode: r.permission_code, institutionId: r.institution_id }));
}
