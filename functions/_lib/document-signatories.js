// Document Signatory Eligibility Map — Master Graduation Document
// Specification §13.2. Names, per document type, the minimum role(s)
// whose signature must be on file before generation is permitted.
// institutionScoped roles (e.g. PRIN, the shared role code covering
// Principal/Head Teacher/Ra'ees/Mudeer across all four schools, per
// docs/role-permission-matrix.md) resolve within the document's own
// institution; others (REG, BRD, EXE) are single, institution-wide
// offices and resolve globally.
//
// If a required role has no active holder, or an active holder with no
// staff_signatures row on file, generation fails with a named
// SignatoryVacancyError — never a blank signature line, never a
// silently-omitted signatory. This is the same vacancy-as-a-first-class-
// state principle already governing the graduation_clearances chain.
import { staffForRole } from './notifications.js';

export const DOCUMENT_SIGNATORIES = {
  certificate: [
    { role: 'PRIN', institutionScoped: true, label: "Institution Principal / Head Teacher / Ra'ees / Mudeer" },
    { role: 'REG', institutionScoped: false, label: 'Registrar' },
  ],
  transcript: [
    { role: 'REG', institutionScoped: false, label: 'Registrar' },
  ],
  diploma_supplement: [
    { role: 'REG', institutionScoped: false, label: 'Registrar' },
  ],
  provisional_certificate: [
    { role: 'REG', institutionScoped: false, label: 'Registrar' },
  ],
  testimonial: [
    { role: 'PRIN', institutionScoped: true, label: "Institution Principal / Head Teacher / Ra'ees / Mudeer" },
  ],
  character_certificate: [
    { role: 'PRIN', institutionScoped: true, label: "Institution Principal / Head Teacher / Ra'ees / Mudeer" },
  ],
  clearance_certificate: [
    { role: 'REG', institutionScoped: false, label: 'Registrar' },
  ],
  board_award: [
    { role: 'BRD', institutionScoped: false, label: 'Board Chair' },
  ],
  founder_ceo_award: [
    { role: 'EXE', institutionScoped: false, label: 'Founder & CEO' },
  ],
  alumni_registration: [
    { role: 'REG', institutionScoped: false, label: 'Registrar' },
  ],
};

export class SignatoryVacancyError extends Error {
  constructor(documentType, missing) {
    super(`Cannot generate this ${documentType}: the required signatory office is vacant or has no signature on file — ${missing.map((m) => m.label).join(', ')}. Fill the office (or record its signature under My Digital Signature) before this document can be issued.`);
    this.name = 'SignatoryVacancyError';
    this.missing = missing;
  }
}

// Resolves every required signatory for a document type, snapshotting
// each one's *current* stored signature — this snapshot, not a live
// reference, is what graduation_documents.signatories stores (§13.3), so
// a later change to that staff member's signature never retroactively
// alters an already-issued document.
export async function resolveSignatories(sql, documentType, institutionId) {
  const required = DOCUMENT_SIGNATORIES[documentType];
  if (!required || !required.length) return [];

  const resolved = [];
  const missing = [];

  for (const req of required) {
    const scopeInstitutionId = req.institutionScoped ? institutionId : null;
    const staffIds = await staffForRole(sql, req.role, scopeInstitutionId);
    if (!staffIds.length) {
      missing.push(req);
      continue;
    }
    let signed = null;
    for (const staffId of staffIds) {
      const sigRes = await sql`
        SELECT ss.signature_type, ss.typed_name, ss.image_data, ss.title_line, st.full_name, st.id AS staff_id
        FROM staff_signatures ss
        JOIN staff st ON st.id = ss.staff_id
        WHERE ss.staff_id = ${staffId} AND ss.is_active = true`;
      if (sigRes.rows[0]) { signed = sigRes.rows[0]; break; }
    }
    if (!signed) {
      missing.push(req);
      continue;
    }
    resolved.push({
      role: req.role, label: req.label, staffId: signed.staff_id, staffName: signed.full_name,
      signatureType: signed.signature_type, typedName: signed.typed_name, imageData: signed.image_data,
      titleLine: signed.title_line,
    });
  }

  if (missing.length) throw new SignatoryVacancyError(documentType, missing);
  return resolved;
}
