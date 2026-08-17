// The canonical institution registry — increment one of the
// multi-institution platform architecture (Official Institutional
// Nomenclature Directive, 2026-08-05; docs/role-permission-matrix.md §5).
//
// Before this file existed, institution identity lived in five
// uncoordinated vocabularies: the institutions table's internal names,
// classes.institution free text, certificate display names
// (INSTITUTIONS_BY_PROGRAMME, RC_PROGRAMMES[*].school), the register's
// institution_name strings, and two independent short-code maps in
// identity-no.js. Adding an institution meant finding every one of
// them. This registry is now the single place an institution's
// identity is WRITTEN; the legacy shapes are DERIVED from it below,
// byte-identical to the literals they replace (pinned by
// scripts/test-institution-registry.mjs, which carries the original
// literals as golden values).
//
// What each field is, stated precisely:
//   dbName        — institutions.name in the database, and the string
//                   classes.institution must match verbatim (the
//                   string-equality join is acknowledged schema debt;
//                   see sql/schema.sql's institutions header).
//   displayName   — the certificate's formal display register (what a
//                   sheet prints as the issuing school).
//   admissionCode — the SHRS-<CODE>-YY admission-number segment.
//   staffUnitCode — the staff identity number's UNIT segment. NP vs
//                   NPS for Nursery and Primary is DELIBERATE: the two
//                   numbering families are independent by design
//                   (functions/_lib/identity-no.js documents this) —
//                   a registry must preserve both, never unify them.
//   programmes    — programme codes belonging to this institution.
//   rcFamily      — rendered by the Royal College master (v1.1) rather
//                   than the frozen Islamic-stage master (v1.0).
//   portalIssuable— the Registrar's portal roster route may ISSUE these
//                   programmes (reprints work for every code
//                   regardless). JSS/SS/QUR remain script-issued under
//                   their own Principal approval chain.
//
// Known, deliberate gap carried honestly: the public site names FIVE
// institutions; the Online & Distance Learning School has an office but
// no institutions row, no numbering codes, and no certificate family
// yet. It is absent here because it is absent everywhere downstream —
// adding it is a real decision (row + codes + permissions), not a
// registry entry alone.

export const UMBRELLA = {
  en: 'Sultan Hanafi Royal Schools',
  ar: 'مدارس السلطان حنفي الملكية',
};

export const INSTITUTIONS = {
  islamic_arabic_studies: {
    key: 'islamic_arabic_studies',
    dbName: 'Islamic and Arabic Studies',
    displayName: 'Sultan Hanafi School of Islamic and Arabic Studies',
    admissionCode: 'IAS',
    staffUnitCode: 'IAS',
    programmes: ['TMH', 'IBT', 'IDD', 'THN'],
    rcFamily: false,
    portalIssuable: true,
  },
  nursery_primary: {
    key: 'nursery_primary',
    dbName: 'Nursery and Primary',
    displayName: 'Sultan Hanafi Nursery and Primary School',
    admissionCode: 'NP',
    staffUnitCode: 'NPS',
    programmes: ['NUR', 'PRY'],
    rcFamily: true,
    portalIssuable: true,
  },
  royal_college: {
    key: 'royal_college',
    dbName: 'Royal College',
    displayName: 'Sultan Hanafi Royal College',
    admissionCode: 'RC',
    staffUnitCode: 'RC',
    programmes: ['JSS', 'SS'],
    rcFamily: true,
    portalIssuable: false,
  },
  quran_college: {
    key: 'quran_college',
    dbName: "Qur'an College",
    displayName: 'Sultan Hanafi Qur’an College',
    displayNameAr: 'كلية السلطان حنفي للقرآن',
    admissionCode: 'QC',
    staffUnitCode: 'QC',
    programmes: ['QUR'],
    rcFamily: true,
    portalIssuable: false,
  },
};

const ALL = Object.values(INSTITUTIONS);

// ── Lookups ────────────────────────────────────────────────────────
const BY_PROGRAMME = {};
for (const inst of ALL) for (const p of inst.programmes) BY_PROGRAMME[p] = inst;

export function institutionForProgramme(programmeCode) {
  return BY_PROGRAMME[String(programmeCode || '').toUpperCase()] || null;
}
export function institutionByDbName(dbName) {
  return ALL.find((i) => i.dbName === dbName) || null;
}

// ── Derived legacy shapes (byte-identical to the literals replaced) ─
// The portal issuance route's programme → { internalName, displayName }.
export const INSTITUTIONS_BY_PROGRAMME = Object.fromEntries(
  ALL.filter((i) => i.portalIssuable)
    .flatMap((i) => i.programmes.map((p) => [p, { internalName: i.dbName, displayName: i.displayName }]))
);
// Royal-College-family codes the portal route may issue.
export const PORTAL_ROYAL_COLLEGE_CODES = ALL
  .filter((i) => i.rcFamily && i.portalIssuable)
  .flatMap((i) => i.programmes);
// Admission-number school codes (identity-no.js).
export const SCHOOL_CODE_BY_INSTITUTION_NAME = Object.fromEntries(
  ALL.map((i) => [i.dbName, i.admissionCode])
);
// Staff-number UNIT codes (identity-no.js) — NP vs NPS preserved.
export const UNIT_BY_INSTITUTION_NAME = Object.fromEntries(
  ALL.map((i) => [i.dbName, i.staffUnitCode])
);
// The institutions-table seed rows (setup.js).
export const INSTITUTION_SEED_NAMES = ALL.map((i) => i.dbName);
