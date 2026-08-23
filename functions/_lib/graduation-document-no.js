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
// issued for the SAME graduation event, distinct from any one document's
// own reference number. Generated once, when the first document for a
// graduation_record is issued; every sibling document reuses the value.
//
// Collision-safe by construction (StromeX identifier-trust requirement,
// stromex/editorial-bible/16-ai-operating-constitution.md §16.18), not by
// convention — this used to be COUNT(DISTINCT verification_id)+1 with no
// UNIQUE constraint anywhere backing it, the one identifier scheme in this
// codebase that could collide SILENTLY: two students' first documents,
// issued concurrently in the same graduation_session, could both read the
// same count before either committed and mint the SAME "permanent"
// verification ID for two different children. graduation_verification_ids
// (PRIMARY KEY on graduation_record_id) makes "does this record already
// have one" atomic; graduation_verification_session_seq (claimed via
// UPDATE ... RETURNING, row-locked) makes the per-session number atomic,
// so numbering still starts at 1 per session exactly as the format always
// intended — the fix is to who guarantees uniqueness, not to the shape of
// the identifier itself.
export async function getOrCreateVerificationId(sql, graduationRecordId, graduationSession) {
  const existing = await sql`
    SELECT verification_id FROM graduation_verification_ids
    WHERE graduation_record_id = ${graduationRecordId}`;
  if (existing.rows[0]) return existing.rows[0].verification_id;

  await sql`
    INSERT INTO graduation_verification_session_seq (graduation_session)
    VALUES (${graduationSession})
    ON CONFLICT (graduation_session) DO NOTHING`;
  const bumped = await sql`
    UPDATE graduation_verification_session_seq SET next_seq = next_seq + 1
    WHERE graduation_session = ${graduationSession}
    RETURNING next_seq - 1 AS seq`;
  const seq = bumped.rows[0].seq;
  const sessionSlug = String(graduationSession).replace(/[^a-z0-9]/gi, '');
  const verificationId = `SHRS-VER-${sessionSlug}-${String(seq).padStart(6, '0')}`;

  // ON CONFLICT DO NOTHING: if another request won the race for this exact
  // record between our SELECT above and this INSERT, this claim is simply
  // discarded — the sequence number it used stays permanently unused
  // (a harmless gap), never assigned to anyone else, and never confused
  // with the winner's own id.
  const inserted = await sql`
    INSERT INTO graduation_verification_ids (graduation_record_id, graduation_session, seq, verification_id)
    VALUES (${graduationRecordId}, ${graduationSession}, ${seq}, ${verificationId})
    ON CONFLICT (graduation_record_id) DO NOTHING
    RETURNING verification_id`;
  if (inserted.rows[0]) return inserted.rows[0].verification_id;

  const winner = await sql`
    SELECT verification_id FROM graduation_verification_ids
    WHERE graduation_record_id = ${graduationRecordId}`;
  return winner.rows[0].verification_id;
}
