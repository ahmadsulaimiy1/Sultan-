// Document Signatory Eligibility Map — Master Graduation Document
// Specification §13.2. Names, per document type, the minimum role(s)
// whose signature must be on file before generation is permitted.
// institutionScoped roles (e.g. PRIN, the shared role code covering
// Principal/Head Teacher across all schools, per
// docs/role-permission-matrix.md) resolve within the document's own
// institution; others (REG, BRD, EXE) are single, institution-wide
// offices and resolve globally. A requirement may instead name
// `officeSlug` (e.g. 'examinations') for an authority that is
// office-appointed rather than role-coded — Examinations & Records has
// no `roles` table entry of its own, only the same office-appointment
// mechanism functions/_lib/graduation-workflow.js's STAGE_DEFINITIONS
// already use for that office.
//
// If a required role/office has no active holder, or an active holder
// with no staff_signatures row on file, generation fails with a named
// SignatoryVacancyError — never a blank signature line, never a
// silently-omitted signatory. This is the same vacancy-as-a-first-class-
// state principle already governing the graduation_clearances chain.
import { staffForRole, staffForOffice } from './notifications.js';
import { resolveOfficeId } from './graduation-workflow.js';

export const DOCUMENT_SIGNATORIES = {
  certificate: [
    { role: 'PRIN', institutionScoped: true, label: "Institution Principal / Head Teacher" },
    { role: 'REG', institutionScoped: false, label: 'Registrar' },
  ],
  // §13.2 names "Registrar + Examinations & Records" — Examinations is
  // an office-appointed authority (see the officeSlug note above), not
  // a roles-table role code.
  transcript: [
    { role: 'REG', institutionScoped: false, label: 'Registrar' },
    { officeSlug: 'examinations', label: 'Examinations & Records' },
  ],
  diploma_supplement: [
    { role: 'REG', institutionScoped: false, label: 'Registrar' },
  ],
  // §16.8: "visually closer to final Certificate... says the student
  // has fully qualified" — carries the same signature authority as the
  // real Certificate, distinguished by its own PROV reference family
  // and visible banner rather than by a lesser signature block.
  provisional_certificate: [
    { role: 'PRIN', institutionScoped: true, label: "Institution Principal / Head Teacher" },
    { role: 'REG', institutionScoped: false, label: 'Registrar' },
  ],
  // §16.8: "Examinations & Records signature only" — an interim,
  // still-in-progress document, deliberately lighter authority than
  // the final Transcript or Certificate.
  statement_of_results: [
    { officeSlug: 'examinations', label: 'Examinations & Records' },
  ],
  testimonial: [
    { role: 'PRIN', institutionScoped: true, label: "Institution Principal / Head Teacher" },
  ],
  character_certificate: [
    { role: 'PRIN', institutionScoped: true, label: "Institution Principal / Head Teacher" },
  ],
  clearance_certificate: [
    { role: 'REG', institutionScoped: false, label: 'Registrar' },
  ],
  board_award: [
    { role: 'BRD', institutionScoped: false, label: 'Board Chair' },
  ],
  founder_ceo_award: [
    { role: 'EXE', institutionScoped: false, label: 'Founder & Head of Schools' },
  ],
  alumni_registration: [
    { role: 'REG', institutionScoped: false, label: 'Registrar' },
  ],
  graduation_register: [
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

// Resolves the staff IDs eligible to satisfy one requirement — a role
// code (staffForRole, optionally institution-scoped) or an office slug
// (staffForOffice, via the office-appointment mechanism graduation-
// workflow.js's STAGE_DEFINITIONS already use for Examinations/Academic/
// Library/ICT). Shared by both resolveSignatories() and
// resolveCertificateSignatories() below so the two never drift.
async function eligibleStaffIds(sql, req, institutionId) {
  if (req.officeSlug) {
    const officeId = await resolveOfficeId(sql, req.officeSlug);
    if (officeId == null) return [];
    return staffForOffice(sql, officeId);
  }
  const scopeInstitutionId = req.institutionScoped ? institutionId : null;
  return staffForRole(sql, req.role, scopeInstitutionId);
}

// Resolves one requirement to its current stored signature, or null if
// the office/role is vacant or has no signature on file. Snapshotting
// the signature's *current* form (not a live reference) is what
// graduation_documents.signatories stores (§13.3), so a later change to
// that staff member's signature never retroactively alters an
// already-issued document.
async function resolveOneSignatory(sql, req, institutionId) {
  const staffIds = await eligibleStaffIds(sql, req, institutionId);
  for (const staffId of staffIds) {
    const sigRes = await sql`
      SELECT ss.signature_type, ss.typed_name, ss.image_data, ss.title_line, st.full_name, st.id AS staff_id
      FROM staff_signatures ss
      JOIN staff st ON st.id = ss.staff_id
      WHERE ss.staff_id = ${staffId} AND ss.is_active = true`;
    if (sigRes.rows[0]) {
      const signed = sigRes.rows[0];
      return {
        role: req.role || null, label: req.label, staffId: signed.staff_id, staffName: signed.full_name,
        signatureType: signed.signature_type, typedName: signed.typed_name, imageData: signed.image_data,
        titleLine: signed.title_line,
      };
    }
  }
  return null;
}

// Resolves every required signatory for a document type against the
// static DOCUMENT_SIGNATORIES map.
export async function resolveSignatories(sql, documentType, institutionId) {
  const required = DOCUMENT_SIGNATORIES[documentType];
  if (!required || !required.length) return [];

  const resolved = [];
  const missing = [];
  for (const req of required) {
    const signed = await resolveOneSignatory(sql, req, institutionId);
    if (signed) resolved.push(signed); else missing.push(req);
  }

  if (missing.length) throw new SignatoryVacancyError(documentType, missing);
  return resolved;
}

// The Graduation Certificate's signature block is not static (spec
// §16.1): it always carries PRIN + REG (the base 'certificate' map
// entry), PLUS the Vice Principal (Academic), Vice Principal
// (Administration), and Founder & Head of Schools ONLY where that specific
// graduation record's own graduation_clearances shows the stage as
// genuinely 'cleared' — never 'not_applicable' or still pending. A
// Certificate must never claim an authority that didn't actually sign
// off on this particular graduate. If a stage that WAS cleared has no
// signature on file for the staff member who cleared it (or the role
// is now vacant), generation fails with SignatoryVacancyError exactly
// like every other document type — never a silently-dropped signatory.
const CERTIFICATE_CONDITIONAL_STAGES = [
  { stageCode: 'vp_academic', role: 'VPAC', institutionScoped: false, label: 'Vice Principal (Academic)' },
  { stageCode: 'vp_administration', role: 'VPAD', institutionScoped: false, label: 'Vice Principal (Administration)' },
  { stageCode: 'founder', role: 'EXE', institutionScoped: false, label: 'Founder & Head of Schools' },
];

export async function resolveCertificateSignatories(sql, institutionId, clearanceRows) {
  const base = await resolveSignatories(sql, 'certificate', institutionId); // throws on PRIN/REG vacancy

  const resolved = [];
  const missing = [];
  for (const cond of CERTIFICATE_CONDITIONAL_STAGES) {
    const row = (clearanceRows || []).find((r) => r.stage_code === cond.stageCode);
    if (!row || row.status !== 'cleared') continue; // never exercised on this record — never claimed
    const signed = await resolveOneSignatory(sql, cond, institutionId);
    if (signed) resolved.push(signed); else missing.push(cond);
  }

  if (missing.length) throw new SignatoryVacancyError('certificate', missing);
  return [...base, ...resolved];
}
