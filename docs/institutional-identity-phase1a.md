# Institutional Identity Phase 1A

This documents what the "INSTITUTIONAL IDENTITY PHASE 1 DIRECTIVE" built
on top of the Account Creation Journey (`docs/account-creation-journey.md`).
That directive followed `docs/imperial-identity-onboarding-reality-check.md`,
which split a full ten-stage KYC-grade onboarding spec into what's
genuinely buildable now (data model + UI depth) versus what needs a
vendor contract and Board sign-off (biometric/document KYC, OTP/CAPTCHA).
Phase 1A is the former: it does not wait on either.

## What changed in registration

`POST /api/portal/register` now accepts, in addition to the original
four fields:

- `identityType` — one of `parent_guardian` (default), `applicant`,
  `sponsor`, `alumni`, `staff_member`, `educational_partner`. These are
  self-descriptions on a guardian-type account, not a real staff account
  or Permission Engine grant — `staff_member`/`educational_partner` do
  not create or link a real staff record (that stays exclusively
  institution-issued, see `docs/staff-identity-architecture.md`).
- `confirmEmail` / `confirmPassword` — validated server-side to match
  `email`/`password` when provided, in addition to the client-side check.
- `whatsappNumber` — optional, stored alongside `phone`.

## The Institutional Identity Profile

A signed-in guardian can now fill in five optional profile sections at
`/portal/profile/`, each mapped straight onto new nullable columns on
`guardians` (see `sql/schema.sql`'s "Institutional Identity Profile
(Phase 1A)" section):

- **Personal** — title, preferred name, gender, date of birth,
  nationality, state of origin, LGA, country of residence.
- **Contact** — secondary phone, WhatsApp number, secondary email.
- **Residential** — address, city, state, postal code.
- **Professional** — occupation, employer, position, business name,
  industry.
- **Family** — marital status, number of children, plus two **computed**
  (never manually entered) values: Existing SHRS Children (a live count
  of `guardian_student` rows) and Prospective SHRS Children (a live count
  of `admissions_applications` rows in `submitted`/`under_review`/
  `waitlisted`/`offered` status). Storing these as separate editable
  fields would just invite drift against the real linked records, so
  they're computed at read time in both `profile.js` and `me.js`.

Two more sections live outside the `guardians` row itself:

- **Emergency Contacts** (`guardian_emergency_contacts`) — at least two
  required for a "complete" profile; `functions/api/portal/emergency-contacts.js`
  exposes GET (list), POST (upsert by `order`), DELETE (by id, scoped to
  the signed-in guardian).
- **Educational Interests** (`guardian_educational_interests`) —
  multi-select across the four institutions plus Online/Weekend/Summer
  Programmes (`functions/_lib/educational-interests.js`'s fixed option
  list); `functions/api/portal/educational-interests.js` exposes GET
  (options + current selection) and POST (full-set replace).

`GET /api/portal/profile` returns every field above plus a computed
completion breakdown; `POST /api/portal/profile` updates whichever
fields are present in the body (a partial update is the common case —
a guardian filling in one section at a time).

## Profile Completion — computed, never stored

`functions/_lib/profile-completion.js` computes a percentage and a
per-section `complete: true/false` flag at **read time**, from whatever
is in the `guardians` row (plus the emergency-contacts/educational-
interests counts) right now — it is never written to a column. A stored
percentage would drift the moment any counted field changed without the
write path remembering to recompute it; computing at read time makes
that class of bug impossible.

22 base fields across the five sections above, plus two section-level
bonuses (Emergency Contacts complete, Educational Interests non-empty)
= 24 total "completion units." Registration-mandatory fields (full name,
email, phone, password) are deliberately **not** counted — this measures
the optional institutional depth that is actually incomplete for a
brand-new registrant, not fields that are already guaranteed filled.

`recommendNextStep()` returns one honest, prioritised suggestion:
unverified email first (an identity-integrity issue, not a profile-depth
one), then emergency contacts, then educational interests, then the four
profile sections in an order roughly matching institutional urgency.

## Dashboard: Welcome / Verification Status panel

`/portal/dashboard/` now opens with an "Your Institutional Profile" card
showing: completion %, Identity Verification, Email Verification, Mobile
Verification, Educational Interests status, Emergency Contacts status,
and the recommended next step, linking to `/portal/profile/`.

Two of these are deliberately honest "not yet" states, not fabricated
passes:

- **Identity Verification** always reads "Pending" — no biometric/
  document KYC vendor exists yet (see the reality-check doc). This is
  not a bug; it is Phase 1A's whole point: build the profile depth now,
  gate real identity verification at admission confirmation later, per
  the directive's own accepted sequencing (Registration = Easy,
  Admission Application = Moderate, Admission Confirmation = Full
  Verification).
- **Mobile Verification** always reads "Not Yet Available" — no SMS/
  WhatsApp OTP provider is wired up. `guardians.mobile_verified_at`
  exists as a column for when one is, but nothing sets it today.

## "Sample Institutional Records," not "Demo"

Per the directive's explicit instruction — *"Stop using the word 'Demo'
anywhere visible on production"* — every place a visible institutional
record could say "Demo" has been changed:

- **`sql/schema.sql` / `setup.js`'s seed block** — the sample
  guardian/students/teacher seeded when `PORTAL_DEMO_PASSWORD` is set now
  use realistic institutional-sounding names and IDs (e.g. "Amina Sani
  Bello," admission numbers `SHR-2026-901`/`SHR-2026-902`, staff number
  `SHR-STF-0901`) instead of literal "Demo Guardian"/`DEMO-0001` strings.
  Every row this block inserts sets a new `is_sample_data = true` column
  (added to `guardians`, `students`, and `staff`).
- **Founder Dashboard** (`functions/api/portal/founder/dashboard.js`) —
  replaced the old `admission_no NOT ILIKE 'DEMO-%'` string-matching
  filter with `is_sample_data = false` column filtering across every
  query. This also **fixes a real pre-existing gap**: the guardian count
  query had no sample-data filter at all before this phase, so a sample
  guardian was being silently counted as a real one.
- **Registrar's Office** (`functions/api/portal/staff/registrar/student.js`
  + `js/portal-staff-registrar.js`) — the student-record response now
  includes `isSampleData`, rendered as a "Sample Institutional Record"
  badge next to the student's name/admission number, so staff looking up
  a real student can immediately tell a sample row apart without the
  name itself saying "Demo."
- **Guardian dashboard** (`js/portal-dashboard.js`) — the existing
  sample-data flag on a child's card now reads `child.isSampleData`
  (from `me.js`, itself now a real `is_sample_data` column read) instead
  of pattern-matching the admission number string.

The `PORTAL_DEMO_PASSWORD` **environment variable name** is unchanged —
it is an admin-configured operational credential for exercising the
portal end-to-end, not itself a rendered institutional record, so the
directive's instruction (which is about visible record names/IDs) does
not apply to it.

## Explicitly still deferred, named rather than faked

- **Biometric/document KYC, OTP, CAPTCHA** — needs a vendor contract
  (Smile Identity/Youverify for Nigeria-market KYC; Twilio for SMS/
  WhatsApp OTP; Cloudflare Turnstile for CAPTCHA) and, for KYC
  specifically, a Board-level retention-policy decision (verify-and-
  discard vs. retain, and a DPIA per IT-02 §7.5). None of this blocks
  Phase 1A, per the reality-check doc's own recommendation.
- **KYC Document Centre** — same dependency as above.
- **Trust Score dashboard** — deferred; Profile Completion % is this
  phase's honest substitute for "how complete/verified is this account,"
  without claiming a trust/verification signal that doesn't exist yet.

## Testing note

Verified end-to-end against a real local PostgreSQL 16 instance (not
route-mocked), using the same methodology proven earlier in this
engagement: a temporary `pg`-backed shim for `getSql()` (reverted before
commit — production `functions/_lib/db.js` is untouched) driving the
actual, unmodified application code under `wrangler pages dev`.

Confirmed via direct HTTP calls and Playwright/Chromium screenshots:
- `/api/portal/setup` seeds "Amina Sani Bello" / `SHR-2026-901` /
  `SHR-2026-902` / `SHR-STF-0901`, all flagged `is_sample_data = true`,
  and remains idempotent across three consecutive calls.
- The Founder Dashboard reports zero students/guardians/Hifz records
  when only sample data exists — confirming both the rewritten filter
  and the previously-unfiltered guardian-count fix.
- A real registration (Identity Type, Confirm Email, WhatsApp, Confirm
  Password) succeeds, matching/mismatching confirmation fields are
  rejected, and the new guardian signs in immediately as designed.
- `/api/portal/profile` GET/POST across all five sections correctly
  updates the completion percentage and per-section flags; Emergency
  Contacts and Educational Interests correctly flip their section flags
  only once genuinely complete (≥2 contacts; ≥1 interest).
- `/api/portal/me`'s `recommendedNextStep` correctly re-prioritises after
  email verification.
- `/portal/profile/` renders all seven sections with real data,
  including the date-of-birth round-trip and the dynamic emergency-
  contact/educational-interest forms.
- `/portal/dashboard/`'s new panel renders the correct percentage and
  the honest "Pending"/"Not Yet Available" states.
- The Registrar's Office UI renders the "Sample Institutional Record"
  badge for a real sample student looked up by admission number.

Not run here (needs a reachable Neon project): the same flows against
production infrastructure, and email delivery for the verification link
(this sandbox has no outbound egress to Neon or a real SMTP/API
provider — a pre-existing, already-documented limitation, see
`docs/parent-portal.md`).
