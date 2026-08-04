// Invoice/receipt numbering for the Finance Platform (Imperial Digital
// Campus Directive, Priority 3; prefix and date format upgraded under the
// Institutional Identity Number Architecture Directive) — same
// auto-generated, never staff-invented convention as certificate
// reference numbers (functions/api/portal/staff/registrar/certificates.js's
// generateReferenceNo): SHRS-INV-<YYMMDD>-<seq> / SHRS-FIN-<YYMMDD>-<seq>,
// e.g. a receipt paid on 31 July 2026 reads SHRS-FIN-260731-000152 —
// matching the directive's Receipt Number example format. The sequence
// still resets per calendar year (COUNT(*)+1 scoped by EXTRACT(YEAR...),
// same low-volume convention as generateAdmissionNo in identity-no.js) —
// only the printed date segment changed, from year-only to the full
// YYMMDD an external auditor expects. receipt_no doubles as the public
// verification key, exactly like a certificate's reference_no — see
// functions/api/finance/verify-receipt.js.
function formatYYMMDD(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return yy + mm + dd;
}

export async function generateInvoiceNo(sql, issuedAt) {
  const date = new Date(issuedAt);
  const year = date.getFullYear();
  const countRes = await sql`
    SELECT COUNT(*)::int AS n FROM invoices WHERE EXTRACT(YEAR FROM created_at) = ${year}`;
  const seq = (countRes.rows[0].n || 0) + 1;
  return `SHRS-INV-${formatYYMMDD(date)}-${String(seq).padStart(6, '0')}`;
}

export async function generateReceiptNo(sql, paidAt) {
  const date = new Date(paidAt);
  const year = date.getFullYear();
  const countRes = await sql`
    SELECT COUNT(*)::int AS n FROM receipts WHERE EXTRACT(YEAR FROM created_at) = ${year}`;
  const seq = (countRes.rows[0].n || 0) + 1;
  return `SHRS-FIN-${formatYYMMDD(date)}-${String(seq).padStart(6, '0')}`;
}
