// Finance Officer: Fee Structure Management (Imperial Digital Campus
// Directive, Priority 3). A fee structure is a template line item — a
// named amount for a given institution/class/category — that an
// invoice is BUILT from, rather than a Finance Officer typing amounts
// from memory each time. Session-authenticated, Permission-Engine-
// gated against the existing `finance` area (no new role/permission
// added — FIN already holds V/C/E/X on it from Migration Phase C).
//
// No hard delete anywhere in this file (or anywhere in the Finance
// Platform) — the Matrix grants no `D` permission on `finance` to any
// role, so a fee structure that's no longer offered is deactivated
// (is_active = false), never removed, the same convention certificates/
// receipts use (revoked_at) rather than deletion.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { logStaffEvent } from '../../../../_lib/audit.js';

async function requireStaffSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
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

  const grant = await hasPermissionFor(sql, staffId, 'finance', 'V', null);
  if (!grant.granted) {
    return json({ error: "Your role does not have authority to view fee structures. This is a Finance Officer function — no Finance Officer account has been issued yet. See docs/finance-platform.md." }, 403);
  }

  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId');
  const includeInactive = url.searchParams.get('includeInactive') === '1';

  try {
    // Four explicit query shapes rather than composing conditional SQL
    // fragments — the Neon serverless driver's tagged-template `sql`
    // has no proven/documented support for embedding a fragment as a
    // placeholder value (see functions/_lib/identity-no.js's comment on
    // the related `.unsafe()` gap), so every other dynamic-filter query
    // in this codebase branches at the JS level instead.
    let rows;
    if (institutionId && includeInactive) {
      rows = (await sql`
        SELECT fs.*, i.name AS institution_name FROM fee_structures fs
        JOIN institutions i ON i.id = fs.institution_id
        WHERE fs.institution_id = ${Number(institutionId)}
        ORDER BY i.name, fs.class_label, fs.student_category, fs.fee_type`).rows;
    } else if (institutionId) {
      rows = (await sql`
        SELECT fs.*, i.name AS institution_name FROM fee_structures fs
        JOIN institutions i ON i.id = fs.institution_id
        WHERE fs.institution_id = ${Number(institutionId)} AND fs.is_active = true
        ORDER BY i.name, fs.class_label, fs.student_category, fs.fee_type`).rows;
    } else if (includeInactive) {
      rows = (await sql`
        SELECT fs.*, i.name AS institution_name FROM fee_structures fs
        JOIN institutions i ON i.id = fs.institution_id
        ORDER BY i.name, fs.class_label, fs.student_category, fs.fee_type`).rows;
    } else {
      rows = (await sql`
        SELECT fs.*, i.name AS institution_name FROM fee_structures fs
        JOIN institutions i ON i.id = fs.institution_id
        WHERE fs.is_active = true
        ORDER BY i.name, fs.class_label, fs.student_category, fs.fee_type`).rows;
    }

    return json({
      feeStructures: rows.map((r) => ({
        id: r.id, institutionId: r.institution_id, institutionName: r.institution_name,
        classLabel: r.class_label || null, studentCategory: r.student_category, feeType: r.fee_type,
        label: r.label, amount: Number(r.amount), applicableGender: r.applicable_gender,
        isRecurring: r.is_recurring, isActive: r.is_active, notes: r.notes,
      })),
    });
  } catch (err) {
    console.error('fee-structures list error', err);
    return json({ error: 'Could not load fee structures: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  const action = body.action || 'create';

  try {
    if (action === 'create') {
      // Accepts either institutionId directly, or institutionName
      // resolved to an id here — the staff UI's <select> offers the
      // four real institution names rather than requiring a separate
      // "list institutions" endpoint just to populate a dropdown.
      let institutionId = body.institutionId ? Number(body.institutionId) : null;
      const institutionName = (body.institutionName || '').trim();
      const classLabel = (body.classLabel || '').trim();
      const studentCategory = body.studentCategory === 'new_entrant' ? 'new_entrant' : 'boarder';
      const feeType = (body.feeType || '').trim();
      const label = (body.label || '').trim();
      const amount = Number(body.amount);
      const applicableGender = body.applicableGender === 'female' ? 'female' : null;
      const isRecurring = body.isRecurring !== false;

      if (!institutionId && institutionName) {
        const instRes = await sql`SELECT id FROM institutions WHERE name = ${institutionName}`;
        if (!instRes.rows[0]) return json({ error: 'No institution found with that name.' }, 404);
        institutionId = instRes.rows[0].id;
      }
      if (!institutionId || !feeType || !label || !(amount > 0)) {
        return json({ error: 'institutionId (or institutionName), feeType, label, and a positive amount are all required.' }, 400);
      }

      const grant = await hasPermissionFor(sql, staffId, 'finance', 'C', null);
      if (!grant.granted) {
        return json({ error: "Your role does not have authority to create fee structures. This is a Finance Officer function — no Finance Officer account has been issued yet. See docs/finance-platform.md." }, 403);
      }

      const created = await sql`
        INSERT INTO fee_structures (institution_id, class_label, student_category, fee_type, label, amount, applicable_gender, is_recurring, notes, created_by_staff_id)
        VALUES (${institutionId}, ${classLabel}, ${studentCategory}, ${feeType}, ${label}, ${amount}, ${applicableGender}, ${isRecurring}, ${body.notes || null}, ${staffId})
        ON CONFLICT (institution_id, class_label, student_category, fee_type) DO UPDATE SET
          label = EXCLUDED.label, amount = EXCLUDED.amount, applicable_gender = EXCLUDED.applicable_gender,
          is_recurring = EXCLUDED.is_recurring, notes = EXCLUDED.notes, is_active = true
        RETURNING id`;

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'fee_structure', targetId: created.rows[0].id,
        reason: body.reason || null, metadata: { institutionId, classLabel, studentCategory, feeType, amount },
      });

      return json({ ok: true, feeStructureId: created.rows[0].id });
    }

    if (action === 'deactivate') {
      const id = Number(body.id);
      if (!id) return json({ error: 'id is required.' }, 400);

      const grant = await hasPermissionFor(sql, staffId, 'finance', 'E', null);
      if (!grant.granted) {
        return json({ error: "Your role does not have authority to edit fee structures. See docs/finance-platform.md." }, 403);
      }

      await sql`UPDATE fee_structures SET is_active = false WHERE id = ${id}`;
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'fee_structure', targetId: id,
        reason: body.reason || null, metadata: { action: 'deactivate' },
      });
      return json({ ok: true });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error('fee-structures write error', err);
    return json({ error: 'Could not save that fee structure: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
