// Self-service Digital Signature management — the architecture Stage 3
// document generation will draw from (Conditional Approval directive
// item 7: "prepare the architecture now for Principal, Vice
// Principals, Founder/CEO, Registrar, Registry... each signature
// independently managed... do not hardcode signature images"). Any
// signed-in staff member manages only their OWN row (staff_id from the
// session, never a body parameter) — whether that signature is ever
// actually eligible to appear on a document is a Stage 3 decision this
// endpoint deliberately does not make.
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { logStaffEvent, requestAuditContext } from '../../../_lib/audit.js';

// A base64 data URI, capped well under Postgres's TEXT practicalities
// and this project's "no file-storage backend" reality — large enough
// for a genuine small signature scan, small enough to never become a
// makeshift file-hosting service through this field.
const MAX_IMAGE_DATA_LENGTH = 200_000;

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

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  try {
    const res = await sql`SELECT * FROM staff_signatures WHERE staff_id = ${staffId}`;
    const row = res.rows[0];
    return json({
      ok: true,
      signature: row ? {
        signatureType: row.signature_type, typedName: row.typed_name, hasImage: !!row.image_data,
        titleLine: row.title_line, isActive: row.is_active, updatedAt: row.updated_at,
      } : null,
    });
  } catch (err) {
    console.error('my-signature GET error', err);
    return json({ error: 'Could not load your signature right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  const signatureType = (body.signatureType || 'typed').trim();
  if (!['typed', 'uploaded_image'].includes(signatureType)) {
    return json({ error: "signatureType must be 'typed' or 'uploaded_image'." }, 400);
  }
  if (signatureType === 'typed' && !(body.typedName || '').trim()) {
    return json({ error: 'typedName is required for a typed signature.' }, 400);
  }
  if (signatureType === 'uploaded_image') {
    const imageData = body.imageData || '';
    if (!imageData.startsWith('data:image/')) return json({ error: 'imageData must be an image data URI.' }, 400);
    if (imageData.length > MAX_IMAGE_DATA_LENGTH) return json({ error: 'That image is too large — please use a smaller signature scan.' }, 400);
  }

  try {
    await sql`
      INSERT INTO staff_signatures (staff_id, signature_type, typed_name, image_data, title_line, is_active, updated_at)
      VALUES (${staffId}, ${signatureType}, ${body.typedName || null}, ${signatureType === 'uploaded_image' ? body.imageData : null}, ${body.titleLine || null}, true, now())
      ON CONFLICT (staff_id) DO UPDATE SET
        signature_type = EXCLUDED.signature_type, typed_name = EXCLUDED.typed_name,
        image_data = EXCLUDED.image_data, title_line = EXCLUDED.title_line, is_active = true, updated_at = now()`;

    const auditCtx = requestAuditContext(request);
    await logStaffEvent(sql, {
      actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'staff_signature', targetId: staffId,
      reason: null, metadata: { action: 'update_signature', signatureType },
      ipAddress: auditCtx.ipAddress, userAgent: auditCtx.userAgent,
    });
    return json({ ok: true });
  } catch (err) {
    console.error('my-signature POST error', err);
    return json({ error: 'Could not save your signature right now — please try again shortly.' }, 500);
  }
}
