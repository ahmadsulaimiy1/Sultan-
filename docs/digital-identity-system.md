# Digital Identity System

**Priority 2 of the SHRS Imperial Digital Campus Directive** (per the
Board's revised sequencing — Digital ID Cards second, right after
Certificates & Transcripts, ahead of Finance, Founder Analytics, the
Institutional Knowledge Base, and the full LMS). This document records
what actually shipped, what it builds on, and what's explicitly
deferred — the same honest-scoping standard used for Priority 1.

## What this is

Every student, parent/guardian, and staff member (including executives
— an executive is a staff record with the `EXE` role, so this covers
them automatically) now has a permanent, public, QR-verifiable
identity number: `SHR-STU-<year>-<seq>`, `SHR-PAR-<year>-<seq>`,
`SHR-STF-<year>-<seq>`. A security guard, another institution, or a
parent confirming a teacher's identity can verify a card is genuine at
`/verify-identity/` — no account required, by design, exactly like
certificate verification.

## What already existed (not rebuilt)

- The three underlying identity records (`students`, `guardians`,
  `staff`) and their session/auth systems — this system adds one
  column and one lazily-generated value to each, it doesn't replace
  any of them.
- The `qrcode` npm package integration and `functions/_lib/qrcode.js`
  wrapper, built for Priority 1 — reused as-is for identity QR codes.
- The Permission Engine's `EXE` role code — "Executive identity" is
  not a separate system; any staff record holding `EXE` already gets a
  full identity card through the same staff endpoint everyone else
  uses.

## What's new

- **Schema**: `identity_no TEXT UNIQUE` added to `students`,
  `guardians`, and `staff` (nullable until first generated).
- **Lazy generation**: `functions/_lib/identity-no.js` — three explicit
  `ensure*IdentityNo()` functions (one per table; the Neon serverless
  driver has no dynamic-table-name/`.unsafe()` escape hatch, so this
  is three real functions, not one parameterised helper standing in
  for three). Each generates the number the first time that person's
  own dashboard is loaded, then persists it — nothing is bulk-
  backfilled, so a school with years of existing records doesn't need
  a migration script before this works.
- **Wired into all three `me` endpoints**: `/api/portal/student/me`,
  `/api/portal/me` (guardian), `/api/portal/staff/me` all now return
  `identityNo`.
- **Public verification**: `GET /api/identity/verify?id=...`
  (`functions/api/identity/verify.js`) looks up the number's prefix
  (`SHR-STU-`/`SHR-PAR-`/`SHR-STF-`) against the right table and
  returns only public-safe fields — full name, status, and
  institution/class (student) or position/institution (staff) or a
  generic verified/unverified state (guardian). It deliberately never
  returns contact details, addresses, fee status, or academic records
  — those aren't what an identity card is meant to prove to a third
  party.
- **QR codes**: `GET /api/identity/qr?id=...`
  (`functions/api/identity/qr.js`), same pattern as
  `functions/api/certificates/qr.js`.
- **Public verification page**: `/verify-identity/` (EN) and
  `/ar/verify-identity/` — an identity-number form plus `?id=...`
  deep-linking (what a QR code opens to), reusing the `.cert-verify-*`
  CSS built for certificate verification.
- **ID card component**: `js/id-card.js` — one shared renderer used on
  the student dashboard, guardian dashboard, and staff "My Identity"
  page, so the card looks identical everywhere it appears. Shows a
  monogram (no fabricated photo, matching the Faculty Directory's
  `fc-mono` convention), full name, role/subtitle, the identity
  number, a live QR code, and a "Verify →" link to the public page.
- **Footer link**: "Verify an Identity" added next to "Verify a
  Certificate" (EN + AR).

## What's honestly still missing

None of the following exist as real systems, so none of them are on
the ID card or anywhere in this build — fabricating them would be
worse than leaving them out:

- **House system** — SHRS has no house/tutor-group data model at all.
- **Blood group** — no medical records system exists; this is
  sensitive health data that shouldn't be introduced as a side effect
  of an ID card feature, and only ever with its own consent and
  storage design.
- **Digital wallet number** — no payments/wallet system exists yet
  (Finance Platform is Priority 3, not built in this pass).
- **Library / transport / hostel status** — none of these operational
  systems exist yet (Library is explicitly a later, lower priority per
  the Board's own sequencing, precisely so it isn't built as an empty
  shell).
- **Board of Governors identity cards** — Board members are not staff
  records today; there is no data model for non-staff governance
  identities. Executive staff (`EXE` role) are covered; a Board member
  who isn't also staff is not.
- **Physical card printing/production** — this system verifies that a
  digital identity is genuine; it doesn't generate a printed PVC card.
  A "Download/Print My ID Card" flow (rendering the same component to
  a printable card layout) is a natural next step, not built here.
- **Rate limiting** on the public verify endpoint — not added in this
  pass, for the same reasoning as the certificate verify endpoint:
  identity numbers are system-generated (never user-chosen), and only
  already-public-appropriate fields are returned.

## Design-system note

`/verify-identity/` is a public page (loads `css/brand.css` only) —
its `.cert-verify-*` styling is reused, not duplicated. The `.id-card`
component's CSS lives in `css/portal.css` (all three mount points are
authenticated dashboard pages), built on the same navy/gold
`.exec-welcome` visual language and the Phase 0 design-system tokens.
