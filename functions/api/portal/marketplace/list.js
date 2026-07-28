// Public, unauthenticated read endpoint for the SHRS Marketplace catalog.
// No PII here, so no session/token required — same convention as
// announcements/list.js. Deliberately returns an empty array for a
// category with nothing published yet rather than fabricating products.
import { getSql } from '../../../_lib/db.js';
import { json } from '../../../_lib/http.js';

const CATEGORIES = [
  'textbooks', 'exercise_books', 'uniforms', 'bags', 'stationery',
  'quran_materials', 'arabic_materials', 'islamic_studies_materials',
  'digital_products', 'shrs_publications', 'grammar_books', 'curriculum_materials',
];

function toRow(r) {
  return {
    id: r.id,
    category: r.category,
    name: r.name,
    description: r.description,
    priceNaira: r.price_naira !== null ? Number(r.price_naira) : null,
    imageUrl: r.image_url,
    isAvailable: r.is_available,
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
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 60, 1), 200);

  try {
    const itemsRes = await sql`
      SELECT * FROM marketplace_products
      WHERE status = 'published' AND (${category}::text IS NULL OR category = ${category})
      ORDER BY category, name
      LIMIT ${limit}`;
    return json({ ok: true, items: itemsRes.rows.map(toRow) });
  } catch (err) {
    console.error('portal marketplace list error', err);
    return json({ error: 'Could not load the catalog: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
