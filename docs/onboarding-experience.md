# SHRS Institutional Onboarding Wizard & Executive Dashboard Visual System

*Response to two paired directives: the "Imperial Digital Identity &
Onboarding Framework" (a staged, colour-banded onboarding journey with a
completion celebration) and the "Imperial Executive Dashboard Experience
Directive" (a premium, institutional visual system across every
dashboard). Builds directly on top of `docs/imperial-identity-onboarding-reality-check.md`,
which had already assessed the original identity/onboarding directive
stage-by-stage and recommended exactly this scope as "Phase 1 — real
today, no new infrastructure or vendor decisions." This document records
what shipped from that recommendation, in wizard/UX form, and what
remains explicitly deferred.*

## What shipped

### Institutional Onboarding Wizard (`/portal/profile/`)

The existing five-section flat profile form (Personal, Contact,
Residential, Professional, Family) plus Emergency Contacts and
Educational Interests — all built in Phase 1A — are now presented as an
11-stage guided wizard: Identity → Personal → Contact → Residential →
Professional → Family → Emergency Contacts → Educational Interests →
Communication Preferences → Security & Trust → Document Centre.

This is a **presentation and navigation layer only** (`js/portal-onboarding-wizard.js`).
Every existing form keeps its own independent save button and posts to
the exact same endpoints as before (`/api/portal/profile`,
`/api/portal/emergency-contacts`, `/api/portal/educational-interests`) —
the wizard adds a step rail, jump-to-any-step navigation, and Prev/Next
buttons on top, without changing how or where data is saved. No profile
data endpoint was rewritten.

Two stages are genuinely new UI wired to already-existing backend:
- **Communication Preferences** — the `guardian_notification_preferences`
  table and its `/api/portal/notifications/preferences` endpoint already
  existed (built for the Personalisation Centre) but had no home in the
  profile flow; this wizard stage is its first appearance there.
- **Security & Trust** — a read-only status view of data that already
  exists (`email_verified_at`, the trusted-device cookie system) but
  never had a dedicated summary screen.

One stage is new UI with **no backend behind it on purpose**:
- **Document Centre** — rendered as an explicit "Architecture Only —
  Coming Soon" panel. No upload control, no file storage, nothing saved.
  See "Explicitly deferred" below for why.

### Colour-banded completion

`profileCompletionPct` (computed by the pre-existing
`functions/_lib/profile-completion.js`, unchanged) now maps to four
bands, matching the directive's own colour scheme: 🔴 Poor (0–30%,
`--crimson`), 🟠 Basic (31–60%, `--terracotta`), 🟡 Good (61–85%,
`--gold`), 🟢 Excellent (86–100%, `--forest-green`) — all four already-
existing `css/brand.css` tokens, no new palette introduced. The mapping
lives in one place (`window.SHRSOnboarding.completionBand`/`applyBandClass`
in `js/portal-onboarding-wizard.js`) so both the wizard header and the
dashboard's existing progress bar use identical thresholds.

### Completion celebration

At 100% completion, a full-screen "Institutional Identity Verified" card
appears once per guardian, with a hand-rolled CSS/JS confetti burst (no
external animation library — absolutely-positioned spans with a CSS
`@keyframes` fall animation, removed from the DOM after ~4 seconds; the
whole effect is skipped under `prefers-reduced-motion`). A new
`guardians.onboarding_celebration_shown_at` column (nullable timestamp)
is the guard against replaying it on every login — set via a small new
endpoint, `functions/api/portal/onboarding-celebration.js`, the first
time the celebration is shown.

### Dashboard checklist (non-blocking)

The Parent Dashboard now shows a "Complete Your Institutional Profile"
checklist card listing outstanding items (verify email, add emergency
contacts, select educational interests, complete personal profile), each
linking to `/portal/profile/`. **This deliberately does not hard-block
dashboard content** the way the pre-existing email-verification gate
does. That gate protects something real (an unverified email address
submitting an admissions application); extending a hard block to "did
you list your employer" would frustrate real parents over genuinely
optional fields. The checklist nags, it does not lock anyone out.

### Identity Category list, pruned

`register.js`'s `IDENTITY_TYPES` no longer offers "Staff Member" as a
self-service registration option (the CHECK constraint still accepts it
for any pre-existing rows — no data migration). Per the reality-check
document's flagged concern: Staff accounts are institution-issued only
(`docs/staff-identity-architecture.md`, "no self-service sign-up" stated
on `/portal/staff/login/`), so offering it on the public guardian
registration form risked implying a real staff credential where none is
created. "Educational Partner" remains, as a genuine self-description on
a guardian-type account.

### Executive Dashboard Visual System

Rather than introducing a parallel `.exec-card` class that would require
touching every dashboard's HTML, the shared card classes already used
across all four dashboards — `.portal-child-card`, `.pfd-section`,
`.portal-hifz-card`, `.portal-adhkar-card` — were given the same
elevated-shadow, gold-hairline treatment in one place
(`css/portal.css`). This means the Parent, Student, Founder, and
Staff/Registrar/Teacher pages all picked up the premium look
automatically, with no change to their data-fetching logic.

New shared markup was added deliberately in only one place per page: a
"Welcome Back" header (`.exec-welcome`) showing name, role, the school
motto, and a compact stat row — built once per dashboard's existing JS
file (`portal-dashboard.js`, `portal-student-dashboard.js`,
`portal-founder-dashboard.js`, `portal-staff-identity.js`), each showing
real numbers already available to that page (profile completion,
children enrolled, attendance %, roles assigned, and so on) — never a
placeholder or invented figure.

**Founder Dashboard specifically:** the real metrics that already
existed (student counts, attendance average, fee due/paid/outstanding,
Hifz/Ijazah stats) were restyled into the new card system. The
pre-existing `notYetAvailable` section — revenue overview, staff
headcount, admissions pipeline, none of which has a real data source
yet — was **not** expanded with invented numbers. It keeps reporting
honestly that these are not yet available, now visually consistent with
the rest of the page rather than a special-cased warning box.

## Explicitly deferred (named, not silently dropped)

- **Stage 5 — Children's medical/Hifz-background/special-needs data.**
  No new schema was added to `students` for this. Collecting medical
  information and special-needs data about children is more sensitive
  than the guardian's own profile fields, and needs an explicit decision
  on who may write it (self-reported by a guardian vs. staff-verified at
  enrolment) before any schema is added. Flagged as future scope in
  `docs/imperial-identity-onboarding-reality-check.md`'s Stage 5
  discussion; unchanged by this phase.
- **Stage 10 — Document Centre (real storage).** The wizard step exists
  as a labelled placeholder only. Real document upload needs, in order:
  a decision on retain-vs-discard, a Data Protection Impact Assessment,
  a stated retention period in IT-02, and a chosen file-storage backend
  (no R2/S3 or equivalent exists in this project today) — all named as
  Phase 3 work in the reality-check document, unchanged here.
- **Founder Dashboard: revenue overview, staff headcount, admissions
  pipeline.** No real data source exists for any of the three yet (no
  fee ledger beyond due/paid totals, no staff headcount aggregate, no
  admissions pipeline workflow). Continuing to report these honestly as
  "not yet available" rather than fabricating figures, per this
  engagement's standing rule against invented institutional data.
- **KYC / biometric identity verification, CAPTCHA, SMS/WhatsApp OTP.**
  Unchanged from the reality-check document — each needs a real vendor
  relationship and, for KYC specifically, a DPIA and a named accountable
  person before any code is written.

## Files touched

- `functions/api/portal/register.js`, `portal/register/index.html` —
  pruned `IDENTITY_TYPES`.
- `sql/schema.sql`, `functions/api/portal/setup.js` — added
  `guardians.onboarding_celebration_shown_at` (both kept in sync, per
  this repo's standing convention).
- `functions/api/portal/profile.js` — `loadProfile()` now also returns
  `trustedDeviceCapable` and `onboardingCelebrationShown`.
- New `functions/api/portal/onboarding-celebration.js`.
- `portal/profile/index.html` — restructured into wizard steps; three
  new step cards (Communication, Security & Trust, Documents).
- New `js/portal-onboarding-wizard.js` — step navigation, colour bands,
  celebration/confetti, Communication Preferences form wiring, Security
  & Trust read-only rendering.
- `js/portal-profile.js` — calls `window.SHRSOnboarding.onProfileData()`
  after every profile fetch/save.
- `portal/dashboard/index.html`, `js/portal-dashboard.js` — Welcome Back
  header, non-blocking checklist panel, colour-banded progress bar.
- `portal/student/dashboard/index.html`, `js/portal-student-dashboard.js`
  — Welcome Back header with real stats (attendance, fee status,
  programme count, Hifz stage).
- `portal/founder/index.html`, `js/portal-founder-dashboard.js` —
  Executive Command Centre welcome header with real aggregate stats.
- `portal/staff/identity/index.html`, `js/portal-staff-identity.js` —
  Welcome Back header with roles/delegations stats.
- `css/portal.css` — `.exec-welcome`, `.exec-card`/`.exec-stat`/
  `.exec-table` (available for future new markup), colour-band classes,
  confetti keyframes, checklist styling, and elevated-shadow additions
  to the existing shared card classes.

## Testing note

Verified locally via `wrangler pages dev` + Playwright with a
route-mocked session (this sandbox has no egress to Neon, the same
pre-existing limitation documented in `docs/parent-portal.md`): wizard
step navigation and jump-to-step, colour band thresholds at 0/30/31/60/
61/85/86/100%, the celebration screen firing once and not replaying,
and all four dashboards' new Welcome Back headers rendering with
mocked data. Full live-database testing (confirming
`onboarding_celebration_shown_at` persists correctly and the celebration
truly fires only once across real sessions) happens after merge, via
`/portal/admin/setup/` against the real Preview/Production Neon
databases, per this repo's established practice.
