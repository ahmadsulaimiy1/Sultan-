# SHRS Institutional Data Architecture v1.0

The next major task for SHRS's digital campus is not more code — it is
**real institutional data**, replacing the Sample Institutional Records
this engagement has relied on for testing since Phase 1A. This document
maps every entity the school needs to run at scale onto the schema that
already exists, states plainly what each entity is missing before it
can hold real data, and defines the collection process. It does not
invent any real names, numbers, or figures — SHRS has none in this
system yet (see `docs/digital-campus-master-deployment-directive.md`'s
Phase 1 audit), and this document treats that as the honest starting
point.

## 1. What already exists vs. what "at scale" requires

| Entity | Schema table(s) | Structurally ready for real data? | What's missing before real entry begins |
|---|---|---|---|
| Students | `students`, `student_classes` | Yes | Nothing structural — `admin/students.js` already supports real creation. The gap is operational: someone must actually enter each real student. |
| Parents/Guardians | `guardians`, `guardian_student` | Yes | Same — self-registration (Phase 1A) is real and working; the gap is that no real guardian has registered yet. |
| Teachers | `staff`, `staff_roles` (`TCH`), `teacher_class_assignments` | Yes | Real subject/teacher assignments now exist on paper for Royal College JSS/SSS and Qur'an College/Islamic Studies faculty — see `docs/master-academic-structure-register.md` §4. **Not yet entered as real `staff` rows** — no Staff ID, institutional email, or login exists for any of them yet (see `docs/institutional-data-readiness-framework.md`'s Teacher section for exactly which fields are Mandatory vs. Recommended for this step). |
| Staff (all roles) | `staff`, `staff_roles`, `staff_institutions` | Yes | Same. Real onboarding requires `admin/staff.js`'s `create-staff` → `create-login` → `grant-role` sequence, run by whoever holds `PORTAL_SYSADMIN_TOKEN` — see `docs/staff-identity-architecture.md`. |
| Classes | `classes`, `student_classes` | Yes, but only ad-hoc examples exist (`JSS 1`, `Hifz Year 2`, `Iʿdādiyyah 1`) | The full class ladder per institution is a **Master Academic Structure Register gap** (§1 of that document) — real classes cannot be entered at scale until the school supplies the complete level structure. |
| Subjects | `term_results.subject` (free text, no reference table) | Partially | No `subjects` table exists. Free text works for individual entry but cannot support "at scale" reporting (e.g. a school-wide subject-performance report) until subjects are a real reference table — itself blocked on the same Master Academic Structure Register gap (§4). |
| Academic Sessions/Terms | `academic_terms` | Yes | Structurally complete (`label`, `is_current`) — real terms just need to be entered as they occur (e.g. "First Term 2026/2027"). No gap. |
| Admissions | `admissions_applications` | Yes, for the honest subset already built | Document upload is Not Started (needs R2 — see the Infrastructure Blueprint); everything else (submit/review/status) is real and working. |
| Fees | `fee_status` | Partially | This is a due/paid **snapshot**, explicitly documented as "not a real ledger with receipts or instalments" (see `docs/founder-dashboard.md`'s fees note, FN-03 in the policy index). Real fee amounts can be entered today; a real ledger/invoicing system is separate, larger work, already named as deferred. |
| Hifz Programme | `hifz_progress`, `hifz_enrolment`, `ijazah_register` | Yes | Fully real, structurally complete — see §3 of the Master Academic Structure Register. No gap for entering real Hifz data once real Qur'an College students exist. |
| Islamic & Arabic Studies programme | `classes` (institution = `Islamic & Arabic Studies`), `student_classes` | Yes, generically | No programme-specific data model beyond generic class enrolment — same class-ladder gap as Royal College/Nursery & Primary. |
| Royal College programme | `classes`, `term_results`, `attendance_summary` | Yes, generically | Same class-ladder/subject gap. |
| Nursery & Primary programme | `classes` | Yes, generically | Same. |

## 2. The real-data collection process (replacing Sample Institutional Records)

This is a sequencing recommendation, not code:

1. **Institutions and campuses** — already seeded, real, no action needed (`Nursery & Primary`, `Royal College`, `Islamic & Arabic Studies`, `Qur'an College`; `Main Campus — Ikorodu`).
2. **Class ladder** (blocks classes, subjects, and therefore most reporting) — the school (Registrar/Principals) supplies the complete level structure per institution. Only once this exists should real `classes` rows be entered beyond ad-hoc examples.
3. **Real staff onboarding** — via `admin/staff.js`, starting with whoever will operate the Registrar's Office and each institution's Principal, since most other real data entry (students, results, attendance) flows through staff-held Permission Engine grants, not the bearer-token admin endpoints (`docs/staff-identity-architecture.md`'s own intended sequencing).
4. **Real student enrolment** — via `admin/students.js` (guardian + student created together) or the Admissions flow (`admissions_applications` → Registrar's `enrol.js`, converting an admitted application into a real student record without a second guardian account — already built).
5. **Real academic data** (attendance, results, fees) — entered by the now-real staff through the Registrar's Office and Teacher Portal, term by term.
6. **Sample Institutional Records retirement** — once real data exists, the `is_sample_data = true` rows seeded by `/api/portal/setup` should be left in place (they cause no harm — every real aggregate already filters them out, see Phase 1A) rather than deleted, since deleting them risks breaking anyone still using the demo credential for training/testing.

## 3. What this document deliberately does not do

It does not fabricate a single real student, parent, teacher, class
name, subject, or fee figure. Every "at scale" number this document
could have shown (e.g. "500 students across 4 institutions") would be
an invented figure with no institutional grounding — exactly the kind
of unearned claim `docs/digital-campus-master-deployment-directive.md`'s
governing principle exists to prevent, extended here from deployment
status to institutional data itself: **a claim about real data is only
as good as its source, and this project has no real institutional data
source yet.**
