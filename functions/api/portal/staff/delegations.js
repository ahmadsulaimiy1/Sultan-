// The Delegation System's self-service write path — session-authenticated
// (the caller's own staff session), not bearer-token-gated, because this
// is exactly the kind of action that should be attributable to a real,
// logged-in person rather than "whoever holds a shared token": the
// Registrar going on 14 days' leave signs in as herself and delegates
// her REG role to a named colleague for a bounded window, with a reason
// — that's the whole point of an auditable "who did what, when, why."
// Reading a staff member's current delegations (held and given) is
// already covered by GET /api/portal/staff/me — this file is write-only.
//
// A staff member can only delegate a role THEY currently, actively
// hold — least privilege applies to delegation itself, not just to
// direct role grants; nobody can hand away authority they don't have.
// ends_at is required (the Delegation System "must expire
// automatically" per the directive) and expiry is computed at query
// time in functions/_lib/permissions.js, not by a scheduled job — this
// project has no cron/background-worker infrastructure. revoke makes
// it reversible before its natural expiry.
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { logStaffEvent } from '../../../_lib/audit.js';

const MAX_DELEGATION_DAYS = 90;

export async function onRequestPost({ request, env }) {
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

  const body = await readJsonBody(request);
  const action = body && body.action;

  try {
    if (action === 'create') {
      const { delegateStaffNo, roleCode, institutionName, officeName, reason, endsAt } = body || {};
      if (!delegateStaffNo || !roleCode || !reason || !endsAt) {
        return json({ error: 'delegateStaffNo, roleCode, reason, and endsAt are all required — a delegation must state who, what, why, and until when.' }, 400);
      }
      const ends = new Date(endsAt);
      if (Number.isNaN(ends.getTime()) || ends.getTime() <= Date.now()) {
        return json({ error: 'endsAt must be a valid future date/time.' }, 400);
      }
      const maxEnd = Date.now() + MAX_DELEGATION_DAYS * 86400000;
      if (ends.getTime() > maxEnd) {
        return json({ error: `A delegation cannot run longer than ${MAX_DELEGATION_DAYS} days — create a new one to extend coverage instead of one open-ended grant.` }, 400);
      }

      const delegateRes = await sql`SELECT id, status FROM staff WHERE staff_no = ${delegateStaffNo}`;
      const delegate = delegateRes.rows[0];
      if (!delegate) {
        return json({ error: 'No staff member found with that Staff ID.' }, 404);
      }
      if (delegate.status !== 'active') {
        return json({ error: 'That staff member is not active and cannot receive a delegation.' }, 400);
      }
      if (delegate.id === session.staffId) {
        return json({ error: 'You cannot delegate a role to yourself.' }, 400);
      }

      // You can only delegate a role you currently, actively hold —
      // and, if this delegation names an institution, your own grant
      // must cover that institution (or be school-wide).
      const heldRes = await sql`
        SELECT institution_id FROM staff_roles
        WHERE staff_id = ${session.staffId} AND role_code = ${roleCode} AND is_active = true AND revoked_at IS NULL`;
      let institutionId = null;
      if (institutionName) {
        const instRes = await sql`SELECT id FROM institutions WHERE name = ${institutionName}`;
        institutionId = instRes.rows[0] ? instRes.rows[0].id : null;
        if (!institutionId) {
          return json({ error: 'Unknown institutionName.' }, 400);
        }
      }
      const ownsGrant = heldRes.rows.some((r) => r.institution_id === null || r.institution_id === institutionId);
      if (!ownsGrant) {
        return json({ error: 'You do not currently hold that role (scoped to that institution, if given) — a delegation can only pass on authority you actually have.' }, 403);
      }

      let officeId = null;
      if (officeName) {
        const officeRes = await sql`SELECT id FROM offices WHERE name = ${officeName}`;
        officeId = officeRes.rows[0] ? officeRes.rows[0].id : null;
      }

      const created = await sql`
        INSERT INTO delegations (delegator_staff_id, delegate_staff_id, role_code, institution_id, office_id, reason, ends_at, created_by)
        VALUES (${session.staffId}, ${delegate.id}, ${roleCode}, ${institutionId}, ${officeId}, ${reason}, ${ends.toISOString()}, ${session.staffId})
        RETURNING id, starts_at, ends_at`;

      await logStaffEvent(sql, {
        actorStaffId: session.staffId, eventType: 'delegation_created', targetType: 'delegation', targetId: created.rows[0].id,
        reason, metadata: { delegateStaffNo, roleCode, institutionName: institutionName || null, endsAt: created.rows[0].ends_at },
      });

      return json({ ok: true, delegationId: created.rows[0].id, startsAt: created.rows[0].starts_at, endsAt: created.rows[0].ends_at });
    }

    if (action === 'revoke') {
      if (!Number.isInteger(body.delegationId)) {
        return json({ error: 'A valid numeric delegationId is required.' }, 400);
      }
      const updated = await sql`
        UPDATE delegations SET revoked_at = now(), revoked_by = ${session.staffId}
        WHERE id = ${body.delegationId} AND delegator_staff_id = ${session.staffId} AND revoked_at IS NULL
        RETURNING id, role_code, delegate_staff_id`;
      if (!updated.rows.length) {
        return json({ error: 'No revocable delegation found with that id — only the person who created a delegation can revoke it.' }, 404);
      }
      await logStaffEvent(sql, {
        actorStaffId: session.staffId, eventType: 'delegation_revoked', targetType: 'delegation', targetId: body.delegationId,
        reason: body.reason || null, metadata: { roleCode: updated.rows[0].role_code },
      });
      return json({ ok: true, delegationId: body.delegationId });
    }

    return json({ error: 'Unknown action. Expected one of: create, revoke.' }, 400);
  } catch (err) {
    console.error('staff delegations error', err);
    return json({ error: 'Could not process that delegation: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
