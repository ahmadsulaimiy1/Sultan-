# SHRS Digital Campus Maturity Report — First Formal Edition

Ten areas, each scored on a five-level maturity scale, evidence-only.
No area is scored above what a specific, cited fact in this repository
or this engagement's own testing supports. No area is scored
aspirationally for "the design is good, so it should count for more" —
a good design that isn't populated, verified, or operating scores
lower than a good design that is, by definition of the scale itself.

## The scale

| Level | Name | Meaning |
|---|---|---|
| 0 | Absent | Not started. No design, no code. |
| 1 | Initial | Ad hoc — some code or documents exist, real gaps dominate, little consistency. |
| 2 | Developing | Documented and/or coded with real intent, but not fully populated with real data, or a known structural gap remains open. |
| 3 | Defined | Consistently designed, real code exists, genuinely tested (locally), no major structural gap — the ceiling for anything not yet running anywhere reachable. |
| 4 | Managed | Verified in a real, reachable environment (staging), with some operational oversight. |
| 5 | Optimized | Production-verified, monitored, and iterated on with real usage data. |

**No area in this report scores above Level 3**, because nothing in
this project has reached Staging Verified or Production Verified
status — see `docs/digital-campus-master-deployment-directive.md`'s
own evidence on this. This is a structural ceiling, not a
per-area judgment call.

## Scores

| Area | Score | Evidence |
|---|---|---|
| **Governance** | 3 — Defined | A genuinely large, real policy corpus exists: Constitution & Governance Charter, Role & Permission Matrix, Data Ownership/Lifecycle Registers, a Governance Master Register, a Resolution Register. Capped at 3, not 4+, because `governance-master-register.md` itself records Committee Charters as only PARTIAL (2 of an unstated total), and this engagement found only one Permission Engine grant scope (`EXE`'s aggregate-only qualifier) actually enforced in code out of many documented scope qualifiers — governance intent regularly outruns code enforcement. |
| **Identity** | 2 — Developing | Three real, working session systems (guardian/student/staff); a data-driven Permission Engine. Held at 2, not 3, because Executive Identity is an open migration gap (bearer token, not a real login — `docs/executive-identity-design.md`), and because almost no real named person has an actual account today — the Role & Permission Matrix names two real established individuals (CEO, Registrar) and neither has a real `staff` row yet. |
| **Security** | 2 — Developing | Real, correct fundamentals: `scrypt` password hashing, timing-safe token comparisons, 5-attempt/15-minute lockout with audit logging. Held at 2 because no CSRF token exists anywhere in this project, no MFA exists, and the audit log covers authentication events only — no record of *who changed what* in academic/financial data. |
| **Infrastructure** | 1 — Initial | Every Pages Function is written and proven to run under `wrangler pages dev` against a local database. But no Cloudflare Pages project, no Neon production database, no CI/CD pipeline, and no confirmed domain exist anywhere reachable — confirmed by this session's own blocked attempt to reach `shroyalschools.ng`. Code readiness does not raise this score; operational existence does, and there is none. |
| **Academic Operations** | 2 — Developing | Real subject-teacher data now exists for Royal College JSS/SSS and real named Qur'an College/Islamic Studies faculty (`docs/master-academic-structure-register.md` §4) — a genuine step up from a fully-generic state. Held at 2, not 3, because the class ladder exists only in documentation (not as populated `classes` rows beyond ad-hoc test examples), the `departments` table remains empty pending Board adoption, and zero real students or real staff logins exist for any of the named teachers yet. |
| **Student Experience** | 2 — Developing | Student Portal, Hifz Journey (5-stage, per-Juz' tracking), and dual/multi-institution enrolment are all real, working, tested locally. Held at 2 because zero real students use it — every verification this engagement has run used Sample Institutional Records — and no LMS exists to give a student anything beyond attendance/results/fees/Hifz snapshots. |
| **Parent Experience** | 3 — Defined | The most mature area of the whole project. Registration, email verification, a full optional Institutional Identity Profile with computed completion %, admissions applications, notifications, and the Adhkār Centre are all real, and this specific area received the most rigorous verification this engagement has produced — an actual local PostgreSQL instance driving the real, unmodified code end-to-end, not route-mocked. Still capped at 3 because none of it has ever been reached by a real parent at a real URL. |
| **Digital Learning (LMS)** | 0 — Absent | No courses, modules, lessons, assessments, or content-authoring/hosting exist anywhere in this project. Repeatedly, explicitly deferred (`docs/digital-campus-roadmap.md`'s own original conclusion) — this is not an oversight, it's a stated scope decision, and this report holds it at the honest score that decision implies. |
| **Data Management** | 1 — Initial | A well-designed 36-table schema exists, with real referential integrity and a genuine dual-enrolment/multi-institution model. Held at 1, not higher, because: no backup policy or tooling exists at all; no data-retention *enforcement* exists (IT-04 is a real, Board-approved policy, but nothing in the running system auto-archives or auto-purges on a schedule); and almost no real institutional data has ever been entered — every database this engagement has used was a local, disposable sandbox instance. |
| **Deployment Readiness** | 0 — Absent | No Cloudflare Pages project, no Neon production project, no domain confirmed reachable, no CI/CD, no monitoring, no backup, no disaster recovery, no incident-response owner named. Every item on `docs/shrs-deployment-readiness-checklist.md` is unchecked except two partial security items. This is the accurate, unhedged score the Master Deployment Directive's own audit already established — repeated here rather than softened for this report. |

## Overall pattern

**Design and code quality consistently outpaces operational
existence.** Every area above scores at least one full level lower
than its underlying code/documentation quality alone would suggest,
for the same reason in every case: nothing has been run anywhere a
real person could reach it. This is not a criticism of the engineering
— it is the literal, structural meaning of a project that has never
left local development. The single highest-leverage action available
to raise every score in this report simultaneously is not more design
or more code: it is completing Phase 1 of the Account Creation
Playbook (a real Cloudflare Pages project + a real Neon staging
project) and re-running this same evidence-gathering exercise once a
staging URL genuinely exists.
