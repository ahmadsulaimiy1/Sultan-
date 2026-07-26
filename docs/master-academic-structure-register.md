# SHRS Master Academic Structure Register v1.0

The authoritative source for every school, programme, class, subject,
department, office, role, committee, and reporting line at Sultan
Hanafi Royal Schools. Built to prevent the digital campus from drifting
into generic school software — every entity below is either (a) a real,
already-documented SHRS fact, cited to its source, or (b) explicitly
marked as **Gap — awaiting real institutional input**, never invented.

This register does not duplicate `docs/role-permission-matrix.md`
(roles, in full detail) or `docs/data-ownership-register.md` (which
office owns which data field) — it cross-references both and adds the
one thing neither covers: the **academic structure** itself (schools →
programmes/levels → classes → subjects) and how it maps onto the
`institutions`/`classes`/`departments` tables that already exist in
`sql/schema.sql`.

---

## 1. The Four Institutions

SHRS is one school **group**, not one school — this is the single most
important structural fact for every future portal/dashboard to respect.
Real rows in the `institutions` table today:

| Institution (as stored) | Public-facing name | Age/level focus (from the public site) |
|---|---|---|
| `Nursery & Primary` | Sultan Hanafi Nursery & Primary School | Earliest years through primary; "Nigerian curriculum... infused with entrepreneurial skills, financial intelligence, leadership, and technology" (`academics/nursery-primary/`). |
| `Royal College` | Sultan Hanafi Royal College | Secondary — the site's boarding copy references ages 9–16 for boarding, implying JSS/SSS-band secondary schooling (Nigerian Junior/Senior Secondary System), matching the `JSS 1` class name already seeded in code. |
| `Arabic & Islamic Studies` | School of Islamic & Arabic Studies | "All ages · Weekday & weekend" per the site's own mega-menu copy — the only institution explicitly serving both day-school and part-time/weekend students. |
| `Qur'an College` | Sultan Hanafi Qur'an College | The 5-Stage Hifz Journey (§3 below) — its own distinct progression model, not grade-banded like the other three. |

**Gap — awaiting real institutional input:** no document anywhere in
this project (site copy or `docs/`) names the *complete* level/grade
ladder for Nursery & Primary or Royal College (e.g. the full
Creche → Nursery 1–3 → Primary 1–6 → JSS 1–3 → SSS 1–3 sequence a
Nigerian school group of this kind would typically run). Only
individual example class names exist, seeded ad hoc for testing:
`JSS 1` (Royal College), `Iʿdādiyyah 1` (Arabic & Islamic Studies).
**These are examples, not a canonical curriculum ladder** — inventing
one here would be exactly the "generic school software" drift this
register exists to prevent. The complete ladder is real institutional
data only the school can supply (see `docs/institutional-data-architecture.md`
§2 for how it should be collected).

## 2. Programmes and cross-institution enrolment

A student is not confined to one institution. `student_classes`
(schema, dual-enrolment support added earlier this engagement) already
allows a student to hold a primary enrolment in one institution and a
secondary enrolment in another — the concrete, already-tested example
is a Qur'an College student also enrolled in Arabic & Islamic Studies.
The four institutions are therefore **programmes a family can combine**,
not mutually exclusive tracks. Every future intake form, dashboard, or
report must model "enrolled in N institutions," never assume exactly
one.

`guardian_educational_interests` (Phase 1A) already reflects this at
the *pre-admission* interest-signalling stage — a prospective guardian
can express interest in Nursery & Primary, Royal College, Islamic &
Arabic Studies, and/or Qur'an College simultaneously, plus
Online/Weekend/Summer Programmes as separate interest signals (not real
institutions — see `functions/_lib/educational-interests.js`'s own
comment on this distinction).

## 3. The Qur'an College 5-Stage Hifz Journey (real, documented, built)

The one programme structure in this project that is fully specified,
not a gap, sourced from `functions/_lib/hifz.js` (`HIFZ_STAGES`,
already reflected in the Founder Dashboard, Registrar's Office, and
both student/guardian dashboards):

| Stage | Label |
|---|---|
| 1 | Memorisation & Muraja'ah |
| 2 | Progression Through the 30 Juz' |
| 3 | Completion Standard |
| 4 | Ijazah Examination |
| 5 | Ijazah Granted |

Per-Juz' progress (`hifz_progress`, 1–30) and permanent Ijazah grants
(`ijazah_register`) are separate, already-built tables — see
`docs/student-portal.md` and IQ-01/IQ-02 for the governing policy this
structure implements.

## 4. Subjects

**Gap — awaiting real institutional input.** No subject list exists
anywhere in this project for Nursery & Primary, Royal College, or
Arabic & Islamic Studies. `term_results.subject` is a free-text field
today (see `sql/schema.sql`) — staff have entered example values like
"Mathematics" in seeded/sample data only. There is no `subjects`
reference table, and inventing one here (a generic Nigerian JSS/SSS
subject list, for instance) would misrepresent SHRS's actual offering,
which may differ. This register recommends `docs/institutional-data-architecture.md`'s
data-collection process gather the real subject list per institution
per level before a `subjects` table is built — turning `term_results.subject`
from free text into a real foreign key is future schema work, not done
here.

## 5. Departments

The `departments` table (`sql/schema.sql`) exists and is **empty by
design** — its own comment states why: *"the public site names 'seven
academic departments' but does not name them individually anywhere, so
none are fabricated here."* This register repeats that constraint
rather than resolving it: **the seven department names are a real gap**,
not a technical one. Once the school supplies them, they belong in this
table, scoped to their institution (`institution_id`) or office
(`office_id`).

## 6. Offices (established, real, already seeded)

From `functions/api/portal/setup.js`'s idempotent seed — real,
governance-sourced, not invented:

| Office | Type | Scope |
|---|---|---|
| Board of Trustees | Governance | Ultimate governing body (GV-01) — 4 members, composition not individually published. |
| Registrar's Office | Academic | Admissions verification, enrolment, results, transcripts, certificates — all four institutions (AC-02, PA-05). |
| Finance Office | Support | Fee records, all institutions (FN-01) — no full write workflow yet, pending FN-03/04/05. |
| ICT Office | Support | System accounts, access logs, Acceptable Use / AI Usage policy ownership (IT-03, IT-05). |

**Gap:** no Human Resources Office, Governance Office (as a standing
administrative office rather than the Board itself), or Quality
Assurance Office is documented or seeded anywhere in this project —
confirmed absent in the Phase 5 readiness review
(`docs/digital-campus-master-deployment-directive.md`).

## 7. Roles (established vs. proposed — full detail in the Matrix)

16 role codes exist in the `roles` table, each tagged **established**
(a real, currently-documented SHRS role) or **proposed** (a role this
project recommends building system support for ahead of formal Board
appointment). The full list, rationale, and permission grants per role
live in `docs/role-permission-matrix.md` — this register only points to
it to avoid two documents disagreeing with each other over time.
Established roles today: **EXE** (CEO/Executive Leadership — named
individual: Zakariya Olanrewaju Anofi, per GV-01), **PRIN** (Principal/
Head Teacher, per-institution), **REG** (Registrar — named individual:
Mrs. Anofi-Abdulkareem Mariam Tope, per AC-02/PA-05), **DSL**
(Designated Safeguarding Lead, per SW-02 — role defined, not yet
appointed).

## 8. Committees

**Gap.** Beyond the Board of Trustees itself, no standing committee is
named anywhere in `docs/`. `docs/governance-master-register.md` records
"Committee Charters" as only **PARTIAL** (2 of an unstated total),
owned by the Board of Trustees, reviewed biennially — confirming this is
a known, tracked gap at the governance level already, not something
newly discovered here.

## 9. Reporting lines

`staff.reports_to_staff_id` is a self-referencing column already built
to express real reporting relationships (e.g. Registrar's Office staff
reporting to the Registrar). **No real reporting chain has been entered
for any real staff member** — `admin/staff.js`'s `create-staff` action
requires this to be set explicitly per person, and no real staff have
been onboarded through it yet (see Phase 5 of the Master Deployment
Directive: Staff Identity System is Developed/Merged, not populated
with real institutional data). The intended shape, once populated:
Board of Trustees → CEO (EXE) → Principals (PRIN, per institution) →
Registrar (REG, cross-institution) / Vice Principals (VP, proposed) →
Teachers/Muhaffiz/Arabic Instructors (TCH/MUH/ARB) reporting to their
institution's Principal or the Qur'an College Officer (QC-OFF,
proposed) as applicable.

---

## How this register is used going forward

Every future portal feature that renders an institution name, a class
level, a subject, a department, an office, or a reporting line must
read from — or propose an addition to — this register, not invent a
plausible-sounding value inline. Where this register marks something a
**Gap**, that is the honest, current state: the system should render an
honest empty/pending state (matching the established convention already
used elsewhere in this project — e.g. `notYetAvailable` in the Founder
Dashboard), not a placeholder that reads as real.
