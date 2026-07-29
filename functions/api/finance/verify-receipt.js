// Public receipt verification — no session required, mirroring
// functions/api/certificates/verify.js exactly: anyone holding a
// physical or digital receipt can confirm it's genuine without a
// Digital Campus account, looked up by the same receipt_no already
// printed on it. No separate secret token, for the same reason as
// certificates: receipt numbers are staff-assigned at issuance, never
// self-service, so nothing here lets a stranger register a fake one —
// and the fields returned (amount, date, invoice reference, status)
// are exactly what a receipt is meant to prove to whoever is asking.
import { getSql } from '../../_lib/db.js';
import { json } from '../../_lib/http.js';

export async function onRequestGet({ request, env }) {
  const sql = getSql(env);
  if (!sql) return json({ error: 'Verification is not available right now — no database is linked.' }, 500);

  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();
  if (!ref) return json({ error: 'Provide a receipt number.' }, 400);

  try {
    const res = await sql`
      SELECT r.receipt_no, r.amount, r.payment_method, r.paid_at, r.revoked_at, r.revocation_note,
             i.invoice_no, i.term, s.full_name AS student_full_name, inst.name AS institution_name
      FROM receipts r
      JOIN invoices i ON i.id = r.invoice_id
      JOIN students s ON s.id = i.student_id
      JOIN institutions inst ON inst.id = i.institution_id
      WHERE r.receipt_no = ${ref}`;
    const row = res.rows[0];
    if (!row) return json({ ok: true, found: false });

    return json({
      ok: true,
      found: true,
      receiptNo: row.receipt_no,
      invoiceNo: row.invoice_no,
      recipientName: row.student_full_name,
      institution: row.institution_name,
      term: row.term,
      amount: Number(row.amount),
      paymentMethod: row.payment_method,
      paidAt: row.paid_at,
      status: row.revoked_at ? 'revoked' : 'active',
      revokedAt: row.revoked_at,
      revocationNote: row.revoked_at ? row.revocation_note : null,
    });
  } catch (err) {
    console.error('receipt verify error', err);
    return json({ error: 'Could not complete verification: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
