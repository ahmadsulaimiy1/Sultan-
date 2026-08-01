// Real, client-supplied seal assets (Master Graduation Document
// Specification §12) — never fabricated. This module is the one place
// that maps an institution/office to its actual seal image, so future
// document types (Testimonial, Character Certificate, Certificate —
// each requiring the signing school head's own seal per §13.2) share a
// single source of truth instead of re-deciding this per endpoint.
//
// `institutions.name` values match the DB exactly (see
// functions/api/portal/setup.js's INSERT INTO institutions):
// 'Nursery & Primary', 'Royal College', 'Islamic & Arabic Studies',
// 'Qur'an College'.
export const INSTITUTION_SEAL = {
  'Islamic & Arabic Studies': '/assets/images/seals/raees-islamic-arabic-studies-seal.jpg',
  "Qur'an College": '/assets/images/seals/mudeer-quran-college-seal.jpg',
  // 'Royal College' and 'Nursery & Primary': no Principal/Head Teacher
  // seal supplied yet — intentionally absent rather than guessed at.
};

// Seals not tied to a specific school — the Registrar's Office (global,
// not institution-scoped) and the general institutional stamp used when
// no more specific office seal applies.
export const OFFICE_SEAL = {
  REG: '/assets/images/seals/registrar-office-seal.jpg',
};

export const GENERAL_INSTITUTIONAL_SEAL = '/assets/images/seals/institutional-seal-general.jpg';
export const CEREMONIAL_GOLD_SEAL = '/assets/images/seals/institutional-seal-gold.jpg';

// Resolves the correct seal for a document, given its primary
// signatory. Returns null (never a guess) when no real asset exists yet
// for that role/institution — callers fall back to the shared
// template shell's "Reserved" placeholder in that case, exactly as
// before any seal existed.
export function resolveSeal({ role, institutionName }) {
  if (role === 'PRIN' && institutionName && INSTITUTION_SEAL[institutionName]) {
    return INSTITUTION_SEAL[institutionName];
  }
  if (role && OFFICE_SEAL[role]) return OFFICE_SEAL[role];
  return null;
}
