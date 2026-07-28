// Token-protected admin endpoint for staff to manage the SHRS Marketplace
// catalog. Same "protected raw API" convention as admin/announcements.js
// — no admin UI yet, one explicit action per request.
//   create, update, publish, unpublish, archive, setAvailability
import { getSql } from '../../../_lib/db.js';
import { timingSafeEqualString } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';

const CATEGORIES = [
  'textbooks', 'exercise_books', 'uniforms', 'bags', 'stationery',
  'quran_materials', 'arabic_materials', 'islamic_studies_materials',
  'digital_products', 'shrs_publications', 'grammar_books', 'curriculum_materials',
];
const CONTENT_FIELDS = [
  ['category', 'category'], ['name', 'name'], ['description', 'description'],
  ['imageUrl', 'image_url'],
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
      if (!body.name) {
        return json({ error: 'name is required.' }, 400);
      }
      const created = await sql`
        INSERT INTO marketplace_products (category, name, description, price_naira, image_url, created_by)
        VALUES (${body.category}, ${body.name}, ${body.description || null},
                ${body.priceNaira != null ? body.priceNaira : null}, ${body.imageUrl || null}, ${body.createdBy || null})
        RETURNING id`;
      return json({ ok: true, id: created.rows[0].id, status: 'draft' });
    }

    if (!Number.isInteger(body.id)) {
      return json({ error: 'A valid numeric id is required for this action.' }, 400);
    }
    const existing = await sql`SELECT id FROM marketplace_products WHERE id = ${body.id}`;
    if (!existing.rows.length) {
      return json({ error: 'No product found with that id.' }, 404);
    }

    if (action === 'update') {
      if (body.category && !CATEGORIES.includes(body.category)) {
        return json({ error: `category must be one of: ${CATEGORIES.join(', ')}.` }, 400);
      }
      const touched = CONTENT_FIELDS.filter(([inKey]) => Object.prototype.hasOwnProperty.call(body, inKey));
      const touchesPrice = Object.prototype.hasOwnProperty.call(body, 'priceNaira');
      if (!touched.length && !touchesPrice) {
        return json({ error: 'Provide at least one field to update.' }, 400);
      }
      await sql`
        UPDATE marketplace_products SET
          category = COALESCE(${body.category ?? null}, category),
          name = COALESCE(${body.name ?? null}, name),
          description = COALESCE(${body.description ?? null}, description),
          image_url = COALESCE(${body.imageUrl ?? null}, image_url),
          updated_at = now()
        WHERE id = ${body.id}`;
      if (touchesPrice) {
        await sql`UPDATE marketplace_products SET price_naira = ${body.priceNaira}, updated_at = now() WHERE id = ${body.id}`;
      }
      return json({ ok: true, id: body.id });
    }

    if (action === 'publish') {
      await sql`UPDATE marketplace_products SET status = 'published', updated_at = now() WHERE id = ${body.id}`;
      return json({ ok: true, id: body.id, status: 'published' });
    }
    if (action === 'unpublish') {
      await sql`UPDATE marketplace_products SET status = 'draft', updated_at = now() WHERE id = ${body.id}`;
      return json({ ok: true, id: body.id, status: 'draft' });
    }
    if (action === 'archive') {
      await sql`UPDATE marketplace_products SET status = 'archived', updated_at = now() WHERE id = ${body.id}`;
      return json({ ok: true, id: body.id, status: 'archived' });
    }
    if (action === 'setAvailability') {
      if (typeof body.isAvailable !== 'boolean') {
        return json({ error: 'isAvailable (boolean) is required.' }, 400);
      }
      await sql`UPDATE marketplace_products SET is_available = ${body.isAvailable}, updated_at = now() WHERE id = ${body.id}`;
      return json({ ok: true, id: body.id, isAvailable: body.isAvailable });
    }

    return json({ error: 'Unknown action. Expected one of: create, update, publish, unpublish, archive, setAvailability.' }, 400);
  } catch (err) {
    console.error('portal admin marketplace error', err);
    return json({ error: 'Could not save that product: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
