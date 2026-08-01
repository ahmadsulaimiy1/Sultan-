// The canonical, data-driven implementation of docs/role-permission-matrix.md.
// This file IS the Permission Engine's source of truth — every grant
// below transcribes one cell of that document's §4.1-4.20 tables. There
// is no other copy of "who can do what" anywhere in this codebase, and
// there must never be: a permission decision made anywhere in the
// SHRS Identity & Access Platform calls hasPermission() below, never a
// hardcoded `if (role === 'REG')` branch. If the Matrix document is
// revised, this file is revised in the same change — they are one
// artifact in two forms (governance prose + queryable data), not two
// artifacts that can drift apart.
//
// Permission codes match the Matrix's own legend (§1):
//   V=View C=Create E=Edit D=Delete A=Approve P=Publish X=Export
//   Vf=Verify Ar=Archive MU=Manage Users
//
// `scope` is a human-readable qualifier straight from the Matrix
// (e.g. "own institution", "own assigned classes only"). The engine
// enforces role+area+permission and, where the scope names an
// institution, role+area+permission+institution — anything finer
// (a specific class, a specific student) is NOT something a static
// matrix can resolve; the calling endpoint still does that part, the
// same way admin/hifz-progress.js already validates institution before
// writing. hasPermission() below returns the scope string so callers
// know exactly what finer check, if any, they still owe.

export const SYSTEM_AREAS = {
  student_records:      { name: 'Student Records', ownerOffice: 'Registrar', governingPolicy: 'AC-02' },
  guardian_records:      { name: 'Guardian Records', ownerOffice: 'Registrar', governingPolicy: 'IT-02' },
  staff_records:          { name: 'Staff Records (portal account only, not an HR file)', ownerOffice: null, governingPolicy: null },
  attendance:             { name: 'Attendance', ownerOffice: 'Registrar / Academic Office', governingPolicy: 'SD-05 (Missing)' },
  assessments:            { name: 'Assessments (raw CA/exam score entry)', ownerOffice: 'Teacher, subject to Registrar oversight', governingPolicy: 'AC-01; AC-03 (Missing)' },
  results:                { name: 'Results (finalised per-term aggregate)', ownerOffice: 'Registrar, jointly with Principal', governingPolicy: 'AC-02' },
  report_cards:           { name: 'Report Cards', ownerOffice: 'Registrar', governingPolicy: null },
  hifz_records:           { name: "Hifz & Muraja'ah Records", ownerOffice: "Qur'an College", governingPolicy: 'IQ-01, IQ-03' },
  ijazah_records:         { name: 'Ijazah Records', ownerOffice: "Qur'an College jointly with Registrar", governingPolicy: 'IQ-02' },
  admissions:             { name: 'Admissions', ownerOffice: 'Admissions Officer (proposed), verified by Registrar', governingPolicy: 'PA-05' },
  finance:                { name: 'Finance', ownerOffice: 'Finance Officer (proposed)', governingPolicy: 'FN-01; FN-03/04/05 (Missing)' },
  certificates:           { name: 'Certificates', ownerOffice: 'Registrar', governingPolicy: 'AC-05 (Missing)' },
  transcripts:            { name: 'Transcripts', ownerOffice: 'Registrar', governingPolicy: null },
  graduation_records:     { name: 'Graduation Records', ownerOffice: 'Registrar', governingPolicy: 'docs/shrs-graduation-documentation-system-architecture.md' },
  graduation_clearances:  { name: 'Graduation Approval Workflow', ownerOffice: 'Multi-office chain — see STAGE_DEFINITIONS', governingPolicy: 'docs/shrs-graduation-documentation-system-architecture.md §Stage 2' },
  graduation_documents:   { name: 'Graduation Document Issuance', ownerOffice: 'Registrar', governingPolicy: 'docs/shrs-master-graduation-document-specification.md' },
  communications:         { name: 'Communications', ownerOffice: 'Varies by content and audience', governingPolicy: null },
  policies:               { name: 'Policies', ownerOffice: 'Policy-owning office per policy-code-index.md', governingPolicy: null },
  website_content:        { name: 'Website Content', ownerOffice: 'ICT / Communications function', governingPolicy: null },
  governance_documents:   { name: 'Governance Documents', ownerOffice: 'Board of Trustees', governingPolicy: null },
  analytics:              { name: 'Analytics', ownerOffice: 'Varies', governingPolicy: null },
  system_settings:        { name: 'System Settings', ownerOffice: 'ICT / System Administrator', governingPolicy: null },
  safeguarding:           { name: 'Safeguarding Intelligence', ownerOffice: 'Designated Safeguarding Lead', governingPolicy: 'SW-01, SW-02' },
  behaviour:              { name: 'Behaviour Management', ownerOffice: 'VP Administration', governingPolicy: 'SD-02' },
  teacher_performance:    { name: 'Teacher Performance', ownerOffice: 'Principal, jointly with Academic Affairs', governingPolicy: 'Pending — HR Governance Framework (Staff Handbook §7)' },
  exam_readiness:         { name: 'Examination Readiness (WAEC/NECO)', ownerOffice: 'Registrar, jointly with Academic Affairs', governingPolicy: null },
  arabic_fluency:         { name: 'Arabic Fluency', ownerOffice: 'School of Islamic & Arabic Studies', governingPolicy: null },
  tajweed_compliance:     { name: 'Tajweed Compliance', ownerOffice: "Qur'an College", governingPolicy: 'IQ-01, IQ-03' },
  boarding_intelligence:  { name: 'Boarding Intelligence', ownerOffice: 'Boarding Officer / Wardens', governingPolicy: 'SD-04' },
};

// role, permissions[], scope — one row per Matrix cell-group.
export const MATRIX = {
  student_records: [
    { role: 'REG', permissions: ['V', 'C', 'E', 'Ar', 'X'], scope: null },
    { role: 'AREG', permissions: ['V', 'C', 'E', 'Ar', 'X'], scope: null },
    { role: 'PRIN', permissions: ['V', 'E'], scope: 'own institution' },
    { role: 'ADM', permissions: ['V', 'C'], scope: 'at intake only' },
    { role: 'TCH', permissions: ['V'], scope: 'own classes only' },
    { role: 'MUH', permissions: ['V'], scope: 'own classes only' },
    { role: 'ARB', permissions: ['V'], scope: 'own classes only' },
    { role: 'SA', permissions: ['V'], scope: null },
    { role: 'DSL', permissions: ['V', 'E'], scope: 'safeguarding fields only' },
    { role: 'EXE', permissions: ['V'], scope: 'aggregate only (no individual PII)' },
  ],
  guardian_records: [
    { role: 'REG', permissions: ['V', 'C', 'E', 'X'], scope: null },
    { role: 'AREG', permissions: ['V', 'C', 'E', 'X'], scope: null },
    { role: 'ADM', permissions: ['V', 'C'], scope: 'at intake' },
    { role: 'FIN', permissions: ['V'], scope: 'billing contact fields only' },
  ],
  staff_records: [
    { role: 'SYSADMIN', permissions: ['V', 'MU'], scope: null },
    { role: 'EXE', permissions: ['V'], scope: null },
    { role: 'EXE', permissions: ['MU'], scope: 'approve new accounts only' },
  ],
  attendance: [
    { role: 'TCH', permissions: ['V', 'C', 'E'], scope: 'own class, own period' },
    { role: 'PRIN', permissions: ['V', 'E'], scope: 'own institution / override' },
    { role: 'REG', permissions: ['V', 'E', 'X'], scope: 'correction' },
    { role: 'SA', permissions: ['V'], scope: 'patterns, not raw entry' },
    { role: 'DSL', permissions: ['V'], scope: 'flagged/safeguarding-relevant only' },
    { role: 'EXE', permissions: ['V'], scope: 'aggregate only (Founder Dashboard)' },
  ],
  assessments: [
    { role: 'TCH', permissions: ['V', 'C', 'E'], scope: 'own subject/class' },
    { role: 'MUH', permissions: ['V', 'C', 'E'], scope: 'own subject/class' },
    { role: 'ARB', permissions: ['V', 'C', 'E'], scope: 'own subject/class' },
    { role: 'PRIN', permissions: ['V'], scope: 'own institution' },
    { role: 'REG', permissions: ['V', 'E'], scope: 'correction only, logged' },
  ],
  results: [
    { role: 'REG', permissions: ['V', 'A', 'P', 'X'], scope: null },
    { role: 'PRIN', permissions: ['V', 'A'], scope: 'own institution' },
    { role: 'TCH', permissions: ['V'], scope: "own subject's contribution only" },
  ],
  report_cards: [
    { role: 'PRIN', permissions: ['A'], scope: 'own institution' },
    { role: 'REG', permissions: ['P', 'X'], scope: null },
  ],
  hifz_records: [
    { role: 'MUH', permissions: ['V', 'C', 'E'], scope: 'own assigned students' },
    { role: 'QC-OFF', permissions: ['V', 'C', 'E', 'A'], scope: "institution-wide; A = stage advancement" },
    { role: 'PRIN', permissions: ['V', 'A'], scope: "Qur'an College only; A jointly with QC-OFF" },
    { role: 'REG', permissions: ['V'], scope: 'snapshot only' },
  ],
  ijazah_records: [
    { role: 'QC-OFF', permissions: ['V', 'C'], scope: null },
    { role: 'PRIN', permissions: ['V', 'A', 'Ar'], scope: "Qur'an College only; A jointly with QC-OFF, Ar = revocation with reason" },
    { role: 'REG', permissions: ['V'], scope: null },
  ],
  admissions: [
    { role: 'ADM', permissions: ['V', 'C'], scope: null },
    { role: 'REG', permissions: ['V', 'A', 'X'], scope: 'A = verification, waiting-list' },
    { role: 'PRIN', permissions: ['V', 'A'], scope: 'own institution; A = offer decision, jointly' },
  ],
  finance: [
    { role: 'FIN', permissions: ['V', 'C', 'E', 'X'], scope: null },
    { role: 'EXE', permissions: ['V'], scope: 'aggregate only (Founder Dashboard)' },
    { role: 'EXE', permissions: ['A'], scope: 'refund/waiver/scholarship — no policy exists yet to route this through, flagged' },
  ],
  certificates: [
    { role: 'REG', permissions: ['V', 'C'], scope: 'C = once graduation approved' },
    { role: 'PRIN', permissions: ['V', 'A'], scope: 'own institution; A jointly with REG' },
  ],
  transcripts: [
    { role: 'REG', permissions: ['V', 'C', 'X'], scope: null },
  ],
  graduation_records: [
    { role: 'REG', permissions: ['V', 'C', 'E'], scope: 'review, request corrections, mark under_review/verified — starts the graduation_clearances chain (Stage 2)' },
    { role: 'PRIN', permissions: ['V', 'A'], scope: "own institution; A is now decided as the 'principal' stage of the graduation_clearances chain, not a standalone REG+PRIN lock" },
  ],
  // Graduation Approval Workflow (Stage 2) — the multi-office clearance
  // chain in functions/_lib/graduation-workflow.js. Most stages
  // (academic, examinations, library, ict) are decided via real OFFICE
  // membership (functions/_lib/office-access.js's staffCanActOnOffice),
  // not a role-coded grant here — there is no dedicated role for
  // "Academic Affairs Officer" etc. today, and inventing one with no
  // real appointee would be less honest than reusing the office-holder
  // mechanism this codebase already built for exactly this situation.
  // finance/behaviour stages reuse THOSE areas' existing grants
  // (finance:E, behaviour:A) rather than duplicating them here. This
  // area covers only the stages/visibility that don't fit elsewhere:
  // full-chain visibility, and the two genuinely new authorities the
  // Executive Directive named (VP Academic, VP Administration — both
  // 'proposed' roles, no appointment holder yet) plus the conditional
  // Founder stage.
  graduation_clearances: [
    { role: 'REG', permissions: ['V'], scope: 'full chain visibility (Graduation Control Centre)' },
    { role: 'PRIN', permissions: ['V', 'A'], scope: "own institution; A = the 'principal' stage" },
    { role: 'VPAC', permissions: ['V', 'A'], scope: "all institutions; A = the 'vp_academic' stage — role has no appointment holder yet" },
    { role: 'VPAD', permissions: ['V', 'A'], scope: "all institutions; A = the 'vp_administration' stage — role has no appointment holder yet" },
    { role: 'EXE', permissions: ['V', 'A'], scope: "all institutions; A = the 'founder' stage, only present on records flagged requires_founder_review" },
  ],
  // Graduation Document Issuance (Stage 3) — issuing a real
  // graduation_documents row (docs/shrs-master-graduation-document-
  // specification.md §3, §20 Phase 5). Class C (Alumni Registration,
  // Digital Graduate Profile) is Registrar-issued with no separate
  // approval step, consistent with the spec's own "lowest stakes first"
  // build ordering. Class B's Testimonial/Character Certificate (§16.4,
  // §16.5) extend this with 'A' for PRIN, own institution only — the
  // same joint-authority pattern certificates: already uses, and the
  // natural fit here since §13.2 already names the student's own
  // Principal/Head Teacher/Ra'ees/Mudeer as the sole required signatory
  // for both document types: the office that approves is the office
  // that signs.
  graduation_documents: [
    { role: 'REG', permissions: ['V', 'C', 'X'], scope: null },
    { role: 'PRIN', permissions: ['V', 'A'], scope: 'own institution' },
    { role: 'EXE', permissions: ['V'], scope: 'all institutions' },
  ],
  // E and Ar were added to REG/PRIN/EXE below during the Announcements
  // admin migration (identity-migration-plan.md, Migration Phase D item
  // #4b) — the original C/P-only grants covered authoring and publishing
  // but named no permission for the real update/archive actions
  // admin/announcements.js has always had. Every role here already holds
  // C+P (full authorial + publishing authority over communications); E/Ar
  // complete that same authority's natural lifecycle — edit your own
  // draft before publishing it, archive a notice once it's done — using
  // the same low-privilege codes this Matrix already pairs with C
  // elsewhere for the identical pattern (`finance`'s FIN row: C+E
  // together). TCH does NOT get them: TCH never held C here, and its row
  // is still marked "not yet built."
  communications: [
    { role: 'REG', permissions: ['C', 'E', 'P', 'Ar'], scope: 'school-wide academic notices' },
    { role: 'PRIN', permissions: ['C', 'E', 'P', 'Ar'], scope: 'own institution' },
    { role: 'TCH', permissions: ['P'], scope: 'own class only (not yet built — Teacher Portal item)' },
    { role: 'EXE', permissions: ['C', 'E', 'P', 'Ar'], scope: 'institution-wide announcements' },
  ],
  policies: [
    // No in-system Publish permission exists — git-based, deliberately
    // not modelled as a runtime permission grant. See §4.16.
  ],
  website_content: [
    // Same reality as Policies — git-based, not an in-system permission.
  ],
  governance_documents: [
    // Board of Trustees owns this; git-based, not an in-system permission.
  ],
  analytics: [
    { role: 'EXE', permissions: ['V'], scope: 'all institutions, aggregate (Founder Dashboard, live)' },
    { role: 'PRIN', permissions: ['V'], scope: 'own institution only (not yet built)' },
    { role: 'REG', permissions: ['V'], scope: 'academic-record-scoped (not yet built)' },
  ],
  system_settings: [
    { role: 'SYSADMIN', permissions: ['V', 'E', 'MU'], scope: null },
    { role: 'ICT', permissions: ['V', 'E'], scope: 'operational settings only' },
    { role: 'EXE', permissions: ['V'], scope: null },
    { role: 'EXE', permissions: ['MU'], scope: 'approve new SYSADMIN/staff accounts only' },
  ],
  // Per the Child Protection & Safeguarding Policy (SW-01) §7.3: the
  // safeguarding log is confidential, "separate from academic and
  // disciplinary records, with access restricted to the DSL and Deputy
  // DSLs" — so unlike every other area above, no PRIN/REG/TCH grant
  // exists here at all, by design, not by omission. EXE gets aggregate
  // counts only (no case content), matching the Matrix's existing
  // "aggregate only, no individual PII" convention for executive grants.
  safeguarding: [
    { role: 'DSL', permissions: ['V', 'C', 'E', 'A', 'X'], scope: 'all institutions' },
    { role: 'EXE', permissions: ['V'], scope: 'aggregate only (no individual case content)' },
  ],
  // Escalation line transcribed from the Student Code of Conduct
  // (SD-02 §6/§7): class teacher records minor/repeated matters, VP
  // Administration owns the Code and handles moderate matters, the
  // Principal handles serious matters (own institution only).
  behaviour: [
    { role: 'TCH', permissions: ['V', 'C'], scope: 'own classes only' },
    { role: 'VP', permissions: ['V', 'C', 'E', 'A'], scope: 'all institutions' },
    { role: 'PRIN', permissions: ['V', 'C', 'E', 'A'], scope: 'own institution' },
    { role: 'EXE', permissions: ['V'], scope: 'aggregate only (no individual case content)' },
  ],
  // No performance-management policy exists yet (Staff Handbook §7),
  // so this scoping is a reasonable default — Principal owns their own
  // institution's teachers, VP mirrors that authority, a teacher can
  // see only their own record — not a transcription of an adopted
  // document the way Safeguarding/Behaviour are.
  teacher_performance: [
    { role: 'PRIN', permissions: ['V', 'C', 'E', 'A'], scope: 'own institution' },
    { role: 'VP', permissions: ['V', 'C', 'E', 'A'], scope: 'all institutions' },
    { role: 'TCH', permissions: ['V'], scope: 'own record only' },
    { role: 'EXE', permissions: ['V'], scope: 'aggregate only (no individual record content)' },
  ],
  exam_readiness: [
    { role: 'REG', permissions: ['V', 'C', 'E', 'X'], scope: null },
    { role: 'AREG', permissions: ['V', 'C', 'E', 'X'], scope: null },
    { role: 'PRIN', permissions: ['V', 'E'], scope: 'own institution' },
    { role: 'TCH', permissions: ['V'], scope: 'own classes only' },
    { role: 'EXE', permissions: ['V'], scope: 'aggregate only (no individual candidate content)' },
  ],
  arabic_fluency: [
    { role: 'ARB', permissions: ['V', 'C', 'E'], scope: 'own classes only' },
    { role: 'PRIN', permissions: ['V', 'E'], scope: 'own institution' },
    { role: 'EXE', permissions: ['V'], scope: 'aggregate only (no individual assessment content)' },
  ],
  tajweed_compliance: [
    { role: 'MUH', permissions: ['V', 'C', 'E'], scope: "Qur'an College only" },
    { role: 'PRIN', permissions: ['V', 'E'], scope: "own institution (Qur'an College)" },
    { role: 'EXE', permissions: ['V'], scope: 'aggregate only (no individual assessment content)' },
  ],
  boarding_intelligence: [
    { role: 'BRD', permissions: ['V', 'C', 'E', 'A'], scope: 'boarding students only' },
    { role: 'PRIN', permissions: ['V', 'E'], scope: 'own institution' },
    { role: 'DSL', permissions: ['V'], scope: 'safeguarding-relevant entries only' },
    { role: 'EXE', permissions: ['V'], scope: 'aggregate only (no individual welfare content)' },
  ],
};

// Returns every grant row for a role in an area (there can be more than
// one row per role, e.g. EXE in `finance` has a plain V row and a
// separately-scoped A row) — never a single boolean, because scope
// matters to the caller.
export function grantsFor(roleCode, areaCode) {
  const rows = MATRIX[areaCode] || [];
  return rows.filter((r) => r.role === roleCode);
}

// The core check. `permissionCode` per the legend above. Returns
// { granted, scope } — scope is null (unrestricted within the area) or
// a string the caller MUST still interpret (e.g. "own institution"
// means the caller has to compare against the grant's own
// institution_id, which effectiveGrants() below already attaches).
export function hasPermission(roleCode, areaCode, permissionCode) {
  const rows = grantsFor(roleCode, areaCode);
  const match = rows.find((r) => r.permissions.includes(permissionCode));
  if (!match) return { granted: false, scope: null };
  return { granted: true, scope: match.scope };
}

export const PERMISSION_CODES = ['V', 'C', 'E', 'D', 'A', 'P', 'X', 'Vf', 'Ar', 'MU'];
