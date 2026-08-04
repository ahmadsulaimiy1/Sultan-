// Reference-number generation for the Stage 3 Graduation Document
// ecosystem (docs/shrs-master-graduation-document-specification.md §3.3,
// §4). Extends the exact SHRS-<TYPE>-<year>-<seq6> scheme already proven
// live by functions/api/portal/staff/registrar/certificates.js's own
// generateReferenceNo() — same non-atomic, accepted-race COUNT(*)+1
// counter, correct for SHRS's real document volume — but scoped to the
// new `graduation_documents` table rather than `certificates`, since the
// two are deliberately separate lifecycles (spec §19).
const TYPE_ABBREVIATIONS = {
  certificate: 'CERT', transcript: 'TRAN', diploma_supplement: 'SUPP', statement_of_results: 'SOR',
  provisional_certificate: 'PROV', testimonial: 'TEST', character_certificate: 'CHAR',
  clearance_certificate: 'CLR', alumni_registration: 'ALUM', award: 'AWD', special_distinction: 'DIST',
  board_award: 'BRD', founder_ceo_award: 'FCA', hifz_completion: 'HIFZ', islamiyyah_completion: 'ISLM',
};

export function abbreviateDocumentType(documentType) {
  const known = TYPE_ABBREVIATIONS[String(documentType).toLowerCase().replace(/\s+/g, '_')];
  if (known) return known;
  return String(documentType).replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase() || 'DOC';
}

export async function generateDocumentReferenceNo(sql, documentType, issuedAt) {
  const year = new Date(issuedAt).getFullYear();
  const abbr = abbreviateDocumentType(documentType);
  const countRes = await sql`
    SELECT COUNT(*)::int AS n FROM graduation_documents
    WHERE document_type = ${documentType} AND EXTRACT(YEAR FROM issued_at) = ${year}`;
  const seq = (countRes.rows[0].n || 0) + 1;
  return `SHRS-${abbr}-${year}-${String(seq).padStart(6, '0')}`;
}

// The Permanent Verification ID (spec §3.2) — shared by every document
// issued for the SAME graduation event, distinct from any one
// document's own reference number. Generated once, when the first
// document for a graduation_record is issued; every sibling document
// reuses the value already stored on that record's earliest
// graduation_documents row.
export async function getOrCreateVerificationId(sql, graduationRecordId, graduationSession) {
  const existing = await sql`
    SELECT verification_id FROM graduation_documents
    WHERE graduation_record_id = ${graduationRecordId} ORDER BY created_at ASC LIMIT 1`;
  if (existing.rows[0]) return existing.rows[0].verification_id;

  const countRes = await sql`
    SELECT COUNT(DISTINCT verification_id)::int AS n FROM graduation_documents gd
    JOIN graduation_records gr ON gr.id = gd.graduation_record_id
    WHERE gr.graduation_session = ${graduationSession}`;
  const seq = (countRes.rows[0].n || 0) + 1;
  const sessionSlug = String(graduationSession).replace(/[^a-z0-9]/gi, '');
  return `SHRS-VER-${sessionSlug}-${String(seq).padStart(6, '0')}`;
}
