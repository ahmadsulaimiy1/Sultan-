// Finance Officer: record a payment against an invoice and generate a
// receipt (Imperial Digital Campus Directive, Priority 3). receipt_no
// doubles as the public verification key — see
// functions/api/finance/verify-receipt.js — exactly like a
// certificate's reference_no: staff-assigned only, never
// self-service, so nothing here lets a stranger register a fake
// receipt.
//
// payment_method is deliberately limited to offline/manual methods
// (cash, bank_transfer, cheque, pos, other) — no payment gateway
// integration exists (no processor credentials are configured
// anywhere in this deployment), so recording a receipt here logs a
// payment the school already received through another channel; it is
// not a live checkout. See docs/finance-platform.md.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { logStaffEvent } from '../../../../_lib/audit.js';
import { generateReceiptNo } from '../../../../_lib/finance-no.js';
import { generateWithRetryOnConflict } from '../../../../_lib/generate-with-retry.js';

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

async function recomputeInvoiceStatus(sql, invoiceId) {
  const [invRes, paidRes] = await Promise.all([
    sql`SELECT total_amount, status FROM invoices WHERE id = ${invoiceId}`,
    sql`SELECT COALESCE(SUM(amount), 0)::numeric AS paid FROM receipts WHERE invoice_id = ${invoiceId} AND revoked_at IS NULL`,
  ]);
  const invoice = invRes.rows[0];
  if (!invoice || invoice.status === 'cancelled') return invoice ? invoice.status : null;
  const total = Number(invoice.total_amount);
  const paid = Number(paidRes.rows[0].paid);
  let status = 'unpaid';
  if (total > 0 && paid >= total) status = 'paid';
  else if (paid > 0) status = 'partial';
  await sql`UPDATE invoices SET status = ${status} WHERE id = ${invoiceId}`;
  return status;
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const grant = await hasPermissionFor(sql, staffId, 'finance', 'V', null);
  if (!grant.granted) {
    return json({ error: "Your role does not have authority to view receipts. This is a Finance Officer function — no Finance Officer account has been issued yet. See docs/finance-platform.md." }, 403);
  }

  const url = new URL(request.url);
  const invoiceId = url.searchParams.get('invoiceId');
  const admissionNo = (url.searchParams.get('admissionNo') || '').trim();

  try {
    let rows;
    if (invoiceId) {
      rows = (await sql`SELECT * FROM receipts WHERE invoice_id = ${Number(invoiceId)} ORDER BY paid_at DESC`).rows;
    } else if (admissionNo) {
      const studentRes = await sql`SELECT id FROM students WHERE admission_no = ${admissionNo}`;
      const student = studentRes.rows[0];
      if (!student) return json({ error: 'No student found with that Institutional Student Number.' }, 404);
      rows = (await sql`
        SELECT r.* FROM receipts r JOIN invoices i ON i.id = r.invoice_id
        WHERE i.student_id = ${student.id} ORDER BY r.paid_at DESC`).rows;
    } else {
      rows = (await sql`SELECT * FROM receipts ORDER BY paid_at DESC LIMIT 50`).rows;
    }

    return json({
      receipts: rows.map((r) => ({
        id: r.id, receiptNo: r.receipt_no, invoiceId: r.invoice_id, amount: Number(r.amount),
        paymentMethod: r.payment_method, paidAt: r.paid_at, revokedAt: r.revoked_at, revocationNote: r.revocation_note,
      })),
    });
  } catch (err) {
    console.error('receipts list error', err);
    return json({ error: 'Could not load receipts: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  const action = body.action || 'record';

  try {
    if (action === 'record') {
      const invoiceId = Number(body.invoiceId);
      const amount = Number(body.amount);
      const paymentMethod = ['cash', 'bank_transfer', 'cheque', 'pos', 'other'].includes(body.paymentMethod) ? body.paymentMethod : 'cash';
      if (!invoiceId || !(amount > 0)) {
        return json({ error: 'invoiceId and a positive amount are required.' }, 400);
      }

      const grant = await hasPermissionFor(sql, staffId, 'finance', 'C', null);
      if (!grant.granted) {
        return json({ error: "Your role does not have authority to record payments. This is a Finance Officer function — no Finance Officer account has been issued yet. See docs/finance-platform.md." }, 403);
      }

      const invoiceRes = await sql`SELECT id, status FROM invoices WHERE id = ${invoiceId}`;
      const invoice = invoiceRes.rows[0];
      if (!invoice) return json({ error: 'No invoice found with that id.' }, 404);
      if (invoice.status === 'cancelled') return json({ error: 'This invoice was cancelled — no further payments can be recorded against it.' }, 400);

      const paidAt = body.paidAt || new Date().toISOString();
      // TD-2: candidate + INSERT retried together on a unique-violation
      // (docs/technical-debt-register.md).
      const receiptOutcome = await generateWithRetryOnConflict(
        sql,
        () => generateReceiptNo(sql, paidAt),
        (no) => sql`
          INSERT INTO receipts (receipt_no, invoice_id, amount, payment_method, paid_at, recorded_by_staff_id)
          VALUES (${no}, ${invoiceId}, ${amount}, ${paymentMethod}, ${paidAt}, ${staffId})
          RETURNING id`
      );
      const receiptNo = receiptOutcome.value;
      const created = receiptOutcome.result;
      const receiptId = created.rows[0].id;

      const newStatus = await recomputeInvoiceStatus(sql, invoiceId);

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'receipt', targetId: receiptId,
        reason: body.reason || null, metadata: { invoiceId, amount, paymentMethod, receiptNo, newStatus },
      });

      const origin = env.SITE_ORIGIN || new URL(request.url).origin;
      return json({
        ok: true, receiptId, receiptNo, invoiceStatus: newStatus,
        verifyUrl: `${origin}/verify-receipt/?ref=${encodeURIComponent(receiptNo)}`,
        qrUrl: `/api/finance/receipt-qr?ref=${encodeURIComponent(receiptNo)}`,
      });
    }

    if (action === 'revoke') {
      const receiptId = Number(body.receiptId);
      if (!receiptId) return json({ error: 'receiptId is required.' }, 400);

      const grant = await hasPermissionFor(sql, staffId, 'finance', 'E', null);
      if (!grant.granted) {
        return json({ error: "Your role does not have authority to revoke receipts. See docs/finance-platform.md." }, 403);
      }

      const receiptRes = await sql`SELECT invoice_id FROM receipts WHERE id = ${receiptId}`;
      const receipt = receiptRes.rows[0];
      if (!receipt) return json({ error: 'No receipt found with that id.' }, 404);

      await sql`UPDATE receipts SET revoked_at = now(), revocation_note = ${body.reason || null} WHERE id = ${receiptId}`;
      const newStatus = await recomputeInvoiceStatus(sql, receipt.invoice_id);

      await logStaffEvent(sql, {
        actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'receipt', targetId: receiptId,
        reason: body.reason || null, metadata: { action: 'revoke', newStatus },
      });
      return json({ ok: true, invoiceStatus: newStatus });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error('receipts write error', err);
    return json({ error: 'Could not save that receipt: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
