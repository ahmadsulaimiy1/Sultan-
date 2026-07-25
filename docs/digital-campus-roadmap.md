# Sultan Hanafi Digital Campus — Reality Check & Roadmap

*Response to the "Founder's Supreme LMS Architecture Mandate." Written as
an honest engineering and education-domain assessment, not a persona
exercise — the governing-board framing in the brief is a way of asking for
maximum ambition, and the ambition is worth taking seriously. This
document takes it seriously by being straight about scope, cost, and
sequencing, which is more useful than a page of invented modules that
never actually ship.*

---

## What exists today vs. what's being asked for

*Updated after Phase 2 (see `student-portal.md`) — the paragraph below
described the state before either portal existed; kept for context on
how far this has come, not as the current picture.*

> The current build is a static marketing site (28 prebuilt HTML pages,
> English + Arabic) plus one real feature with a backend: the Digital
> Academic Assistant, a single Vercel Edge Function calling Claude. There
> is no database, no user accounts, no login, no stored student records.

**As of Phase 2**, this site runs on Cloudflare Pages Functions + a Neon
Postgres database, and has two real, independent, database-backed
authenticated roles: guardians (`parent-portal.md`) and students
(`student-portal.md`), each with their own session, lockout, and
activation flow. Real stored data: student records, attendance, term
results, fee status, in-portal notifications, Adhkār completion tracking,
and — the one part of this roadmap's original brief with genuine
Qur'an-College-specific depth — per-Juz' Hifz progress, current stage of
the school's own published 5-stage Hifz Journey, and a permanent Ijazah
register. A small `auth_audit_log` table records login attempts across
both roles.

Still not built, and still real future work (see below, mostly
unchanged): a full LMS (courses, modules, lessons, assessments,
certificates, content authoring, video/PDF/slide hosting, discussion
boards, learning analytics), Teacher/Principal/Administrator/Admissions/
Finance roles, MFA/SSO, payment integration, ID cards, a public Ijazah
verification endpoint, and Arabic translation / Personalisation Centre
support for the portal (both portals are English-only, hand-authored
pages outside the site's build pipeline — a pre-existing gap, not new).

A Digital Campus with student/parent/teacher/admin portals, results,
attendance, fees, ID cards, Qur'an memorisation tracking, and messaging is
a **School Information System (SIS)** — a categorically different piece of
software. Real examples of what this becomes (iSAMS and Engage in the UK,
Fedena and Edves in Nigeria, PowerSchool in the US) are each multi-year
products built by dedicated teams, not a single build session. Saying that
plainly up front is more useful than pretending otherwise.

Concretely, a real version of this needs, at minimum:
- **A real database** (student records, results, attendance, fees —
  Postgres via Supabase or Vercel Postgres would be the natural fit here)
- **Authentication with role-based access control** for the ten-plus user
  types listed in the brief, each with different data visibility (a
  parent must only ever see their own children; a teacher only their own
  classes)
- **File/object storage** for photos, ID cards, and — a detail the brief
  is right to flag — audio/video Qur'an recitation submissions, which get
  large fast and need their own storage and bandwidth budget
- **Payment integration** for tuition (Paystack or Flutterwave are the
  standard Nigerian choices), with reconciliation, receipts, and
  instalment tracking
- **PDF generation** for report cards, certificates, and ID cards
- **QR generation and verification** for the ID card system
- **SMS and WhatsApp Business API** access — WhatsApp Business API
  requires Meta Business verification and is billed per conversation; SMS
  needs a local aggregator (e.g. Termii, which is Nigeria-focused)
- **A real hosting/ops budget.** This moves the project off free-tier
  static hosting into paid database, storage, and messaging costs that
  scale with the number of families using it

None of that exists yet. Before any of it gets built, it's worth naming
the one requirement that has to be designed in from the start, not added
later:

## Data protection is not optional here

This system would hold minors' academic records, attendance (which
reveals health/absence patterns), photos, and family financial data. In
Nigeria, the **Nigeria Data Protection Act 2023 (NDPA)** governs exactly
this kind of processing, and it has teeth: it expects a lawful basis for
processing children's data (ordinarily a parent/guardian's informed
consent), a designated point of accountability, a data retention policy
(how long is a graduated student's record kept?), and a breach-notification
plan. Getting this wrong isn't a style choice — it's a legal exposure for
the school, and it's the families' trust on the line. This has to be a
first-class part of the architecture, decided before the first table is
created, not bolted on after launch.

---

## Answering the founder's four questions

**1. What world-class features are genuinely missing from the brief, and
worth adding?**
- Offline-first / low-bandwidth resilience. Nigerian mobile data is
  expensive and patchy — a portal that only works on a strong connection
  will lose exactly the parents it's meant to serve. This matters more
  here than almost any single feature on the list.
- SMS as a fallback notification channel alongside WhatsApp — not
  everyone keeps WhatsApp data topped up, but basic SMS almost always
  gets through.
- A safeguarding/incident-reporting workflow (separate from academic
  discipline records) — standard in serious British schools, absent from
  the brief.
- An explicit parental-consent and data-retention flow, per the NDPA
  point above — this is a feature, not just a policy document.

**2. What would top British independent schools include that isn't
here?**
Structured pastoral care tracking (not just academic results — a
form tutor's ongoing notes on a student's wellbeing), detailed
per-term written reports (not just numeric results), and an alumni
relations module for long-term community building. British SIS
platforms also lean heavily on integration with exam boards — the
Nigerian/Saudi equivalent here would be WAEC/NECO result import and,
for the Islamiyyah/Qur'an tracks, a structured Ijazah record that
could plausibly be presented to external Islamic institutions as a
verifiable credential.

**3. What would top Saudi educational institutions include?**
Tight integration between attendance and the prayer schedule (many
Saudi school systems structure the day and track attendance around
Salah, not just class periods), and far more granular Qur'an
memorisation tracking than a generic LMS offers — current Surah,
current Juz', muraja'ah (revision) cadence, and Tajweed assessment as
first-class data, exactly as the brief describes. This is one part of
the brief that isn't generic LMS ambition — it's a real, specific,
valuable feature this school's Qur'an College actually needs and a
generic Moodle/LearnDash setup genuinely would not provide well.

**4/5. What would make this the best Islamic-and-conventional digital
campus in Nigeria, and what should be reserved for later growth?**
Bilingual EN/AR by default (already the site's discipline — worth
carrying through the whole portal, not just the marketing pages),
WhatsApp-first communication (matches how Nigerian parents actually
communicate, more than email ever will), and genuine NDPA compliance as
a stated differentiator versus competitors who ignore it. For later
growth: multi-campus support if the school expands, an alumni network,
and an integration layer so data isn't locked into one vendor if the
school ever wants to switch systems.

---

## The honest recommendation on sequencing

Building all of this at once, or promising it all built in one sitting,
would not serve the school — it would produce either nothing real or a
prototype that quietly skips the compliance and access-control work that
actually matters once real children's data is involved. The credible path
is a real Phase 1: one working module, backed by a real database and real
authentication, used by real families, before anything else is built.

The strongest Phase 1 candidate is a **Parent Portal MVP**: parent login,
their own children's attendance and current-term results, and fee-status
— the single highest-trust, highest-value slice, and small enough to get
right (including the consent/data-protection design) before layering on
the rest.

An alternative worth naming honestly: for a 20-year-horizon ERP like this,
many schools at this stage license an existing proven SIS (Fedena and
Edves are Nigeria-market options) rather than building one bespoke module
at a time indefinitely. That's a real trade-off — less unique to the
school, but faster to a fully-featured system with support and updates
someone else maintains. Worth deciding deliberately rather than by
default.

---

## What has to be decided before any code gets written

- Who is the Data Protection Officer / accountable person for this
  system, and who owns getting parental consent in place?
- Who enters and maintains student records day to day — is there
  admin staff bandwidth for this, or does it need to be part of the
  build?
- What's the budget for database hosting, file storage, payment
  gateway fees, and WhatsApp/SMS messaging costs going forward? This is
  now an ongoing operating cost, not a one-time build.
