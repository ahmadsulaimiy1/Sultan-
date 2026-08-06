# Digital Campus — Phase 2 & 3 Roadmap

*From a strong Phase 1 pilot (78/100) to a genuinely world-class
institutional platform. Written for institutional decision-making, not
as a sprint backlog — sequencing, risk, and cost trade-offs matter more
here than implementation detail.*

**Planning assumptions used throughout:** ~5,000 students, ~500 active
parent accounts, multiple programmes (the existing five institutions),
multiple physical campuses, English/Arabic operation, and a blended
online + in-person delivery model. (Worth flagging: 500 parent accounts
for 5,000 students is a low ratio — typically closer to 1 guardian
account per 1–2 children. Using the stated figures for capacity
planning; if the real ratio is higher, infrastructure sizing below scales
up proportionally, not sound of the plan.)

---

## What "90 / 95 / 100" actually means

These aren't arbitrary points on a scorecard — each represents a
qualitatively different claim about the system:

- **90/100 — Operationally safe at today's scale.** The pilot's known
  security and process gaps are closed. Safe to run for the current
  single-campus operation with real families, with real staff processes
  around it (not just code).
- **95/100 — Ready for the stated future scale.** Multi-campus,
  bilingual, thousands of students, real academic depth (exams,
  attendance, Qur'an tracking as first-class data), teachers and
  registrars working in it daily, not just parents viewing it.
- **100/100 — Independently verified and organizationally mature.**
  Not just "everything's built" — externally audited (a self-graded 100
  isn't credible at this scale), with the operational muscle (incident
  response, disaster recovery, a real IT function) to run it as
  infrastructure the institution depends on, the same way it depends on
  its physical buildings. Treat 100 as "as complete as a serious
  institutional platform gets," not a literal finish line — every SIS at
  this scale keeps evolving indefinitely.

---

## Phase 2 — Path to 90/100 ("Operational Institution")

### Critical (block 90/100 — do these first, in roughly this order)

1. **Staff-facing admin UI with real role-based access** (registrar,
   class teacher, head teacher, finance officer, super-admin). The raw
   admin API was correct for a Phase 1 pilot; it does not scale to
   multiple staff members entering data for hundreds of students without
   a real interface and per-role permissions.
2. **Audit trail** — every record change logged with who/when/what.
   Non-negotiable once more than one person can edit records; also a
   real accountability requirement for academic/financial data.
3. **Daily attendance**, replacing the term-summary placeholder — a
   teacher-facing "take attendance" flow, with the current summary
   becoming a derived view rather than the source of truth.
4. **Fee transaction ledger + Nigerian payment gateway** (Paystack or
   Flutterwave) — real payment records, receipts, and reconciliation,
   replacing the manually-set due/paid snapshot.
5. **Self-service password reset via real email delivery** (Resend,
   Postmark, or similar) — closes the "staff-mediated reset" trade-off
   flagged explicitly in the Phase 1 audit as temporary, not acceptable
   at 500+ accounts.
6. **Distributed rate limiting / abuse protection** (Upstash or Vercel
   KV) on every public endpoint — the DB-column lockout was adequate for
   a pilot; not for real public traffic.
7. **Formal data-protection program**, not just a documented intention:
   a named accountable person (DPO role, can be an existing staff
   member), a real parental-consent capture step in admission paperwork,
   and an executed retention/deletion policy (not just a status field).
8. **Backup and disaster recovery**, tested at least once — point-in-time
   database recovery, a documented and *rehearsed* restore procedure.
9. **Migrate off the deprecated `@vercel/postgres` package** to Neon's
   supported SDK before it's actually removed, not after.

### Important (target for 90, don't block it outright)

- Teacher portal: view/manage own classes' attendance and grades.
- Subject master table + computed letter grades; class-history table
  (a student's year-by-year class record — currently only "current
  class" exists).
- Real push notifications (email first, WhatsApp Business API second)
  layered on top of the existing in-portal notification log.
- Arabic mirror of the entire portal — login, dashboard, set-password,
  all in proper RTL, matching the rest of the site's bilingual standard.
- Basic admin reporting: class-level and school-level attendance/results
  views.
- Document center (admission letters, certificates) — needs object
  storage (Vercel Blob or equivalent).

### Nice-to-have (Phase 2 tail)

- SMS fallback channel (Termii) for critical alerts, since WhatsApp data
  isn't universally reliable.
- Basic usage analytics (login frequency) to guide what to build next.
- Structured, moderated parent–teacher messaging inside the portal.

---

## Phase 3 — Path to 95–100/100 ("Multi-Campus Institutional Platform")

### Critical

1. **Multi-campus data model** — campus as a first-class entity, access
   scoped per campus for staff, cross-campus reporting for leadership.
   This is a genuine architecture decision, not a column addition — get
   it reviewed before building rather than retrofitting it later.
2. **Formal identity & access management for staff**: SSO if the school
   already uses Google Workspace or Microsoft 365, mandatory MFA for
   finance/admin roles, active session/device visibility, "sign out
   everywhere."
3. **Examination system**: CBT engine, question banks, and a real
   promotion/graduation workflow tied directly to results — matches what
   the site already documents as the school's actual assessment policy.
4. **Qur'an College and Islamiyyah academic tracking as first-class
   data** — memorisation progress (Surah/Juz'), Muraja'ah (revision)
   cadence, Tajweed assessment, Ijazah records. This is the one part of
   the original "Digital Campus" brief that's genuinely distinctive to
   this institution, not generic SIS ambition — worth real investment,
   not an afterthought bolted onto a generic results table.
5. **A documented Data Protection Impact Assessment** and formal NDPA
   compliance review (ideally with actual legal counsel, not just
   engineering judgment) — appropriate given real scale and, if any
   international/GCC families are enrolled, cross-border data
   considerations.
6. **Tested disaster recovery with defined RTO/RPO**, reviewed at least
   annually — "backed up" and "recoverable within a known time" are
   different claims.
7. **An independent third-party security audit / penetration test**
   before anything at this scale is called "world-class." No system
   should self-certify a 100 — get someone else's eyes on it.

### Important

- Full LMS layer for the "online learning" requirement: content
  delivery, assignments, submissions, tied into the same academic
  records rather than a bolted-on separate tool.
- Parent mobile app (native or a robust installable PWA) with real push
  notifications.
- Advanced reporting: cohort trend analysis, an at-risk-student flag
  (attendance + results correlation), board-level dashboards for the
  Head of Schools / Administrator and Directors.
- Full EN/AR parity across every surface, including generated documents
  and notifications, not just the UI chrome.
- Integration for external result bodies (WAEC/NECO import) and any
  applicable Nigerian education-ministry reporting.

### Nice-to-have

- Alumni network module.
- An early-warning assistant built on the same Claude integration
  already in production — summarizing a student's attendance/results
  trend for a teacher. A natural, low-cost extension of infrastructure
  that already exists, rather than a new capability from scratch.
- Hybrid/video classroom integration for online delivery (embed an
  existing provider rather than building one).

### The build-vs-buy decision belongs here, explicitly

At 5,000 students across multiple campuses, this stops being a
"which features are missing" question and becomes a real total-cost-of-
ownership decision. Licensing an established SIS (Fedena, Edves, or an
international platform) buys years of accumulated feature depth,
compliance work, and vendor support that this roadmap would otherwise
need to build and maintain indefinitely. The case for continuing bespoke
is the Qur'an/Islamiyyah tracking depth (genuinely differentiated) and
full ownership of the data model; the case against is everything else on
this list being real, ongoing engineering investment. This is a board-
level decision to make deliberately at the start of Phase 3, not default
into.

---

## Effort, infrastructure, operations, and cost

*Ranges, not false precision — calibrated to what a CIO would actually
tell a board, and to Nigerian-context reality that most of these are
USD-denominated SaaS costs against a Naira budget.*

### Phase 2

- **Development effort:** roughly 4–6 months for a small dedicated team
  (2–3 full-stack engineers, 1 QA) working full-time; substantially
  longer as a side effort. This exceeds what a single AI-assisted
  session should attempt in one sitting — it needs a staffed team or an
  engaged development partner, with this document as their brief.
- **Infrastructure:** Vercel Pro (team seats, higher limits), a paid
  Postgres/Neon tier, object storage (Vercel Blob or S3-compatible),
  transactional email (Resend/Postmark, ~$20–100/mo depending on
  volume), a payment gateway (transaction-fee based, no fixed cost),
  Upstash Redis for rate limiting (~$10–50/mo). Rough combined infra
  cost: **$100–400/month** at this stage.
- **Operational:** a named data-protection accountable person (can be an
  existing staff role with added responsibility, not necessarily a new
  hire yet), a support process for parent account issues, a release/QA
  cadence before each deploy.
- **Cost implication:** the dominant cost here is development labor, not
  infrastructure — budget accordingly rather than assuming a low
  monthly SaaS bill is the whole picture.

### Phase 3

- **Development effort:** 12–18+ months across multiple workstreams
  (core SIS/multi-campus, exams/LMS, mobile) — genuinely a "hire a
  team or engage a vendor" scale of effort. If licensing is chosen
  instead (see build-vs-buy above), this collapses into an integration
  and migration effort instead, on a different timeline.
- **Infrastructure:** higher-tier managed Postgres, CDN for media/LMS
  content if built in-house, dedicated security tooling (a WAF, and
  Vercel's own SIEM add-on is already available on this account's
  plan). Multi-region hosting is likely unnecessary if all campuses stay
  within Nigeria — single-region Vercel deployment remains adequate.
- **Operational:** a real (even if small) IT function — a SIS
  administrator, a support contact, and a part-time security consultant
  relationship — plus an incident-response runbook and an annual
  security-audit budget line.
- **Cost implication:** infrastructure alone likely **$500–2,000+/month**
  at this point, on top of the larger one-time/ongoing development
  investment above — and this is precisely the number to weigh against
  a licensed SIS's subscription cost when making the build-vs-buy call.

---

## How this connects to what already exists

Phase 1 (this pilot) already proved the pattern this roadmap scales:
static-first where possible, a real database only where genuinely
needed, honest "not configured" failures instead of fake functionality,
and features gated behind real infrastructure the school explicitly
provisions. Phase 2 and 3 are more of that discipline at greater depth
and scale — not a different philosophy, a bigger, better-staffed version
of the same one.
