// The Staff Desk — the read side of four tables that, until now, only
// had a write side.
//
// An audit of this codebase found four places where the school collects
// something and nobody can see it:
//
//   staff_notifications   written by the graduation-approval workflow,
//                         teacher performance, and now the assistant's
//                         escalations — read by nothing.
//   assistant_escalations  a family asking for a person — read by nothing.
//   privacy_requests       a data-protection request from a real person,
//                         with a legal duty to respond — read by nothing.
//   auth_audit_log         12 write sites recording logins, failures and
//                         lockouts — read by nothing, so a break-in
//                         attempt was recorded and unseen.
//
// A record nobody reads is not a record, it is a reassurance. This
// endpoint is the smallest honest fix: one read, four sections, each
// gated by the permission area that genuinely owns it rather than a new
// one invented for the purpose.
//
//   notifications  — the caller's own. No extra permission: they were
//                    addressed to this person by name.
//   escalations    — `communications` V. Inbound messages from families.
//   privacyRequests— `system_settings` V. The ICT Office's own seed
//                    description names it as owning system accounts and
//                    access logs; data-subject requests sit with it
//                    until a Legal & Compliance appointment exists.
//   authAudit      — `system_settings` V, same reasoning.
//
// Sections the caller may not see are returned as { visible: false }
// with the reason, rather than silently omitted — a staff member should
// be able to tell "there is nothing here" from "this is not yours".
//
// GET  — the desk.
// POST — { action: 'read-notification', id } marks one of the caller's
//        own notifications read; { action: 'close-escalation', id }
//        marks an escalation handled, recording who and when.
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { effectiveGrants, checkGrants } from '../../../_lib/permissions.js';
import { ESCALATION_TOPICS } from '../../../_lib/escalation.js';

const LIMIT = 50;

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

const hidden = (reason) => ({ visible: false, reason, items: [] });

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  try {
    const grants = await effectiveGrants(sql, staffId);
    const canSeeEscalations = checkGrants(grants, 'communications', 'V', null).granted;
    const canSeeSystem = checkGrants(grants, 'system_settings', 'V', null).granted;

    const notificationsQuery = sql`
      SELECT id, category, title, message, action_url, created_at, read_at
      FROM staff_notifications
      WHERE staff_id = ${staffId}
      ORDER BY read_at IS NOT NULL, created_at DESC
      LIMIT ${LIMIT}`;

    const escalationsQuery = canSeeEscalations
      ? sql`
        SELECT e.id, e.channel, e.topic, e.summary, e.contact, e.lang, e.status,
               e.created_at, e.handled_at, s.full_name AS handled_by_name
        FROM assistant_escalations e
        LEFT JOIN staff s ON s.id = e.handled_by
        ORDER BY e.status = 'closed', e.created_at DESC
        LIMIT ${LIMIT}`
      : null;

    const privacyQuery = canSeeSystem
      ? sql`SELECT id, full_name, email, request_type, details, created_at
            FROM privacy_requests ORDER BY created_at DESC LIMIT ${LIMIT}`
      : null;

    // Failed logins and lockouts first — a successful login is routine,
    // a run of failures is the thing worth a person's attention.
    const authQuery = canSeeSystem
      ? sql`SELECT actor_type, identifier, event, created_at
            FROM auth_audit_log
            WHERE event <> 'login_success'
            ORDER BY created_at DESC LIMIT ${LIMIT}`
      : null;

    const [notifications, escalations, privacy, auth] = await Promise.all([
      notificationsQuery,
      escalationsQuery, privacyQuery, authQuery,
    ]);

    return json({
      notifications: {
        visible: true,
        unread: notifications.rows.filter((r) => !r.read_at).length,
        items: notifications.rows.map((r) => ({
          id: r.id, category: r.category, title: r.title, message: r.message,
          actionUrl: r.action_url, createdAt: r.created_at, readAt: r.read_at,
        })),
      },
      escalations: canSeeEscalations ? {
        visible: true,
        open: escalations.rows.filter((r) => r.status === 'open').length,
        items: escalations.rows.map((r) => ({
          id: r.id,
          channel: r.channel,
          topic: r.topic,
          topicLabel: (ESCALATION_TOPICS[r.topic] || {}).label || r.topic,
          summary: r.summary,
          contact: r.contact,
          lang: r.lang,
          status: r.status,
          createdAt: r.created_at,
          handledAt: r.handled_at,
          handledByName: r.handled_by_name,
        })),
      } : hidden('Your role does not include Communications visibility, so requests from families are not shown here.'),
      privacyRequests: canSeeSystem ? {
        visible: true,
        items: privacy.rows.map((r) => ({
          id: r.id, fullName: r.full_name, email: r.email,
          requestType: r.request_type, details: r.details, createdAt: r.created_at,
        })),
      } : hidden('Data-protection requests are visible to System Settings roles only.'),
      authAudit: canSeeSystem ? {
        visible: true,
        items: auth.rows.map((r) => ({
          actorType: r.actor_type, identifier: r.identifier,
          event: r.event, createdAt: r.created_at,
        })),
      } : hidden('Access logs are visible to System Settings roles only.'),
    });
  } catch (err) {
    console.error('staff desk error', err);
    return json({ error: 'Could not load the desk.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  const id = Number(body && body.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'A valid id is required.' }, 400);

  try {
    if (body.action === 'read-notification') {
      // Scoped to the caller's own row — a staff member cannot mark
      // somebody else's notification read.
      const res = await sql`
        UPDATE staff_notifications SET read_at = now()
        WHERE id = ${id} AND staff_id = ${staffId} AND read_at IS NULL
        RETURNING id`;
      return json({ ok: true, changed: res.rows.length });
    }

    if (body.action === 'close-escalation') {
      const grants = await effectiveGrants(sql, staffId);
      if (!checkGrants(grants, 'communications', 'V', null).granted) {
        return json({ error: 'Your role does not include Communications visibility.' }, 403);
      }
      const status = body.status === 'acknowledged' ? 'acknowledged' : 'closed';
      const res = await sql`
        UPDATE assistant_escalations
        SET status = ${status}, handled_by = ${staffId}, handled_at = now()
        WHERE id = ${id} AND status <> 'closed'
        RETURNING id, status`;
      return json({ ok: true, changed: res.rows.length, status });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error('staff desk action error', err);
    return json({ error: 'Could not complete that action.' }, 500);
  }
}
