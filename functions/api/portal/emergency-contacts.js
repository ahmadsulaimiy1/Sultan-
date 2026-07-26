// Emergency Contacts (Phase 1A). GET lists the signed-in guardian's
// contacts; POST upserts one contact by `order` (1, 2, 3, ...) — the
// directive asks for two mandatory contacts, modelled here as
// `contact_order` slots so a school could later allow more without
// another migration. DELETE removes one by id.
import { getSql } from '../../_lib/db.js';
import { readSessionFromRequest } from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';

async function requireSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { guardianId: session.guardianId };
}

export async function onRequestGet({ request, env }) {
  const { guardianId, error } = await requireSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  try {
    const res = await sql`SELECT id, contact_order, full_name, relationship, phone, email FROM guardian_emergency_contacts WHERE guardian_id = ${guardianId} ORDER BY contact_order`;
    return json({ contacts: res.rows.map((c) => ({ id: c.id, order: c.contact_order, fullName: c.full_name, relationship: c.relationship, phone: c.phone, email: c.email })) });
  } catch (err) {
    console.error('emergency-contacts get error', err);
    return json({ error: 'Could not load your emergency contacts right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { guardianId, error } = await requireSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  const order = Number(body && body.order);
  const fullName = ((body && body.fullName) || '').trim();
  const relationship = ((body && body.relationship) || '').trim();
  const phone = ((body && body.phone) || '').trim();
  const email = ((body && body.email) || '').trim();

  if (!Number.isInteger(order) || order < 1) {
    return json({ error: 'A valid contact order (1, 2, ...) is required.' }, 400);
  }
  if (!fullName || !relationship || !phone) {
    return json({ error: 'Name, relationship, and phone are all required for an emergency contact.' }, 400);
  }

  try {
    const existing = await sql`SELECT id FROM guardian_emergency_contacts WHERE guardian_id = ${guardianId} AND contact_order = ${order}`;
    if (existing.rows.length) {
      await sql`
        UPDATE guardian_emergency_contacts SET full_name = ${fullName}, relationship = ${relationship}, phone = ${phone}, email = ${email || null}, updated_at = now()
        WHERE id = ${existing.rows[0].id}`;
    } else {
      await sql`
        INSERT INTO guardian_emergency_contacts (guardian_id, contact_order, full_name, relationship, phone, email)
        VALUES (${guardianId}, ${order}, ${fullName}, ${relationship}, ${phone}, ${email || null})`;
    }
    const res = await sql`SELECT id, contact_order, full_name, relationship, phone, email FROM guardian_emergency_contacts WHERE guardian_id = ${guardianId} ORDER BY contact_order`;
    return json({ ok: true, contacts: res.rows.map((c) => ({ id: c.id, order: c.contact_order, fullName: c.full_name, relationship: c.relationship, phone: c.phone, email: c.email })) });
  } catch (err) {
    console.error('emergency-contacts save error', err);
    return json({ error: 'Could not save that emergency contact right now — please try again shortly.' }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  const { guardianId, error } = await requireSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id)) return json({ error: 'A valid contact id is required.' }, 400);

  try {
    await sql`DELETE FROM guardian_emergency_contacts WHERE id = ${id} AND guardian_id = ${guardianId}`;
    return json({ ok: true });
  } catch (err) {
    console.error('emergency-contacts delete error', err);
    return json({ error: 'Could not remove that emergency contact right now — please try again shortly.' }, 500);
  }
}
