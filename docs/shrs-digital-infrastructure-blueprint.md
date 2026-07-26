# SHRS Digital Infrastructure Blueprint v1.0

**Status: Designed.** This is an architecture document, not a
deployment record — nothing described here is claimed to be Deployed,
Staging Verified, or Production Verified. See
`docs/digital-campus-master-deployment-directive.md` for the evidence
behind every "does not yet exist" statement in this document, and for
the terminology policy this document follows throughout.

## 1. Domain architecture (future — not purchased, not confirmed owned)

| Subdomain | Purpose |
|---|---|
| `shroyalschools.com` (or `.ng`, whichever is actually owned/renewed — see the Account Creation Playbook) | Public marketing site |
| `portal.shroyalschools.com` | Guardian/Student/Staff portals, unified under one subdomain |
| `admissions.shroyalschools.com` | Admissions-specific funnel |
| `lms.shroyalschools.com` | Future LMS (Not Started — see the Master Deployment Directive's roadmap) |
| `library.shroyalschools.com` | Future digital library (Not Started) |
| `staff.shroyalschools.com` | Staff-only surfaces, separated from guardian/student traffic |
| `registry.shroyalschools.com` | Registrar's Office, if it grows enough to warrant its own subdomain |

**Today, all of this — public site and every `/portal/...` path — is
served from one origin, with no subdomain separation at all.**
Introducing subdomains later means: cookie domain scoping (each session
cookie in `functions/_lib/session.js` would need `Domain=` set
deliberately, or a shared parent-domain cookie), CORS configuration for
any cross-subdomain fetches, and DNS + TLS provisioning per subdomain.
This is real migration work, not a byproduct of buying a domain — it
should be scoped and scheduled as its own step, likely *after* the
staging environment (Deliverable's Phase 3 equivalent) proves the
single-origin model works, not before.

## 2. Cloud architecture — the recommended stack, and how its pieces interact

**Recommendation: Cloudflare Pages + Pages Functions, Neon Postgres,
Cloudflare R2 (added later), Resend.** This is not a fresh evaluation —
three of these four are already integrated in this codebase for a
concrete, empirically-tested reason, not a preference.

```
Browser
   │  HTTPS
   ▼
Cloudflare Pages (static assets: /, /academics/, /policies/, ...)
   │
   ├── /api/* requests ──▶ Cloudflare Pages Functions (Workers runtime)
   │                            │
   │                            ├── functions/_lib/db.js ──▶ Neon Postgres
   │                            │        (via @neondatabase/serverless,
   │                            │         HTTP driver — NOT raw TCP)
   │                            │
   │                            ├── functions/_lib/email.js ──▶ Resend REST API
   │                            │        (transactional email only:
   │                            │         verification links, resets)
   │                            │
   │                            └── functions/_lib/session.js
   │                                     (HMAC-signed cookies, no
   │                                      server-side session store —
   │                                      no Cloudflare KV/D1 needed
   │                                      for sessions themselves)
   │
   └── (future) file uploads ──▶ Cloudflare R2
                                       (KYC documents/selfies —
                                        only once Board-approved,
                                        see the reality-check doc)
```

Why each piece, specifically:

- **Cloudflare Pages Functions** — every route in `functions/api/` is
  already written to this exact request shape
  (`onRequestGet`/`onRequestPost({ request, env })`) and has been run,
  this engagement, under `wrangler pages dev` against a local database.
  Zero rewrite needed to actually deploy it.
- **Neon Postgres** — chosen specifically because Workers cannot hold a
  persistent TCP connection. This was not a theoretical concern: this
  engagement **empirically confirmed** that a `pg.Pool` (plain TCP)
  hangs the Workers isolate on a second request, forcing a runtime kill.
  Neon's HTTP-based driver (`@neondatabase/serverless`) exists to avoid
  exactly this, and every query in this codebase already uses its
  tagged-template/`.query()` shape.
- **Resend** — chosen for a one-call, no-SDK, fetch-only integration
  (`functions/_lib/email.js` is a single `fetch()` call to Resend's REST
  API) — no npm dependency, no binary, works unmodified inside a
  Workers isolate.
- **Cloudflare R2** — not integrated today, and should not be until the
  KYC Document Centre is Board-approved (per the onboarding
  reality-check doc's pending decision on verify-and-discard vs.
  retain). Its only current relevance is as the eventual home for
  uploaded documents/selfies, and later a digital library.

**Alternatives considered and explicitly not recommended right now**
(full comparison table already published in
`docs/digital-campus-master-deployment-directive.md` §Phase 2 — not
repeated here): Cloudflare D1 (SQLite — would require rewriting the
schema and every `DISTINCT ON`/`RETURNING`/`ON CONFLICT` query for no
functional gain over Neon today) and Supabase (a real alternative
database, but would mean rewriting every query call site to PostgREST
or reintroducing the same TCP problem Neon was chosen to avoid).

## 3. Database architecture — entity map

This is a relationship map, not a repeat of the DDL (that's
`sql/schema.sql`, the single source of truth for column-level detail).

```
guardians ──< guardian_student >── students ──< student_classes >── classes ── institutions
    │                                    │                                          │
    ├──< guardian_emergency_contacts     ├──< attendance_summary                    └── departments (empty — see
    ├──< guardian_educational_interests  ├──< term_results                              Master Academic Structure
    ├──< admissions_applications         ├──< fee_status                                Register §5)
    └──< notifications                   ├──< certificates
                                         ├──< student_lifecycle_events
                                         ├──< student_accounts (student's own login)
                                         └── (if Qur'an College) ──< hifz_enrolment
                                                                  ──< hifz_progress (×30 Juz')
                                                                  ──< ijazah_register

staff ──< staff_roles >── roles                 staff ──< staff_institutions >── institutions
  │                                                │
  ├──< staff_accounts (staff's own login)          └── reports_to_staff_id (self-reference,
  ├──< teacher_class_assignments >── classes           real org-chart, see Master Academic
  └──< delegations                                      Structure Register §9)

auth_audit_log / staff_audit_log — polymorphic event log, no FK
  (actor_type + actor_id, matching the same soft-reference precedent
  already used for academic_terms)
```

Five relationship families carry the whole system: **guardian↔student**
(who may act for whom), **student↔class** (supporting real
multi-institution dual enrolment — a student is never assumed to belong
to exactly one class), **staff↔role↔institution** (the Permission
Engine's entire input), **student↔academic-record** (attendance,
results, fees, certificates, lifecycle events — all scoped to one
student, one term at a time), and **the Qur'an College sub-graph**
(enrolment stage → per-Juz' progress → permanent Ijazah register),
which is deliberately separate from the generic academic-record tables
because its lifecycle (memorisation status, never deleted Ijazah
grants) doesn't match a normal term-by-term result.

## 4. What this blueprint does not claim

It does not claim any of the above is running anywhere reachable. Every
piece described here is **Developed** (code exists, proven to run
locally) and, for the schema, **Merged**. None of it is **Staging
Verified** or **Production Verified** — see the Account Creation
Playbook for the account-level actions that would need to happen before
either status becomes true.
