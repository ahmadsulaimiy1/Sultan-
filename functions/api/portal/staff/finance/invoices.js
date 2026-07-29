// Finance Officer: Invoice Engine (Imperial Digital Campus Directive,
// Priority 3). An invoice is built by picking which fee_structures
// templates apply (plus any genuinely custom line item) — the Finance
// Officer never types a bare total from memory. If the student holds
// an active scholarship, its discount is computed and SNAPSHOTTED onto
// the invoice at creation time (invoices.scholarship_discount) so a
// later change to the scholarship never silently rewrites an invoice
// already issued. Session-authenticated, Permission-Engine-gated
// against `finance` (no new role/permission — reuses Migration Phase
// C's FIN/EXE grants).
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { logStaffEvent } from '../../../../_lib/audit.js';
import { generateInvoiceNo } from '../../../../_lib/finance-no.js';

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

async function ensureTerm(sql, rawTerm) {
  const term = String(rawTerm || '').trim();
  if (!term) return term;
  await sql`INSERT INTO academic_terms (label) VALUES (${term}) ON CONFLICT (label) DO NOTHING`;
  return term;
}

function mapInvoiceRow(r) {
  return {
    id: r.id, invoiceNo: r.invoice_no, term: r.term, studentCategory: r.student_category,
    dueDate: r.due_date, status: r.status, subtotal: Number(r.subtotal),
    scholarshipDiscount: Number(r.scholarship_discount), totalAmount: Number(r.total_amount),
    notes: r.notes, createdAt: r.created_at, cancelledAt: r.cancelled_at, cancellationNote: r.cancellation_note,
  };
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const grant = await hasPermissionFor(sql, staffId, 'finance', 'V', null);
  if (!grant.granted) {
    return json({ error: "Your role does not have authority to view invoices. This is a Finance Officer function — no Finance Officer account has been issued yet. See docs/finance-platform.md." }, 403);
  }

  const url = new URL(request.url);
  const admissionNo = (url.searchParams.get('admissionNo') || '').trim();
  const status = (url.searchParams.get('status') || '').trim();

  try {
    let invoiceRows;
    if (admissionNo) {
      const studentRes = await sql`SELECT id FROM students WHERE admission_no = ${admissionNo}`;
      const student = studentRes.rows[0];
      if (!student) return json({ error: 'No student found with that Institutional Student Number.' }, 404);
      invoiceRows = (await sql`SELECT * FROM invoices WHERE student_id = ${student.id} ORDER BY created_at DESC`).rows;
    } else if (status) {
      invoiceRows = (await sql`SELECT * FROM invoices WHERE status = ${status} ORDER BY created_at DESC LIMIT 100`).rows;
    } else {
      invoiceRows = (await sql`SELECT * FROM invoices ORDER BY created_at DESC LIMIT 50`).rows;
    }

    const invoiceIds = invoiceRows.map((r) => r.id);
    let itemsByInvoice = {};
    let paidByInvoice = {};
    if (invoiceIds.length) {
      const itemsRes = await sql`SELECT * FROM invoice_items WHERE invoice_id = ANY(${invoiceIds})`;
      itemsRes.rows.forEach((it) => {
        (itemsByInvoice[it.invoice_id] = itemsByInvoice[it.invoice_id] || []).push({
          feeType: it.fee_type, label: it.label, amount: Number(it.amount),
        });
      });
      const paidRes = await sql`
        SELECT invoice_id, COALESCE(SUM(amount), 0)::numeric AS paid FROM receipts
        WHERE invoice_id = ANY(${invoiceIds}) AND revoked_at IS NULL GROUP BY invoice_id`;
      paidRes.rows.forEach((p) => { paidByInvoice[p.invoice_id] = Number(p.paid); });
    }

    return json({
      invoices: invoiceRows.map((r) => ({
        ...mapInvoiceRow(r),
        items: itemsByInvoice[r.id] || [],
        amountPaid: paidByInvoice[r.id] || 0,
        balance: Number(r.total_amount) - (paidByInvoice[r.id] || 0),
      })),
    });
  } catch (err) {
    console.error('invoices list error', err);
    return json({ error: 'Could not load invoices: ' + (err && err.message ? err.message : 'unknown error') }, 500);
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
      const admissionNo = (body.admissionNo || '').trim();
      const rawTerm = body.term || '';
      const studentCategory = body.studentCategory === 'new_entrant' ? 'new_entrant' : (body.studentCategory === 'boarder' ? 'boarder' : null);
      const feeStructureIds = Array.isArray(body.feeStructureIds) ? body.feeStructureIds.map(Number).filter(Boolean) : [];
      const customItems = Array.isArray(body.customItems) ? body.customItems : [];
      if (!admissionNo || !rawTerm || (!feeStructureIds.length && !customItems.length)) {
        return json({ error: 'admissionNo, term, and at least one fee structure or custom item are required.' }, 400);
      }

      const grant = await hasPermissionFor(sql, staffId, 'finance', 'C', null);
      if (!grant.granted) {
        return json({ error: "Your role does not have authority to create invoices. This is a Finance Officer function — no Finance Officer account has been issued yet. See docs/finance-platform.md." }, 403);
      }

      const studentRes = await sql`
        SELECT s.id, ci.id AS institution_id
        FROM students s
        LEFT JOIN classes c ON c.id = s.class_id
        LEFT JOIN institutions ci ON ci.name = c.institution
        WHERE s.admission_no = ${admissionNo}`;
      const student = studentRes.rows[0];
      if (!student) return json({ error: 'No student found with that Institutional Student Number.' }, 404);
      const institutionId = body.institutionId ? Number(body.institutionId) : student.institution_id;
      if (!institutionId) {
        return json({ error: "This student has no institution on file — pass institutionId explicitly." }, 400);
      }

      const term = await ensureTerm(sql, rawTerm);

      let items = [];
      if (feeStructureIds.length) {
        const fsRes = await sql`SELECT * FROM fee_structures WHERE id = ANY(${feeStructureIds}) AND is_active = true`;
        items = items.concat(fsRes.rows.map((r) => ({
          feeType: r.fee_type, label: r.label, amount: Number(r.amount), sourceFeeStructureId: r.id,
        })));
      }
      customItems.forEach((c) => {
        const amount = Number(c.amount);
        if (c && c.label && amount > 0) {
          items.push({ feeType: c.feeType || 'custom', label: c.label, amount, sourceFeeStructureId: null });
        }
      });
      if (!items.length) return json({ error: 'No valid line items resolved from the given fee structures/custom items.' }, 400);

      const subtotal = items.reduce((sum, it) => sum + it.amount, 0);

      // Snapshot any active scholarship's discount at issuance time —
      // prefers a scholarship scoped to this exact term over an ongoing
      // (term IS NULL) one, matching the more specific grant.
      const scholarshipRes = await sql`
        SELECT * FROM scholarships
        WHERE student_id = ${student.id} AND is_active = true AND revoked_at IS NULL
          AND (term = ${term} OR term IS NULL)
        ORDER BY term NULLS LAST LIMIT 1`;
      const scholarship = scholarshipRes.rows[0];
      let discount = 0;
      if (scholarship) {
        if (scholarship.scholarship_type === 'full' && scholarship.discount_percent == null && scholarship.discount_amount == null) {
          discount = subtotal;
        } else if (scholarship.discount_percent != null) {
          discount = subtotal * (Number(scholarship.discount_percent) / 100);
        } else if (scholarship.discount_amount != null) {
          discount = Math.min(Number(scholarship.discount_amount), subtotal);
        }
      }
      const totalAmount = Math.max(0, subtotal - discount);

      const invoiceNo = await generateInvoiceNo(sql, new Date());
      const created = await sql`
        INSERT INTO invoices (invoice_no, student_id, institution_id, term, student_category, due_date, subtotal, scholarship_discount, total_amount, notes, created_by_staff_id)
        VALUES (${invoiceNo}, ${student.id}, ${institutionId}, ${term}, ${studentCategory}, ${body.dueDate || null}, ${subtotal}, ${discount}, ${totalAmount}, ${body.notes || null}, ${staffId})
        RETURNING id`;
      const invoiceId = created.rows[0].id;

      for (const it of items) {
        await sql`
          INSERT INTO invoice_items (invoice_id, fee_type, label, amount, source_fee_structure_id)
          VALUES (${invoiceId}, ${it.feeType}, ${it.label}, ${it.amount}, ${it.sourceFeeStructureId})`;
      }

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'invoice', targetId: invoiceId,
        reason: body.reason || null, metadata: { admissionNo, term, invoiceNo, subtotal, discount, totalAmount },
      });

      return json({ ok: true, invoiceId, invoiceNo, subtotal, scholarshipDiscount: discount, totalAmount, items });
    }

    if (action === 'cancel') {
      const invoiceId = Number(body.invoiceId);
      if (!invoiceId) return json({ error: 'invoiceId is required.' }, 400);

      const grant = await hasPermissionFor(sql, staffId, 'finance', 'E', null);
      if (!grant.granted) {
        return json({ error: "Your role does not have authority to cancel invoices. See docs/finance-platform.md." }, 403);
      }

      await sql`UPDATE invoices SET status = 'cancelled', cancelled_at = now(), cancellation_note = ${body.reason || null} WHERE id = ${invoiceId}`;
      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'invoice', targetId: invoiceId,
        reason: body.reason || null, metadata: { action: 'cancel' },
      });
      return json({ ok: true });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error('invoices write error', err);
    return json({ error: 'Could not save that invoice: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
