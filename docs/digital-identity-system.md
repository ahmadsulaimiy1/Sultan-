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
identity number: `SHR-STU-<year>-<seq>` for students,
`SHR-PAR-<year>-<seq>` for guardians, and for staff
`SHRS-[UNIT]-[OFFICE]-[JOINDATE]-[SEQUENCE]` (e.g.
`SHRS-HQ-CEO-130726-000001`) — see "SHRS Master Identity Architecture"
below for how the staff format works and why it changed from the
original `SHR-STF-<year>-<seq>`. A security guard, another institution,
or a parent confirming a teacher's identity can verify a card is
genuine at `/verify-identity/` — no account required, by design,
exactly like certificate verification.

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
its `.cert-verify-*` styling is reused, not duplicated. The `.id-card-3d`
component's CSS lives in `css/portal.css` (all mount points are
authenticated dashboard pages), built on the same navy/gold
`.exec-welcome` visual language and the Phase 0 design-system tokens.

## SHRS Master Identity Architecture (Founder & CEO-approved, staff only)

Staff identity numbers moved from `SHR-STF-<year>-<seq>` to
`SHRS-[UNIT]-[OFFICE]-[JOINDATE]-[SEQUENCE]` — e.g.
`SHRS-HQ-CEO-130726-000001` — per the Founder & CEO's explicit "SHRS
Master Identity Architecture Directive." **Students and guardians are
unchanged** (`SHR-STU-`/`SHR-PAR-<year>-<seq>`); that directive
addressed staff numbering only.

- **UNIT** — `RC`/`NPS`/`IAS`/`QC` for a staff member whose real office
  or institution places them at one of the four schools, `BOT` for the
  Board of Trustees and its five standing committees, `MGT` for
  Management Council, `HQ` for every other school-wide office
  (Executive, Finance, HR, ICT, etc.).
- **OFFICE** — a real 3-letter code per office (`functions/_lib/
  identity-no.js`'s `OFFICE_CODE_BY_SLUG`, covering every office slug
  this project actually seeds). Teaching staff with a department but no
  formal office get `EDU`; a Designated Safeguarding Lead with neither
  gets `DSL`; a staff member with none of the above gets `STF`.
- **JOINDATE** — the person's real `staff.date_joined`, `DDMMYY`. A
  record with no `date_joined` on file is left ungenerated (or, for an
  existing number, left on the old format) rather than given a
  fabricated date — the same no-fabrication rule as everywhere else in
  this system.
- **SEQUENCE** — a real, atomic PostgreSQL sequence (`staff_identity_seq`),
  not the previous `COUNT(*) + 1` pattern, which had a genuine race
  condition under concurrent requests. Global, so a number is never
  reused, ever, exactly as the directive requires.

**Rollout — "migrate everyone now":** presented with the trade-off
(new records only vs. a one-time bulk migration of every existing
staff record), the Founder & CEO explicitly chose the bulk migration,
knowingly accepting that it breaks every already-issued QR
code/verification link for anyone whose number changes. That migration
is a single admin action — `regenerate-identity-numbers` on
`POST /api/portal/admin/staff` — regenerating `identity_no` for every
staff record with a real `date_joined`; anyone without one is
unaffected and stays on their existing number. `/api/identity/verify`
now routes both the `SHR-STF-` and `SHRS-` prefixes to the staff table,
so a record left un-migrated still verifies correctly.

**Card labelling:** the identity number is now explicitly labelled on
the ID card — "Institutional Identity Number" for staff, "Executive
Credential Number" for the Founder & CEO's card specifically (detected
via the `EXE` role, the same real signal the Permission Engine already
uses — not a separate "founder" account type). Students/guardians keep
their existing generic "Identity Number" label; that directive didn't
address them.

**Declined, deliberately:** the directive's "Secondary/Personal
Verification Signature" — a letter-position numerology sum (e.g.
"Zakaria" → 67 → `PVS-067`) described as existing "for verification
logic" — was not built. A number derived purely from how a name is
spelled is not unique (many people share letter-sums), is trivially
reproducible by anyone who knows the formula, and calling it
verification would misrepresent how this system's real verification
actually works (a database lookup against a system-generated,
never-user-chosen number). Building it as a cosmetic detail with no
verification claim attached remains available as a future ask if still
wanted.

## Digital Identity System — Imperial Prestige Directive (card rebuild)

The ID card (`js/id-card.js` + `.id-card-3d` in `css/portal.css`) was
rebuilt as a true 3D object rather than a flat rectangle, per the
Founder & CEO's "Digital Identity System — Imperial Prestige
Directive":

- **Real 3D geometry** — `perspective`/`preserve-3d`/`backface-
  visibility`, exact ISO ID-1 proportions (85.60 × 53.98mm, ratio
  ≈1.586) on every device, a front face (identity/monogram/QR/Institutional
  Identity Number) and a back face (larger verification QR, role
  detail, status, Verify → link).
- **Motion** — a slow continuous auto-rotation between the two faces
  (one full turn roughly every 75 seconds), pausable on hover,
  interruptible by pointer drag-to-rotate or (on touch) a swipe/tilt
  gesture, snapping gently to whichever face is nearest on release; a
  double-tap/click or Enter/Space flips it outright; arrow keys rotate
  in 30° steps. Fully static under `prefers-reduced-motion`. Kept
  deliberately restrained — one soft diagonal gold lighting sweep, not
  a particle/glitter loop — per the directive's own closing guidance
  ("cinematic elegance, not maximum movement").
- **Ten role-specific colour themes** (`.theme-founder` /
  `-registrar` / `-finance` / `-principal` / `-headteacher` / `-raees`
  / `-mudeer` / `-educator` / `-parent` / `-student`), one shared
  geometry. A staff member's theme is derived from their real office
  (via its slug) or, absent one, whether they hold a real department —
  never guessed from their name or title.
- **Founder & CEO tier** — the highest-prestige theme (near-black +
  brightest gold), a "Founder & CEO" ribbon, a faint watermark of the
  site's real brand mark (not a fabricated crest), and a signature line
  on the back face. Triggered by holding the `EXE` role, not a separate
  card type.
- **Deliberately not built**: literal floating particles/gold dust, a
  simulated glass pedestal/spotlight staging environment. The
  directive's own closing paragraph explicitly warned against exactly
  this category of effect ("excessive animation often makes a system
  feel cheaper, not more luxurious"); the real 3D mechanics above were
  judged to satisfy the prestige goal without it.
