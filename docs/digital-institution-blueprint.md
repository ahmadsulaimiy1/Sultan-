# SHRS Digital Institution Blueprint v1.0

*Written in response to the "Institutional Architecture Directive": stop
sequencing features, map the institution, then sequence modules against
that map. This document does that — grounded in SHRS's own already-
published governance canon (`docs/policies/`, `governance-master-
register.md`), not invented titles or bodies. Two corrections to the
requesting brief are made explicitly below, in the same spirit as every
other correction in this engagement: state it plainly, don't silently
comply with something that would misrepresent the institution, and
don't silently ignore the request either.*

---

## Two corrections before the map

**There is one Board, not two.** GV-01 (Constitution & Governance
Charter) establishes a single **Board of Trustees** as "the institution's
ultimate governing body." There is no separate "Board of Governors" —
`about-governance.html` and GV-01 both describe one board above an
Executive Management Team. This blueprint uses "Board of Trustees"
throughout and does not introduce a second board.

**"Academic Council," "Senate," "Quality Assurance," and "Examinations
Office" do not exist yet.** No governance document names any of these.
What exists today: the **Registrar** (a real, named, active role —
academic records, promotion/probation thresholds, exam-misconduct
escalation, admissions verification, transfers, withdrawals), the
**Executive Management Team** (CEO + Principals/Head Teacher per
institution + VP Administration + ICT Head + Head of R&D), and a policy
code **AC-03 Examination Policy** that the index itself lists as
**Missing**. Where this blueprint uses "Examinations" below, it means
*Registrar-owned examination workflow*, not a separate office — inventing
one would misdescribe the institution's actual structure.

---

## Part 1 — The Institution Map

Nine governance/administrative offices, four academic institutions, and
three digital surfaces. For each: real actor, current digital state,
core workflows, core records, approval chain, and the permission
boundary a digital system for it would need to enforce.

### Governance & Executive

| Office | Real actor(s) | Digital state today | Core workflows | Core records | Approval chain | Permission boundary needed |
|---|---|---|---|---|---|---|
| **Board of Trustees** | Board (composition undocumented — GV-02 Board Charter is Missing) | None | Approve Tier-1 policy, appoint/hold CEO accountable, receive annual DSL/ICT reports | Board resolutions (`governance-resolution-register.md`, file-based) | Board is the terminal approval authority | Board-only read access to institution-wide aggregates; no operational write access |
| **CEO** (Founder/CEO — Zakariya Olanrewaju Anofi) | One person | None — the "Founder Dashboard" the directive asks for doesn't exist | Approve Tier 2–4 documents, cross-institution oversight | — | Reports to Board | Read-only aggregate across all four institutions; not a data-entry role |
| **Executive Management Team** | CEO + 4 Principals/Head Teachers + VP Administration + Registrar + ICT Head + Head R&D | None as a body; individual members interact with the site only as visitors today | Cross-institution coordination | — | Reports to CEO | N/A — a meeting body, not a data system, unless the Board later wants a shared EMT dashboard |

### Registrar's Office

| | |
|---|---|
| **Real actor** | Registrar, Royal College (Mrs. Anofi-Abdulkareem Mariam Tope) — the only office in this map with a named person **and** a documented job description already (AC-02, PA-05) |
| **Digital state today** | Partial, API-only: `admin/students.js` covers enrolment (create/update student + guardian + class), `admin/create-student-login.js` issues Student Portal credentials. Nothing else. |
| **Workflows the office actually owns (per AC-02/PA-05)** | Admissions document verification, waiting-list administration, enrolment, promotion/probation threshold-setting (jointly with Principals), transfer review (incl. disciplinary/safeguarding history via DSL), withdrawal processing, exam-misconduct escalation, academic-appeal handling, full academic-record retention |
| **Workflows with NO digital trace at all** | Promotion decisions, graduation, certificate issuance, transcript generation, third-party credential verification, transfer-in/out record, withdrawal record (only a status flag exists: `students.status`) |
| **Core records needed, not yet modelled** | `promotion_decisions`, `graduations`, `certificates`, `transfers`, `withdrawals` — none exist. `students.status` (active/graduated/withdrawn/suspended) is the only trace, and it's a flag, not a workflow with a date, reason, or approving officer. |
| **Approval chain** | Registrar decides; Principal co-signs promotion/probation; Board Charter (GV-02) would define anything above that — not yet documented |
| **Permission boundary needed** | Full read/write on academic records across all four institutions; no fee/finance access; no HR access |

### Academic Office (per institution)

| | |
|---|---|
| **Real actor** | Principal / Head Teacher per institution (named for Nursery & Primary: Mrs. Kareemat Abdurazaq; others not named in current docs) |
| **Digital state today** | None. All `term_results`/`attendance_summary` entry happens via the Registrar-equivalent admin token, not per-teacher, per-subject |
| **Core workflows missing** | Timetable, subject/curriculum assignment (AC-08 Curriculum Framework is itself only Partial), lesson planning, per-teacher grade entry, report-card generation |
| **Permission boundary needed** | Principal: read/write within their own institution only. This is the first office where "which institution does this person belong to" becomes a real access-control question — today every admin action is one undifferentiated bearer token |

### Examinations (Registrar-owned; AC-03 policy itself is Missing)

| | |
|---|---|
| **Digital state today** | `term_results` exists (subject, CA score, exam score, total, teacher comment) — but it's a flat table populated by whoever holds the admin token, not a workflow (no assessment → grading → moderation → publication pipeline, no promotion-decision linkage) |
| **Blocked on** | A real Examination Policy (AC-03) doesn't exist yet — same "blocked on a real institutional decision, not just code" situation as FN-03 Tuition & Fees Policy being blocked on real fee data |

### Finance Office

| | |
|---|---|
| **Digital state today** | `fee_status` (amount due/paid per term) is the entire footprint — a balance, not a ledger. No receipts, no instalments, no payment gateway, no scholarships |
| **Blocked on** | FN-03 Tuition & Fees Policy, FN-04 Refund Policy, FN-05 Scholarship Governance Framework are all listed **Missing — blocked on real fee data** in the policy index itself. Building a real Finance module before that policy work exists would mean inventing the fee structure, not digitizing it. |
| **Permission boundary needed** | Finance role: read/write fee records across all institutions; explicitly NOT academic-record access — FN-01 Financial Controls Policy already establishes separation-of-duties as a principle |

### Student Affairs / Boarding / ICT / Library

| Office | Digital state | Note |
|---|---|---|
| **Student Affairs** | None (Adhkar/spiritual-life tracking exists but sits outside a formal "Student Affairs" data model) | SD-05 Attendance Policy, SD-06 Welfare Policy, SD-07 Behaviour Policy are all Missing/Partial |
| **Boarding** | `institution`/`className` free text can represent a boarding class, but no occupancy, room, or welfare-check model exists | SD-04 Boarding Regulations is drafted and published; the digital system to match it is not |
| **ICT Office** | This project itself (site, portals, AI assistant) — but no formal ICT service-desk/asset system | IT-06 Technology Governance Framework exists as an evaluation document; IT-07 Incident Response and IT-08 Cybersecurity Framework are Missing |
| **Library** | Not mentioned anywhere in governance canon | Genuinely ungoverned — not even a policy gap has been named yet. Do not build this before someone decides it should exist. |

### The four academic institutions (confirmed real names/slugs)

| Institution | Real name | Page | Digital state |
|---|---|---|---|
| Nursery & Primary | "Nursery & Primary School," ages 2–10 | `academics/nursery-primary/` | Marketing only; can enrol students today (generic `institution`/`className` text) but no age/division-specific dashboard content |
| Royal College | Junior **and** senior secondary combined | `academics/royal-college/` | Same — generic enrolment only |
| Qur'an College | 24–36 month day & boarding Hifz programme | `academics/quran-college/` | **Fully digitized**: dual-enrolment-aware, per-Juz' progress, 5-stage journey, Ijazah register — the one institution with a real module (Phase 2 of this engagement) |
| School of Arabic & Islamic Studies | Full name is "School of Arabic & Islamic Studies," weekday/weekend, open to the wider Muslim Ummah | `academics/arabic-islamic-studies/` | Generic enrolment only — no distinct curriculum/level model despite being a named division with its own real structure |

### Digital surfaces (built vs. not)

| Surface | State |
|---|---|
| **Parent Portal** | Built — login, dashboard, notifications, Adhkar tracking, Hifz snapshot, dual-enrolment chips |
| **Student Portal** | Built — login, dashboard, transcript preview, Hifz & Ijazah panel, honest empty state for assignments |
| **Staff Portal** | **Does not exist.** No staff/teacher authentication of any kind. Every "admin" action on this site today is one undifferentiated bearer token (`PORTAL_ADMIN_TOKEN`, `PORTAL_QURAN_TOKEN`), not a person logging in as themself. |
| **AI Assistant** | Built (earlier phase) — office-routing chat, not tied to the portal data model |
| **Public site** | Built — 28 pages, EN/AR, Personalisation Centre, search |

---

## Part 2 — What actually unlocks what (the dependency graph)

The directive's own instinct — "Teacher Portal or Registrar System,
because these unlock multiple future modules" — is close, but the
technical dependency graph points one layer beneath both:

```
Staff Identity & Role System  (NEW — doesn't exist)
        │
        ├── unlocks → Teacher Portal (class-scoped attendance/grading)
        │                     │
        │                     └── unlocks → real Examinations workflow
        │                                   (grades entered by the actual
        │                                    teacher, not office staff)
        │
        ├── unlocks → Registrar System UI (promotion/graduation/
        │             transfers/withdrawals/certificates) — the API-only
        │             version is buildable without this, but a real
        │             "Registrar logs in as themself" system needs it
        │
        └── unlocks → Finance role separation (today's single admin
                       token has no separation of duties at all — FN-01
                       already names this as a principle)
```

Every one of Teacher Portal, Registrar System (as a login, not API),
and Finance role separation needs the same underlying thing: **a
person-level staff identity, not a shared bearer token.** That's the
true foundational layer — not because it's exciting on its own, but
because everything downstream is blocked on it the same way FN-03/04/05
are blocked on real fee policy.

Separately, the **Founder Dashboard** the directive names is *not* on
this dependency chain at all — it's a pure read-aggregation over data
that already exists (`students`, `student_classes`, `attendance_summary`,
`fee_status`, `hifz_progress`). It needs no new auth surface, no new
data model, and no policy decision. It is also the cheapest possible way
to find out — honestly, by trying to build it — exactly which of the
directive's requested KPIs the current data can actually support today
("total students," "attendance trends," "Hifz completion rate": yes;
"revenue" and "admissions pipeline": no, because a ledger and a
pre-enrolment pipeline don't exist yet).

---

## Part 3 — Ranked module recommendation

| Rank | Module | Value | Complexity | Dependencies | Risk | Est. effort |
|---|---|---|---|---|---|---|
| 1 | **Founder/Executive Dashboard** (read-only aggregate: total/active students, per-institution breakdown, attendance trend, Hifz completion, fee due/paid totals) | High — directly answers "CEO shouldn't log into five systems"; zero new blast radius | Low — pure aggregate SQL over existing tables, one bearer-token-gated page (same pattern as `admin/*`) | None | Low — read-only, no write path, nothing to break | Small (1–2 sessions) |
| 2 | **Staff Identity & Role System** (a third real login — Teacher/Registrar/Finance/Principal roles, parallel session cookie like the student one) | High — foundational; nothing else on this list works as a real login system without it | Medium-High — new auth surface (proven pattern, third time), but now needs actual role-based permission boundaries, not just "one role sees one thing" | None technically; needs the Board/CEO to decide who actually gets accounts first (a real institutional decision, like GV-02's missing Board Charter) | Medium — a third auth surface is a bigger attack surface; must not repeat the guardian/student pattern sloppily | Medium |
| 3 | **Registrar System** (promotion/graduation/transfer/withdrawal records, certificate issuance, transcript generation, verification) | High — the best-documented office in existing governance (AC-02, PA-05 already specify its responsibilities in detail); directly closes the "no digital trace of promotion/graduation" gap named above | Medium — mostly new tables + workflow states on top of what exists; certificate/verification adds PDF generation + a public verification endpoint (same shape as the deferred IQ-02 §7.5 Ijazah verification) | Benefits from #2 (real Registrar login) but a first pass could ship API-only, matching this project's own established "protected API first, UI later" convention | Low-Medium — mostly additive data, real institutional records so correctness matters | Medium |
| 4 | **Teacher Portal** (class-scoped attendance entry, grading, feedback, Hifz/Muraja'ah supervision for Qur'an College staff) | High — the SHRS-specific differentiator (Hifz/Muraja'ah supervision) makes this more than a generic teacher tool | Medium-High — needs #2, plus a real subject/timetable model that doesn't exist yet | #2 (Staff Identity); partially blocks #5 | Medium — first system where a non-office-staff person enters grades that affect real records | Medium-Large |
| 5 | **Examinations & Assessment workflow** (assessment → grading → moderation → report card → promotion decision) | High long-term, but currently blocked on a real policy decision | Medium-High | #2, #4, and a drafted AC-03 Examination Policy (currently Missing — this is a policy gap, not a code gap) | Medium — grading affects real student outcomes; should not be built ahead of the policy that governs it | Large |
| 6 | **Finance / Fee Ledger** (real ledger, receipts, instalments — not just a due/paid balance) | High family-facing value | Medium | #2 for role separation; blocked on FN-03/04/05 (Missing — blocked on real fee data, per the policy index itself) | High if built ahead of real fee data/policy — this is exactly the "invent numbers" trap this engagement has consistently avoided | Medium, but shouldn't start until the policy blocker clears |
| 7 | **Admissions Pipeline** (pre-enrolment: applications, offers, waiting list as a real workflow — today the Registrar does this off-system) | Medium-High | Medium | #2 | Low | Medium |
| 8 | **Staff/HR Portal** | Medium | Medium-High | #2; HR-04/05/06/07 (Grievance/Discipline/Recruitment/Performance policies) all Missing | Medium — HR data is sensitive | Large |
| 9 | **Boarding Office system** (occupancy, room assignment, welfare checks) | Medium | Medium | #2 | Low | Medium |
| 10 | **Library** | Low-Medium — not even named in governance canon yet | Low-Medium | None | Low | Small, but shouldn't be built before someone decides the school wants a digital library system at all |

---

## Status update

**Phase 1 (Founder/Executive Dashboard) is built** — see
`docs/founder-dashboard.md`. Before Phase 2 (Staff Identity & Role
System) implementation begins, the required governance artefacts have
been produced: `docs/role-permission-matrix.md` (every role × every
system area, established vs. proposed, least-privilege-justified) and
`docs/data-ownership-register.md` (every record type's owner, retention,
approval, export, and deletion authority). Staff Identity code should be
built directly against those two documents, not designed ad hoc.

## Recommendation

Build **#1 (Founder Dashboard) first** — it's cheap, safe, immediately
useful, and its own construction will produce an honest inventory of
which requested KPIs are real today versus aspirational. Then **#2
(Staff Identity & Role System)** — not because it's the flashiest module,
but because it's the one piece every subsequent office-facing system
(#3, #4, #6, #7, #8, #9) is genuinely blocked on, the same way this
project's earlier phases were blocked on real database infrastructure
before anything else could be real. **#3 (Registrar System)** is the
strongest first *office* to build on top of it — it's the only office in
this map that already has a named person and a documented job
description to build against, rather than a policy gap.

This is a recommendation, not a decision already made — say which one
to start, or reorder this list, and that becomes the next scoped phase.
