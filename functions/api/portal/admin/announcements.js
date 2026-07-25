// Token-protected admin endpoint for staff to manage institutional
// announcements — admissions notices, events, academic notices, and
// category-specific communications. No admin UI yet — same "protected
// raw API" convention as admin/students.js and admin/hifz-progress.js;
// see docs/announcements-system.md for the request shapes and curl
// examples. Re-gated to a proper Communications/Front-Office role once
// the Staff Identity & Role System's permission engine exists —
// PORTAL_ADMIN_TOKEN is reused for now only because no narrower role
// boundary is implementable yet.
//
// One explicit `action` per request, never an implicit upsert — matches
// the Ijazah grant/revoke pattern in admin/hifz-progress.js:
//   create     — new row, always starts as status='draft'
//   update     — edit content fields on an existing row (any status)
//   publish    — status -> 'published', sets published_at if unset
//   unpublish  — status -> 'draft' (pull a live item back for editing)
//   archive    — status -> 'archived' (permanent history, never deleted)
//   feature    — mark as the single homepage hero item (must already be
//                published); unsets is_featured on every other row first
//   unfeature  — clear the homepage hero slot
import { getSql } from '../../../_lib/db.js';
import { timingSafeEqualString } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';

const CATEGORIES = [
  'admissions', 'events', 'academic_notices', 'quran_college',
  'arabic_studies', 'scholarships', 'parent_notices', 'general',
];
const CONTENT_FIELDS = [
  ['category', 'category'], ['title', 'title'], ['summary', 'summary'], ['body', 'body'],
  ['imageUrl', 'image_url'], ['venue', 'venue'], ['eventDate', 'event_date'], ['eventTime', 'event_time'],
  ['actionLabel', 'action_label'], ['actionUrl', 'action_url'],
];

export async function onRequestPost({ request, env }) {
  const adminToken = env.PORTAL_ADMIN_TOKEN;
  if (!adminToken) {
    return json({ error: 'Portal admin is not configured yet — PORTAL_ADMIN_TOKEN is not set.' }, 500);
  }
  if (!timingSafeEqualString(request.headers.get('x-admin-token'), adminToken)) {
    return json({ error: 'Invalid admin token.' }, 403);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'No database is linked yet.' }, 500);
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
      const created = await sql`
        INSERT INTO announcements (category, title, summary, body, image_url, venue, event_date, event_time, action_label, action_url, created_by)
        VALUES (${body.category}, ${body.title}, ${body.summary}, ${body.body || null}, ${body.imageUrl || null},
                ${body.venue || null}, ${body.eventDate || null}, ${body.eventTime || null},
                ${body.actionLabel || null}, ${body.actionUrl || null}, ${body.createdBy || null})
        RETURNING id`;
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
      if (body.category && !CATEGORIES.includes(body.category)) {
        return json({ error: `category must be one of: ${CATEGORIES.join(', ')}.` }, 400);
      }
      const touched = CONTENT_FIELDS.filter(([inKey]) => Object.prototype.hasOwnProperty.call(body, inKey));
      if (!touched.length) {
        return json({ error: 'Provide at least one field to update.' }, 400);
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
      return json({ ok: true, id: body.id, updated: touched.map(([inKey]) => inKey) });
    }

    if (action === 'publish') {
      await sql`
        UPDATE announcements SET status = 'published',
          published_at = COALESCE(published_at, now()), updated_at = now()
        WHERE id = ${body.id}`;
      return json({ ok: true, id: body.id, status: 'published' });
    }

    if (action === 'unpublish') {
      await sql`UPDATE announcements SET status = 'draft', updated_at = now() WHERE id = ${body.id}`;
      return json({ ok: true, id: body.id, status: 'draft' });
    }

    if (action === 'archive') {
      await sql`UPDATE announcements SET status = 'archived', updated_at = now() WHERE id = ${body.id}`;
      return json({ ok: true, id: body.id, status: 'archived' });
    }

    if (action === 'feature') {
      if (existing.rows[0].status !== 'published') {
        return json({ error: 'Only a published announcement can be featured — publish it first.' }, 400);
      }
      await sql`UPDATE announcements SET is_featured = false WHERE is_featured = true`;
      await sql`UPDATE announcements SET is_featured = true, updated_at = now() WHERE id = ${body.id}`;
      return json({ ok: true, id: body.id, featured: true });
    }

    if (action === 'unfeature') {
      await sql`UPDATE announcements SET is_featured = false, updated_at = now() WHERE id = ${body.id}`;
      return json({ ok: true, id: body.id, featured: false });
    }

    return json({ error: 'Unknown action. Expected one of: create, update, publish, unpublish, archive, feature, unfeature.' }, 400);
  } catch (err) {
    console.error('portal admin announcements error', err);
    return json({ error: 'Could not save that announcement: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
