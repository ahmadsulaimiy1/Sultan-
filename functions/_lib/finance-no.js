// Invoice/receipt numbering for the Finance Platform (Imperial Digital
// Campus Directive, Priority 3) — same auto-generated, never
// staff-invented convention as certificate reference numbers
// (functions/api/portal/staff/registrar/certificates.js's
// generateReferenceNo): SHR-INV-<year>-<seq> / SHR-RCT-<year>-<seq>.
// receipt_no doubles as the public verification key, exactly like a
// certificate's reference_no — see functions/api/finance/verify-receipt.js.
export async function generateInvoiceNo(sql, issuedAt) {
  const year = new Date(issuedAt).getFullYear();
  const countRes = await sql`
    SELECT COUNT(*)::int AS n FROM invoices WHERE EXTRACT(YEAR FROM created_at) = ${year}`;
  const seq = (countRes.rows[0].n || 0) + 1;
  return `SHR-INV-${year}-${String(seq).padStart(6, '0')}`;
}

export async function generateReceiptNo(sql, paidAt) {
  const year = new Date(paidAt).getFullYear();
  const countRes = await sql`
    SELECT COUNT(*)::int AS n FROM receipts WHERE EXTRACT(YEAR FROM created_at) = ${year}`;
  const seq = (countRes.rows[0].n || 0) + 1;
  return `SHR-RCT-${year}-${String(seq).padStart(6, '0')}`;
}
