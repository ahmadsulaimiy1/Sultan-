// Public, unauthenticated read endpoint for the institutional
// announcement system — the ribbon, homepage hero/countdown, and the
// /announcements/ archive all call this. No PII here (it's public
// communications content), so no session/token required, unlike every
// other route under functions/api/portal/.
//
// Query params (all optional):
//   category        — one of the eight announcements.category values;
//                      omit for "every category"
//   includeArchived — 'true' to also return archived rows (the archive
//                      page's "historical announcements" filter); the
//                      ribbon and homepage hero never pass this
//   limit           — defaults to 30, capped at 100
import { getSql } from '../../../_lib/db.js';
import { json } from '../../../_lib/http.js';

const CATEGORIES = [
  'admissions', 'events', 'academic_notices', 'quran_college',
  'arabic_studies', 'scholarships', 'parent_notices', 'general',
];

function toRow(r) {
  return {
    id: r.id,
    category: r.category,
    title: r.title,
    summary: r.summary,
    body: r.body,
    imageUrl: r.image_url,
    venue: r.venue,
    eventDate: r.event_date,
    eventTime: r.event_time,
    actionLabel: r.action_label,
    actionUrl: r.action_url,
    isFeatured: r.is_featured,
    status: r.status,
    publishedAt: r.published_at,
    rsvpCount: r.rsvp_count || 0,
    galleryImages: Array.isArray(r.gallery_images) ? r.gallery_images : null,
  };
}

export async function onRequestGet({ request, env }) {
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'No database is linked yet.' }, 500);
  }

  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  if (category && !CATEGORIES.includes(category)) {
    return json({ error: `Unknown category. Expected one of: ${CATEGORIES.join(', ')}.` }, 400);
  }
  const includeArchived = url.searchParams.get('includeArchived') === 'true';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 30, 1), 100);

  try {
    const itemsRes = await sql`
      SELECT * FROM announcements
      WHERE (status = 'published' OR (status = 'archived' AND ${includeArchived} = true))
        AND (${category}::text IS NULL OR category = ${category})
      ORDER BY published_at DESC NULLS LAST, created_at DESC
      LIMIT ${limit}`;

    const featuredRes = await sql`
      SELECT * FROM announcements
      WHERE status = 'published' AND is_featured = true
      ORDER BY updated_at DESC
      LIMIT 1`;

    return json({
      ok: true,
      items: itemsRes.rows.map(toRow),
      featured: featuredRes.rows[0] ? toRow(featuredRes.rows[0]) : null,
    });
  } catch (err) {
    console.error('portal announcements list error', err);
    return json({ error: 'Could not load announcements: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
