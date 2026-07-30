// Migration Phase D item #4b (docs/identity-migration-plan.md,
// docs/identity-migration-register.md): announcements admin moved off
// its bearer token onto the Staff Identity Platform, mirroring the
// Founder Dashboard and Hifz/Ijazah administration dual-auth pattern —
// staff session + Permission Engine is now the PRIMARY path;
// PORTAL_ADMIN_TOKEN remains a FALLBACK ONLY, same reason as those two:
// REG/PRIN/EXE are established roles in principle, but no real staff
// account holding one is confirmed to exist in any reachable environment
// yet (identity-migration-plan.md's status notes). Removing the token
// now would lock this endpoint out entirely.
//
// The Matrix's `communications` area (permission-matrix.js) only ever
// named C (create) and P (publish) until this migration — real, but
// incomplete against the 7 actions this endpoint has always had. E
// (edit) and Ar (archive) were added to REG/PRIN/EXE's rows as part of
// this change, reasoned through in docs/role-permission-matrix.md §4.15:
// a role already trusted to author and publish communications is
// trusted to edit its own draft first and archive it once it's done —
// the same lifecycle, not a new authority. `feature`/`unfeature` has no
// dedicated permission code at all (an app-specific "homepage hero"
// state, not one of V/C/E/D/A/P/X/Vf/Ar/MU) — it reuses P, on the same
// reasoning: whoever can decide what the public sees can decide which
// published item is most prominent. See §4.15 for the full write-up,
// including the one scope gap this migration does NOT solve: PRIN's
// "own institution" grant can't be checked at the row level, because
// `announcements` has no institution_id column — category is a loose
// editorial label, not a foreign key. Named here rather than silently
// assumed away, the same discipline admin/hifz-progress.js uses for
// MUH's missing assigned-student data.
//
// One explicit `action` per request, never an implicit upsert — matches
// the Ijazah grant/revoke pattern in admin/hifz-progress.js:
//   create     — new row, always starts as status='draft'          (C)
//   update     — edit content fields on an existing row (any status) (E)
//   publish    — status -> 'published', sets published_at if unset  (P)
//   unpublish  — status -> 'draft' (pull a live item back for editing) (P)
//   archive    — status -> 'archived' (permanent history, never deleted) (Ar)
//   feature    — mark as the single homepage hero item (must already be
//                published); unsets is_featured on every other row first (P)
//   unfeature  — clear the homepage hero slot                        (P)
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest, timingSafeEqualString } from '../../../_lib/session.js';
import { hasPermissionFor } from '../../../_lib/permissions.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { logStaffEvent } from '../../../_lib/audit.js';
import { sendWebPushToGuardian } from '../../../_lib/web-push.js';
import { siteOriginFromRequest } from '../../../_lib/email.js';

// Push fan-out on publish, matching the App Architecture Directive's own
// named use case ("push notifications for announcements/news"). Best
// effort only — a slow or failing push provider must never block or
// fail the publish action itself, so every step here is wrapped and
// swallows its own errors (mirrors sendWebPush()'s own never-throw
// contract, but the guardian-list query above it can still throw on a
// bad connection, hence the outer try/catch too).
async function notifyGuardiansOfPublish(sql, env, request, announcementId) {
  try {
    const ann = await sql`SELECT title, summary, category, action_url FROM announcements WHERE id = ${announcementId}`;
    if (!ann.rows.length) return;
    const { title, summary, category, action_url: actionUrl } = ann.rows[0];
    const origin = siteOriginFromRequest(request);
    const url = actionUrl || `${origin}/announcements/`;
    const payload = { title, body: summary, url, tag: `announcement-${announcementId}` };

    const subscribed = await sql`
      SELECT DISTINCT guardian_id FROM push_subscriptions ps
      JOIN guardian_notification_preferences gnp ON gnp.guardian_id = ps.guardian_id
      WHERE gnp.channel_push = true AND gnp.type_announcements = true`;
    for (const row of subscribed.rows) {
      await sendWebPushToGuardian(env, sql, row.guardian_id, payload);
    }
  } catch (err) {
    console.error('announcement publish push fan-out error', err);
  }
}

async function resolveAuth(request, env) {
  if (env.SESSION_SECRET) {
    let session = null;
    try {
      session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
    } catch (err) {
      session = null;
    }
    if (session) return { method: 'staff_session', staffId: session.staffId };
  }
  const adminToken = env.PORTAL_ADMIN_TOKEN;
  if (adminToken && timingSafeEqualString(request.headers.get('x-admin-token'), adminToken)) {
    return { method: 'bearer_token', staffId: null };
  }
  return null;
}

// Staff-session grant check for one action. Bearer-token requests skip
// this entirely (legacy single-secret behaviour, unchanged). institutionId
// is always null here — see the header comment's named scope gap; this
// checks role-level Matrix membership only, not PRIN's finer
// "own institution" text. Returns null (allowed) or an error string.
async function checkStaffGrant(sql, staffId, permissionCode) {
  const grant = await hasPermissionFor(sql, staffId, 'communications', permissionCode, null);
  if (!grant.granted) {
    return `Your role does not have authority for this action (communications: ${permissionCode}).`;
  }
  return null;
}

const CATEGORIES = [
  'admissions', 'events', 'academic_notices', 'quran_college',
  'arabic_studies', 'scholarships', 'parent_notices', 'general',
];
const CONTENT_FIELDS = [
  ['category', 'category'], ['title', 'title'], ['summary', 'summary'], ['body', 'body'],
  ['imageUrl', 'image_url'], ['venue', 'venue'], ['eventDate', 'event_date'], ['eventTime', 'event_time'],
  ['actionLabel', 'action_label'], ['actionUrl', 'action_url'],
];
// galleryImages is handled separately from CONTENT_FIELDS below — it's a
// JSON array (COALESCE against a bare parameter doesn't work cleanly for
// jsonb the way it does for scalar columns), and only makes sense to set
// post-event, typically well after the initial create.

export async function onRequestPost({ request, env }) {
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'No database is linked yet.' }, 500);
  }

  const auth = await resolveAuth(request, env);
  if (!auth) {
    return json({ error: 'Not authorised. Sign in with a Registrar, Principal, or Executive staff account, or supply a valid admin token.' }, 403);
  }

  const body = await readJsonBody(request);
  const action = body && body.action;

  try {
    if (action === 'create') {
      if (!body.category || !CATEGORIES.includes(body.category)) {
        return json({ error: `category is required and must be one of: ${CATEGORIES.join(', ')}.` }, 400);
      }
      if (!body.title || !body.summary) {
        return json({ error: 'title and summary are required.' }, 400);
      }
      if (auth.method === 'staff_session') {
        const err = await checkStaffGrant(sql, auth.staffId, 'C');
        if (err) return json({ error: err }, 403);
      }
      const created = await sql`
        INSERT INTO announcements (category, title, summary, body, image_url, venue, event_date, event_time, action_label, action_url, created_by)
        VALUES (${body.category}, ${body.title}, ${body.summary}, ${body.body || null}, ${body.imageUrl || null},
                ${body.venue || null}, ${body.eventDate || null}, ${body.eventTime || null},
                ${body.actionLabel || null}, ${body.actionUrl || null}, ${body.createdBy || null})
        RETURNING id`;
      if (auth.method === 'staff_session') {
        await logStaffEvent(sql, {
          actorStaffId: auth.staffId, eventType: 'sensitive_action', targetType: 'announcement', targetId: created.rows[0].id,
          reason: body.reason || null, metadata: { action: 'create', category: body.category },
        });
      }
      return json({ ok: true, id: created.rows[0].id, status: 'draft' });
    }

    if (!Number.isInteger(body.id)) {
      return json({ error: 'A valid numeric id is required for this action.' }, 400);
    }
    const existing = await sql`SELECT id, status FROM announcements WHERE id = ${body.id}`;
    if (!existing.rows.length) {
      return json({ error: 'No announcement found with that id.' }, 404);
    }

    if (action === 'update') {
      if (auth.method === 'staff_session') {
        const err = await checkStaffGrant(sql, auth.staffId, 'E');
        if (err) return json({ error: err }, 403);
      }
      if (body.category && !CATEGORIES.includes(body.category)) {
        return json({ error: `category must be one of: ${CATEGORIES.join(', ')}.` }, 400);
      }
      const touched = CONTENT_FIELDS.filter(([inKey]) => Object.prototype.hasOwnProperty.call(body, inKey));
      const touchesGallery = Object.prototype.hasOwnProperty.call(body, 'galleryImages');
      if (!touched.length && !touchesGallery) {
        return json({ error: 'Provide at least one field to update.' }, 400);
      }
      if (touchesGallery && body.galleryImages !== null && !Array.isArray(body.galleryImages)) {
        return json({ error: 'galleryImages must be an array of {url, alt} objects, or null to clear it.' }, 400);
      }
      // COALESCE-per-field so a request only naming a subset of fields
      // leaves the rest untouched — send only what changed, same
      // convention as the attendance/results/fees upserts in
      // admin/students.js. (A field can't be cleared back to NULL this
      // way; not needed yet — every field here is optional at create time.)
      await sql`
        UPDATE announcements SET
          category = COALESCE(${body.category ?? null}, category),
          title = COALESCE(${body.title ?? null}, title),
          summary = COALESCE(${body.summary ?? null}, summary),
          body = COALESCE(${body.body ?? null}, body),
          image_url = COALESCE(${body.imageUrl ?? null}, image_url),
          venue = COALESCE(${body.venue ?? null}, venue),
          event_date = COALESCE(${body.eventDate ?? null}, event_date),
          event_time = COALESCE(${body.eventTime ?? null}, event_time),
          action_label = COALESCE(${body.actionLabel ?? null}, action_label),
          action_url = COALESCE(${body.actionUrl ?? null}, action_url),
          updated_at = now()
        WHERE id = ${body.id}`;
      // Gallery is set explicitly (not COALESCEd) so it can also be
      // cleared back to null on purpose — e.g. an event photo taken down.
      if (touchesGallery) {
        await sql`
          UPDATE announcements SET gallery_images = ${body.galleryImages ? JSON.stringify(body.galleryImages) : null}, updated_at = now()
          WHERE id = ${body.id}`;
      }
      const updatedFields = touched.map(([inKey]) => inKey).concat(touchesGallery ? ['galleryImages'] : []);
      if (auth.method === 'staff_session') {
        await logStaffEvent(sql, {
          actorStaffId: auth.staffId, eventType: 'sensitive_action', targetType: 'announcement', targetId: body.id,
          reason: body.reason || null, metadata: { action: 'update', updated: updatedFields },
        });
      }
      return json({ ok: true, id: body.id, updated: updatedFields });
    }

    if (action === 'publish') {
      if (auth.method === 'staff_session') {
        const err = await checkStaffGrant(sql, auth.staffId, 'P');
        if (err) return json({ error: err }, 403);
      }
      await sql`
        UPDATE announcements SET status = 'published',
          published_at = COALESCE(published_at, now()), updated_at = now()
        WHERE id = ${body.id}`;
      if (auth.method === 'staff_session') {
        await logStaffEvent(sql, {
          actorStaffId: auth.staffId, eventType: 'sensitive_action', targetType: 'announcement', targetId: body.id,
          reason: body.reason || null, metadata: { action: 'publish' },
        });
      }
      await notifyGuardiansOfPublish(sql, env, request, body.id);
      return json({ ok: true, id: body.id, status: 'published' });
    }

    if (action === 'unpublish') {
      if (auth.method === 'staff_session') {
        const err = await checkStaffGrant(sql, auth.staffId, 'P');
        if (err) return json({ error: err }, 403);
      }
      await sql`UPDATE announcements SET status = 'draft', updated_at = now() WHERE id = ${body.id}`;
      if (auth.method === 'staff_session') {
        await logStaffEvent(sql, {
          actorStaffId: auth.staffId, eventType: 'sensitive_action', targetType: 'announcement', targetId: body.id,
          reason: body.reason || null, metadata: { action: 'unpublish' },
        });
      }
      return json({ ok: true, id: body.id, status: 'draft' });
    }

    if (action === 'archive') {
      if (auth.method === 'staff_session') {
        const err = await checkStaffGrant(sql, auth.staffId, 'Ar');
        if (err) return json({ error: err }, 403);
      }
      await sql`UPDATE announcements SET status = 'archived', updated_at = now() WHERE id = ${body.id}`;
      if (auth.method === 'staff_session') {
        await logStaffEvent(sql, {
          actorStaffId: auth.staffId, eventType: 'sensitive_action', targetType: 'announcement', targetId: body.id,
          reason: body.reason || null, metadata: { action: 'archive' },
        });
      }
      return json({ ok: true, id: body.id, status: 'archived' });
    }

    if (action === 'feature') {
      if (existing.rows[0].status !== 'published') {
        return json({ error: 'Only a published announcement can be featured — publish it first.' }, 400);
      }
      if (auth.method === 'staff_session') {
        const err = await checkStaffGrant(sql, auth.staffId, 'P');
        if (err) return json({ error: err }, 403);
      }
      await sql`UPDATE announcements SET is_featured = false WHERE is_featured = true`;
      await sql`UPDATE announcements SET is_featured = true, updated_at = now() WHERE id = ${body.id}`;
      if (auth.method === 'staff_session') {
        await logStaffEvent(sql, {
          actorStaffId: auth.staffId, eventType: 'sensitive_action', targetType: 'announcement', targetId: body.id,
          reason: body.reason || null, metadata: { action: 'feature' },
        });
      }
      return json({ ok: true, id: body.id, featured: true });
    }

    if (action === 'unfeature') {
      if (auth.method === 'staff_session') {
        const err = await checkStaffGrant(sql, auth.staffId, 'P');
        if (err) return json({ error: err }, 403);
      }
      await sql`UPDATE announcements SET is_featured = false, updated_at = now() WHERE id = ${body.id}`;
      if (auth.method === 'staff_session') {
        await logStaffEvent(sql, {
          actorStaffId: auth.staffId, eventType: 'sensitive_action', targetType: 'announcement', targetId: body.id,
          reason: body.reason || null, metadata: { action: 'unfeature' },
        });
      }
      return json({ ok: true, id: body.id, featured: false });
    }

    return json({ error: 'Unknown action. Expected one of: create, update, publish, unpublish, archive, feature, unfeature.' }, 400);
  } catch (err) {
    console.error('portal admin announcements error', err);
    return json({ error: 'Could not save that announcement: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
