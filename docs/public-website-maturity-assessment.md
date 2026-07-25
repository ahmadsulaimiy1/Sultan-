# SHRS Public Website Maturity Assessment v1.0

**Scope.** The public-facing website only (`shroyalschools.ng` — marketing
pages, policies, admissions, and the discoverable edges of the Parent/
Student/Founder portals). Internal digital-institution work (Staff
Identity & Role System, the Registrar office, teacher/principal
tooling) is out of scope — this assessment exists specifically to
answer whether the public-facing "prestige layer" is solid enough to
build Staff Identity on top of, per the brief that commissioned it.

**Method.** Every score below is a judgment call grounded in what has
actually been built and verified in this engagement — real files read,
real Playwright screenshots taken, real API responses checked — not
guesswork. Two categories (Accessibility, Performance) are explicitly
flagged as **unaudited**: no formal tool (Lighthouse, axe-core,
WebPageTest) has been run against this site at any point in this
engagement, so those two scores are professional estimates pending a
real audit, not measured results. Treat them accordingly — don't quote
them as benchmark numbers.

**Scale.** `/10`, with a one-line tier label: Emerging (1–3) · Developing
(4–5) · Solid (6–7) · Strong (8–9) · Exemplary (10).

---

## Summary scorecard

| Category | Score | Tier |
|---|---|---|
| Navigation | 8/10 | Strong |
| Admissions | 6/10 | Solid |
| Communication | 6/10 | Solid |
| Mobile Experience | 8/10 | Strong |
| Accessibility | 5/10 (unaudited) | Developing |
| Prestige & Branding | 8/10 | Strong |
| Trust Signals | 7/10 | Solid |
| Islamic Identity | 9/10 | Exemplary |
| Digital Campus Visibility | 5/10 | Developing |
| Performance | 6/10 (unaudited) | Solid |

No category is a 10. That's intentional honesty, not false modesty —
every score below names a specific, real gap, not a hedge.

---

## Navigation — 8/10, Strong

**Current state.** A full premium mega-menu (Admissions, Governance,
Foundation, Contact, Academics) with icon + description + primary/
secondary CTA per panel; a mobile accordion equivalent; a
horizontally-scrollable `.mobile-nav-ribbon` for one-tap category
access on phones; a 6-item Quick Access strip beneath the header
(Apply Now, Parent Portal, Student Portal, Adhkār Centre, Prayer Times,
Contact); a 12-icon "institution at a glance" footer grid; a working
client-side site search (EN+AR, separate indexes). Every major
destination is reachable in two taps or fewer from any page.

**Remaining gaps.**
- No breadcrumb trail on deep pages (a visitor three levels into
  Academics → Qur'an College has no visible "you are here" beyond the
  URL and the active nav-drop trigger's underline).
- The language toggle is a single AR/EN link, not a selector — the
  7-language ambition named in the roadmap (`docs/digital-campus-roadmap.md`
  task list, item 119/144) is still just English + Arabic.
- Search is client-side and title/description-only (no body-text
  indexing) — a search for a specific policy clause won't surface it
  unless that phrase happens to be in the page's meta description.

**Recommended actions.** Add a lightweight breadcrumb component to the
three-plus-level pages (Academics sub-pages, Policies detail pages).
Defer the language selector until there's a second non-Arabic
translation to select between — building the UI for six languages that
don't exist yet would be exactly the kind of "looks complete, isn't"
scaffolding this engagement has consistently avoided.

---

## Admissions — 6/10, Solid

**Current state.** A real 12-stage process (both a visual 6-stage flow
diagram and the full 12-step list), a documents-required box, and — as
of this session — a Stage 1 digital action: WhatsApp/call/email enquiry
buttons that actually start the process, where previously the page only
*described* twelve stages without a single clickable stage-1 action.
Floating Apply Now CTA site-wide.

**Remaining gaps.** This is the most honest gap on the whole site: past
Stage 1 (Enquiry), **every remaining stage is descriptive text, not a
digital workflow.** There is no online application form — "submit the
admission form" (Stage 2/3) still means a parent has to visit or call
to get a paper/PDF form. Fee schedule, scholarship criteria, and
international-student arrangements are explicitly marked
`Content Needed From SULTAN` rather than fabricated — correct
discipline, but it means a genuinely important admissions question
(cost) has no answer on the site at all today.

**Recommended actions.** In priority order: (1) get the real fee
schedule from the school and publish it — this is probably the single
highest-value content gap on the entire site, ahead of any further
design work; (2) once Staff Identity exists, consider a real online
application intake (Stage 2) that creates a `students` row in `draft`/
`applicant` status rather than requiring a paper form; (3) publish
scholarship criteria if a real, approved policy exists for it.

---

## Communication — 6/10, Solid

**Current state.** As of this session (Priority 2), a complete
announcement *infrastructure* exists and works correctly end-to-end:
site-wide ribbon, homepage hero with countdown, and a filterable
permanent archive at `/announcements/`, all backed by a real Postgres
table and a staff-write API — see `docs/announcements-system.md`. The
AI Assistant routes enquiries to the right office. WhatsApp escalation
is available from multiple entry points. The Personalisation Centre has
a working notifications tab.

**Remaining gaps.** The infrastructure is real, but it currently holds
**zero published announcements** — no admissions notice, no ceremony,
no academic notice has actually been entered by staff yet, because no
staff role exists yet that can do so without holding a raw API token.
An infrastructure score alone overstates communication *maturity*;
communication *activity* is currently zero. This category can't score
higher than "solid" until the school is actually publishing through it.

**Recommended actions.** The moment Staff Identity ships a
Communications/Front-Office role (see the note in
`docs/announcements-system.md` about `PORTAL_ADMIN_TOKEN` being a
temporary stand-in), get a real staff member publishing real notices
through it — even one or two live announcements will do more for this
score than any further engineering.

---

## Mobile Experience — 8/10, Strong

**Current state.** Extensive, hard-won mobile work across multiple
phases: card-style footer at ≤760px, mobile header prestige parity,
the nav ribbon and quick-access strip (both snap-scroll, both verified
this session with real 390px-viewport Playwright screenshots, EN+AR),
a fixed floating-button collision bug (Call School was overlapping the
admission page's enquiry buttons — found and fixed this session), and
a responsive Adhkār Centre with a genuine no-JS fallback tested with
JavaScript actually disabled in a real browser context.

**Remaining gaps.** The Parent/Student/Founder portal dashboards have
not been specifically mobile-audited in this engagement — their CSS
follows the same responsive conventions as the rest of the site, but no
Playwright pass has targeted them at phone viewports the way the
marketing pages have. No PWA manifest, no offline capability, no
install-to-homescreen affordance — a parent checking their child's
attendance on a train with a weak signal gets nothing.

**Recommended actions.** Run a dedicated mobile-viewport Playwright
pass over the three portal dashboards before or alongside Staff
Identity work, since Staff Identity will add a fourth. A PWA manifest
is a cheap, real win worth scheduling once the portal surface stabilises.

---

## Accessibility — 5/10 (unaudited), Developing

**Current state.** Reasonable *incidental* accessibility: `aria-hidden`
on decorative SVGs is applied consistently, most images carry
descriptive `alt` text, semantic sectioning is used throughout,
`aria-selected`/`aria-haspopup`/`role="dialog"`-style attributes appear
on interactive components like the Personalisation Centre. Colour
palette (charcoal/gold/ivory) generally reads as high-contrast to the
eye.

**Remaining gaps — stated plainly: no accessibility audit has ever been
run on this site.** No axe-core scan, no screen-reader walkthrough, no
systematic colour-contrast check, no keyboard-navigation trace through
the mega-menu or the Personalisation Centre drawer, no `prefers-reduced-
motion` audit beyond the one explicit `@media (prefers-reduced-motion:
reduce)` rule found on the gold-sweep button hover. A 5/10 here is an
estimate, not a measurement — the real number could be meaningfully
higher or lower once actually tested.

**Recommended actions.** Run axe-core (or Lighthouse's accessibility
pane) against the ten highest-traffic pages as a first, cheap pass.
Specifically verify keyboard-only navigation through the mega-menu
(can a keyboard user reach and activate every `nav-drop-panel` link?)
and the Personalisation Centre drawer (does focus trap correctly, does
Escape close it?) — these are the two most complex interactive
components on the site and the most likely to have a real defect.

---

## Prestige & Branding — 8/10, Strong

**Current state.** The deepest, most consistently invested category on
the site: seven phases of flagship redesign (header, footer, buttons,
icons, cards), a coherent expanded palette (charcoal, cream/parchment,
royal gold, coffee-brown), motion design (counters, reveal-on-scroll,
gold-sweep hover states) applied with restraint rather than
decoration-for-its-own-sake, a real campus photo gallery, Qur'an College-
specific manuscript/geometric styling that visually differentiates it
from the secular institutions without breaking the shared brand system.

**Remaining gaps.** A small number of `Content Needed From SULTAN`
placeholder blocks (admissions fees, boarding costs) are still visible
site-wide — honest, but each one is a small crack in the "looks
complete" goal this whole prestige effort has been chasing. The
Announcement hero (this session's addition) currently always shows its
elegant empty state to a real visitor, which is correct given there's
no content yet, but it does mean the homepage's newest, most prominent
section is — for now — the one thing on the page actively saying
"nothing here yet."

**Recommended actions.** Track the placeholder-block count as a metric
— every one that gets replaced with real content (fees, a scholarship
policy, a first published announcement) is a direct, measurable
prestige win with no further design work required.

---

## Trust Signals — 7/10, Solid

*(The category the brief specifically asked to be pressure-tested —
answered in full detail below rather than summarised.)*

**Governance visibility — strong.** A dedicated `/about/governance/`
page names the Board of Trustees and executive team; `GV-01`
(Constitution & Governance Charter) and the wider policy library are
published with named preparer/reviewer/approver per document — this is
unusually deep for a school website of this size.

**Accreditation information — the sharpest real gap.** The footer and
`/about/` both state the school was **"registered December 2017"** —
but nowhere on the site is there a registration/RC number, the name of
the registering authority (e.g., the Lagos State Ministry of
Education), or any examination-body affiliation (WAEC/NECO) for Royal
College despite the site elsewhere describing Nigerian-curriculum
secondary education. A parent who wants to independently verify the
school's legal standing has no way to do that from this site. This is
worth fixing before almost anything else in this category — it's a
factual-content gap, not a design one, so it needs real documentation
from the school, not more engineering.

**Policies — the site's strongest trust asset.** 20+ policies published
at genuine operational depth (not summaries), each with a coding
standard, a named revision history, and cross-links to related
documents; a print/PDF-friendly stylesheet so a parent can save a copy.
Few school websites publish safeguarding and governance policy at this
level of real detail.

**Safeguarding commitments — strong.** The Child Protection &
Safeguarding Policy and the Designated Safeguarding Lead Framework are
both published at full 13-section depth, not abbreviated versions.

**Contact confidence — strong.** Real address, two real phone numbers,
a real email, an embedded interactive Google Map with "Get Directions,"
and — added this session — direct WhatsApp/call/email enquiry buttons
specifically at the point in the admissions flow where a parent is
ready to act.

**Physical location confidence — strong.** A real campus photo gallery
(building exterior, classrooms, recitation hall, workshop and
competition photos), all Director-approved per the consent procedure in
`IT-02`, plus the embedded map above.

**Leadership visibility — strong.** The Director's message is signed
with real, checkable credentials (named degrees, professional bodies);
the Founder/CEO's photo is published on the Governance page.

**One asset worth naming explicitly, since it's easy to miss:** `/about/`
already cites **independent, third-party validation** — "Source:
independent reporting by Punch Newspapers, August 2023" — next to the
founding story. This is a real, rare trust signal (external press, not
self-reported) that most of the site's other claims don't have, and it
isn't surfaced anywhere else (footer, homepage) despite being one of
the most credible things on the site.

**Recommended actions, in order:** (1) get the school's actual
registration/RC number and regulating authority and publish it — this
single fact would do more for this category's score than any other
single change available right now; (2) confirm and publish any real
WAEC/NECO or other examination-body affiliation for Royal College, if
one exists; (3) consider surfacing the Punch Newspapers citation more
prominently (e.g., a small "As featured in" mention near the homepage
hero) once a link to the actual article can be confirmed — do not add
this without the real URL, per this engagement's anti-fabrication
discipline.

---

## Islamic Identity — 9/10, Exemplary

**Current state.** The standout category. A full build-time-static,
JS-enhanced Adhkār Centre (Morning/Evening + expanded categories, real
Qur'an/Hadith sourcing with references) with a Smart Tasbih Counter,
Arabic text-to-speech, session tracking, and streaks; a Hijri
mini-calendar and prayer-time integration inside the Personalisation
Centre, reachable in one tap from the homebase Quick Access strip; a
real, working Hifz & Ijazah tracker for Qur'an College students (a
genuine digital tool tied to the school's own published 5-stage Hifz
Journey, not marketing copy); geometric/manuscript visual styling
scoped to Qur'an College; a full Arabic mirror of the site.

**Remaining gaps.** The AR translation itself carries an honest,
self-declared caveat on the Arabic homepage ("recommend this text be
reviewed by a native Arabic speaker... especially name transliterations
and Shar'i terminology") — correct to disclose, but it means the
Arabic-speaking visitor's experience is marked as provisional by the
site itself. The portal (parent/student/founder dashboards) and the new
Announcement system are both English-only — a real, named gap, not
silently dropped.

**Recommended actions.** Commission a native-Arabic-speaker review pass
specifically for the flagged categories (staff names, Shar'i
terminology) before treating the AR site as production-final. Portal
Arabic support remains realistically a future phase, not urgent.

---

## Digital Campus Visibility — 5/10, Developing

**Current state.** The real, working parts are genuinely real: a live
Parent Portal, a live Student Portal (dual-enrolment aware), a live
Founder Dashboard drawing real aggregate queries, and the Hifz/Ijazah
tracker — all backed by an actual Neon database, not mockups. As of
Priority 1 this session, these are now discoverable in three places
(header mega-menu, mobile quick-access strip, footer) instead of being
buried.

**Remaining gaps.** This is the honest ceiling on this category right
now: of the nine governance/admin offices named in
`digital-institution-blueprint.md`, only two (Registrar-adjacent
records, Founder) have any real digital presence — Staff Identity & Role
System, the thing that would let Teachers, Admissions staff, Finance,
and every other office actually *use* this infrastructure, doesn't
exist yet. A first-time visitor sees "Parent Portal" and "Student
Portal" links and reasonably infers a fuller digital campus than
currently exists behind them for staff. This isn't a visibility problem
to fix with more links — it's an honest reflection of how much of the
Blueprint's ambition is actually built yet.

**Recommended actions.** This category's score is a direct function of
Staff Identity & Role System shipping — it is correctly the very next
priority after this assessment, not a coincidence of sequencing. Expect
this score to move the most of any category once that phase lands.

---

## Performance — 6/10 (unaudited), Solid

**Current state.** The site is static HTML + CSS with deferred JS —
architecturally about as lean a stack as a site this visually rich can
have. Built pages run roughly 75–90KB each (up to ~160KB for the dense
Policies page) per this session's build output — reasonable for the
amount of real content. Several images already use `loading="lazy"`.

**Remaining gaps — stated plainly: no performance audit (Lighthouse,
WebPageTest, or otherwise) has ever been run on this site.** Named,
specific suspects worth checking rather than a guessed score: (1) Google
Fonts are loaded via a synchronous `<link>` in `<head>` with no visible
`font-display` strategy confirmed — a likely render-blocking cost on
every page; (2) `js/adhkar-data.js` and `js/adhkar-app.js` are loaded
`defer` on **every page**, not just `/adhkar/`, per `scripts/build.js`
— unnecessary payload on pages that never use them; (3) no systematic
image-optimisation or responsive-`srcset` audit has been done across
the campus gallery.

**Recommended actions.** Run one real Lighthouse pass against the
homepage and two or three deep pages before trusting any score in this
category. If the Adhkar scripts genuinely aren't needed outside
`/adhkar/` and the homepage teaser, scope their `<script>` tags to just
those pages in `scripts/build.js` — a small, mechanical, low-risk fix
with a real payload-size win.

---

## What this assessment is not

It is not a substitute for running real tools where real tools exist
(Lighthouse, axe-core) — two categories say so explicitly above. It is
not a claim that every listed gap is equally urgent — the Admissions
fee schedule and the accreditation/registration number are, in this
assessor's judgment, the two highest-value *content* gaps on the whole
site, ahead of any further code or design work. And it is not a reason
to delay Staff Identity & Role System — per the brief that requested
this document, the public-facing layer is solid enough to build on, and
the single biggest lever left to move the Digital Campus Visibility
score is exactly that next phase.
