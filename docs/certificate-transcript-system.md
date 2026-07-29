# Certificate & Transcript Verification System

**Priority 1 of the SHRS Imperial Digital Campus Directive** (per the
Board's revised sequencing — Certificates first, ahead of Digital ID
Cards, Finance, Founder Analytics, Institutional Knowledge Base, and
the full LMS). This document records what actually shipped, what it
builds on, and what's explicitly deferred.

## What this is

Public, no-login verification of any certificate or Ijazah the school
issues: a third party (employer, another school, a scholarship board)
receiving a physical or PDF certificate can confirm it's genuine by
entering its reference number, or by scanning a QR code printed on the
document — no account required, by design.

## What already existed (not rebuilt)

- `certificates` and `ijazah_register` tables, both with a unique
  `reference_no`, `revoked_at`/`revocation_note` (sql/schema.sql) —
  built during the Registrar's Office phase.
- `ijazah_register`'s own schema comment already anticipated this:
  *"IQ-02 §7.5's public third-party verification endpoint is separate
  future work with its own access-control model."* This system is
  that future work, arriving later than planned but built on the same
  table it was always meant to use.
- Staff-side issue/revoke endpoint
  (`functions/api/portal/staff/registrar/certificates.js`), Permission-
  Engine-gated, audit-logged.
- Student and guardian dashboards already surfacing real academic
  results (`term_results`) and Hifz progress (`hifz_progress`,
  `hifz_enrolment`, `ijazah_register`) via `/api/portal/student/me` and
  `/api/portal/me` — this is most of "Academic Transcript" and "Qur'an
  Transcript" already real from earlier phases.

## What's new

- **Auto-generated reference numbers**: `SHR-<TYPE>-<YEAR>-<seq>` (e.g.
  `SHR-HFZ-2026-000001`), generated server-side when Registrar staff
  leave the field blank, so numbering is consistent across the school
  without requiring staff to invent their own scheme. Staff can still
  supply their own to match a pre-existing paper register.
- **Public verification**: `GET /api/certificates/verify?ref=...`
  (`functions/api/certificates/verify.js`) looks up `certificates` then
  `ijazah_register` by reference number, no auth. Returns the real
  record — recipient name, credential type/scope, examining scholars
  (Ijazah), issue date, and current status (active/revoked, with the
  revocation note if applicable) — or an honest "not found."
- **QR codes**: `GET /api/certificates/qr?ref=...`
  (`functions/api/certificates/qr.js`) renders a scannable SVG QR code
  encoding the verification URL, using the real `qrcode` npm package
  (Ryan Day, MIT) — not a hand-rolled encoder. Only its pure-JS core
  matrix encoder + SVG renderer are imported (`functions/_lib/
  qrcode.js`), deliberately avoiding the package's canvas/PNG code
  paths that depend on Node APIs not guaranteed in the Workers runtime.
- **Public verification page**: `/verify-certificate/` (EN) and
  `/ar/verify-certificate/` — a reference-number form plus
  `?ref=...` deep-linking (what a QR code opens to). Renders three
  honest states: genuine/active, revoked (with note), and not found —
  never a fabricated or ambiguous result.
- **Registrar UI**: issuing a certificate now shows the generated
  reference number, a link to its public verification page, and its QR
  code inline, immediately after issuance
  (`js/portal-staff-registrar.js`).
- **Cross-linking**: every certificate/Ijazah reference already shown
  on the student dashboard and the registrar's own certificate list now
  links straight to its verification page, rather than sitting as
  unlinked text.
- **Academic transcript polish**: the student dashboard's results table
  now computes a real term average (arithmetic mean of recorded
  `total_score` values for that term) — never a separately-fabricated
  figure — and explicitly states that Islamic & Arabic Studies has no
  transcript yet (see below).

## What's honestly still missing

- **Islamic & Arabic Studies transcript**: does not exist. The School
  of Islamic & Arabic Studies has no assessment data model at all yet
  (confirmed absent, not just unwired) — this needs its own schema and
  assessment-entry workflow before any transcript can be real. The
  student dashboard says this plainly rather than omitting the third
  transcript type silently.
- **Locked/exportable transcript snapshots**: today's academic and
  Qur'an transcripts are live authenticated views, not a separately
  verifiable, point-in-time PDF export with its own reference number
  the way certificates now work. A "Request an Official Transcript"
  flow that snapshots and QR-verifies a transcript the same way a
  certificate is verified is a natural next step, not built here.
- **PDF certificate generation**: this system verifies that a
  certificate is genuine; it doesn't generate the printed/PDF document
  itself. The school still produces certificates its existing way and
  writes the reference number and QR code onto them by hand or via
  their own template.
- **Rate limiting** on the public verify endpoint: not added in this
  pass. Reference numbers are staff-assigned (never self-service, so
  nothing lets a stranger register a fake one), and the fields returned
  are exactly what a certificate is meant to prove to a third party —
  but unmetered lookups on a purely public endpoint are worth revisiting
  if abuse is ever observed.
- **Guardian-side transcript equivalent**: the guardian dashboard
  already shows a lighter results/Hifz summary per child (built in an
  earlier phase); it wasn't extended with the same term-average/
  Islamic-Studies-note treatment in this pass — the student's own view
  was prioritized since students are the eventual recipients of
  certificates and transcripts.

## Design-system note

New public-facing CSS (`.cert-verify-*`) lives in `css/brand.css`
because `/verify-certificate/` is a public marketing-style page (loads
`brand.css` only). New dashboard-side CSS (`.registrar-cert-*`,
`.transcript-*`) lives in `css/portal.css`, which only portal pages
load. Both draw on the Phase 0 design-system tokens
(`--radius-*`, `--shadow-*`, `--space-*`) rather than inventing new
ad hoc values.
