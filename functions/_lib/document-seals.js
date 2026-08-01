// Seal Management Architecture — Design System v2 / Executive Directive
// point 4 ("build the complete seal management architecture; allow
// placeholder records internally; require real institutional seals
// before final issuance of documents that depend on them").
//
// Every office/institution that could ever need to seal a document has
// an explicit registry entry below, whether or not a real asset has
// been supplied yet. This is the difference between "we haven't built
// this" and "we built it, and this specific office's asset is still
// pending" — the system is fully ready the moment a real seal image
// arrives; nothing about the issuance flow needs to change, only the
// registry entry's `status` and `path`.
//
// Real, client-supplied seal assets (Master Graduation Document
// Specification §12) are never fabricated — a `status: 'placeholder'`
// entry NEVER carries a `path`; `resolveSeal()` returns null for it
// exactly as it did before this registry existed, and
// `requireRealSeal()` is the enforcement point future FINAL-issuance
// document types (Testimonial, Character Certificate, Certificate)
// call before completing generation, so a placeholder can be used for
// internal preview/drafting but never for an issued original.
//
// `institutions.name` values match the DB exactly (see
// functions/api/portal/setup.js's INSERT INTO institutions):
// 'Nursery & Primary', 'Royal College', 'Islamic & Arabic Studies',
// 'Qur'an College'.

export const SEAL_REGISTRY = {
  REG: {
    label: 'Office of the Registrar',
    status: 'real',
    path: '/assets/images/seals/registrar-office-seal.jpg',
  },
  'PRIN:Islamic & Arabic Studies': {
    label: "Office of the Ra'ees, School of Islamic and Arabic Studies",
    status: 'real',
    path: '/assets/images/seals/raees-islamic-arabic-studies-seal.jpg',
  },
  "PRIN:Qur'an College": {
    label: 'Office of the Mudeer, Qur\'an College',
    status: 'real',
    path: '/assets/images/seals/mudeer-quran-college-seal.jpg',
  },
  'PRIN:Royal College': {
    label: 'Office of the Principal, Royal College',
    status: 'placeholder',
    path: null,
  },
  'PRIN:Nursery & Primary': {
    label: 'Office of the Head Teacher, Nursery & Primary',
    status: 'placeholder',
    path: null,
  },
  EXE: {
    label: 'Founder & CEO',
    status: 'placeholder',
    path: null,
  },
  BRD: {
    label: 'Board of Trustees',
    status: 'placeholder',
    path: null,
  },
  GENERAL: {
    label: 'General Institutional Seal',
    status: 'real',
    path: '/assets/images/seals/institutional-seal-general.jpg',
  },
  CEREMONIAL: {
    label: 'Ceremonial Institutional Seal (gold medallion)',
    status: 'real',
    path: '/assets/images/seals/institutional-seal-gold.jpg',
  },
};

function sealKey(role, institutionName) {
  if (role === 'PRIN' && institutionName) return `PRIN:${institutionName}`;
  return role;
}

// Looks up the full registry record for a role/institution — status
// included, so callers can distinguish "no real asset yet" from
// "this office was never registered at all."
export function lookupSeal({ role, institutionName }) {
  const key = sealKey(role, institutionName);
  return key ? SEAL_REGISTRY[key] || null : null;
}

// Resolves the correct seal PATH for a document, given its primary
// signatory. Returns null — never a guess, never a placeholder graphic
// — when the registry entry's status isn't 'real', so callers fall
// back to the shared template shell's "Reserved" placeholder exactly
// as before this registry existed.
export function resolveSeal({ role, institutionName }) {
  const entry = lookupSeal({ role, institutionName });
  return entry && entry.status === 'real' ? entry.path : null;
}

export class SealPendingError extends Error {
  constructor(entry, documentType) {
    super(`Cannot finally issue this ${documentType}: the required seal (${entry ? entry.label : 'unregistered office'}) is a ${entry ? entry.status : 'unregistered'} record — a real seal asset must be supplied before final issuance. Internal preview/drafting may still proceed with the "Reserved" placeholder.`);
    this.name = 'SealPendingError';
    this.entry = entry;
  }
}

// The enforcement point for FINAL issuance (as opposed to internal
// preview/drafting) — future document types whose seal is not yet a
// real asset call this before writing the issued graduation_documents
// row, so a placeholder office is honestly blocked from producing a
// final original rather than silently issuing one with a missing seal.
// Alumni Registration (REG, already 'real') never trips this; it
// exists now so Class B document types built next don't need to
// re-invent this check.
export function requireRealSeal({ role, institutionName, documentType }) {
  const entry = lookupSeal({ role, institutionName });
  if (!entry || entry.status !== 'real') {
    throw new SealPendingError(entry, documentType);
  }
  return entry;
}
