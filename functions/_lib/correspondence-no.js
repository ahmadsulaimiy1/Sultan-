// Reference-number generation for office_correspondence — same
// non-atomic, accepted-race COUNT(*)+1 counter already proven correct
// at this project's real document volume by graduation-document-no.js,
// scoped to its own table since correspondence is a separate lifecycle
// from certificates and graduation documents.
const TYPE_ABBREVIATIONS = {
  letter: 'LTR', memo: 'MEMO', circular: 'CIRC', notice: 'NOTE',
  report: 'RPT', minutes: 'MIN', appointment_letter: 'APPT',
  warning_letter: 'WARN', promotion_letter: 'PROM', invitation: 'INVT',
  press_release: 'PRES', proposal: 'PROP',
};

export function abbreviateCorrespondenceType(documentType) {
  return TYPE_ABBREVIATIONS[documentType] || 'DOC';
}

export async function generateCorrespondenceReferenceNo(sql, documentType, issuedAt) {
  const year = new Date(issuedAt).getFullYear();
  const abbr = abbreviateCorrespondenceType(documentType);
  const countRes = await sql`
    SELECT COUNT(*)::int AS n FROM office_correspondence
    WHERE document_type = ${documentType} AND EXTRACT(YEAR FROM issued_at) = ${year}`;
  const seq = (countRes.rows[0].n || 0) + 1;
  return `SHRS-${abbr}-${year}-${String(seq).padStart(6, '0')}`;
}
