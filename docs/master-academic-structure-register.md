# SHRS Master Academic Structure Register v1.2

**Revision note (v1.0 → v1.1):** integrates real Royal College JSS/SSS
subject-teacher data and real Qur'an College & Islamic Studies faculty
data supplied directly by the school; corrects v1.0's incorrect claim
that no academic level ladder existed (it does — `docs/teacher-operating-model.md`
§1 — v1.0 simply failed to cross-reference it); proposes a complete
departmental framework for Board consideration. No structural claim in
v1.0 about what's adopted vs. proposed has changed — only what's now
documented as real has grown.

**Revision note (v1.1 → v1.2):** corrects §4d's own stated rule against
merging Qur'an College and School of Islamic & Arabic Studies faculty
into one list — v1.1 had in fact merged them under one combined table
heading, despite the surrounding text insisting on the distinction. The
six faculty members are now split into the correct two tables per an
explicit institutional correction. **Separately, a new Royal College
JSS/SSS faculty roster was supplied this same session that conflicts
with §4a/4b's existing "real, supplied" data** — different names against
several subjects, several names appearing in neither list. Per this
register's own no-guessing discipline (see the Ganiyu Ige/Rukayah note
below), both are recorded, neither is silently preferred, and §4a/4b
are marked **unreconciled pending confirmation** rather than overwritten.

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

**Correction (this register's own earlier v1.0 text was wrong here):**
a complete level ladder for Nursery & Primary and Royal College is
already documented — in `docs/teacher-operating-model.md` §1, not
repeated in full here to avoid two documents drifting apart:

| Institution | Level ladder |
|---|---|
| Nursery & Primary | Early Years (Creche, Nursery, Kindergarten/Preschool) → Primary 1–6 |
| Royal College | Junior Secondary (JSS1–JSS3) → Senior Secondary (SS1–SS3) |
| Qur'an College | The 5-Stage Hifz Journey (§3 below) **is** its ladder — not a grade-band sequence, a progression-stage sequence. |
| School of Islamic & Arabic Studies | No level ladder documented yet — see the remaining gap below. |

**Remaining gap:** the Iʿdādiyyah level naming convention used in one
seeded test class (`Iʿdādiyyah 1`) has never been expanded into a full
ladder for the School of Islamic & Arabic Studies, and no document
states how many Iʿdādiyyah/Thānawiyyah (or equivalent) levels that
institution actually runs. This register does not invent one.

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

**Partially resolved as of this revision.** Real subjects for Royal
College's JSS and SSS levels are now known, supplied directly by the
school as part of the Academic Workforce Register (§4a below) — this
register states them as real because they arrived as an assignment
against real named teachers, not as an invented curriculum list.
Nursery & Primary's and the School of Islamic & Arabic Studies'
subjects remain a **gap** — no equivalent teacher-to-subject list has
been supplied for either yet. `term_results.subject` is still a
free-text column (`sql/schema.sql`) with no `subjects` reference table;
turning JSS/SSS's now-real list into an actual table row set is a
schema task for the next data-entry phase, not done in this document.

### 4a. Royal College — Junior Secondary School subjects (real, supplied — ⚠ UNRECONCILED, see below)

| Subject | Teacher |
|---|---|
| English Studies | Miss Ogunyinka Hassanah |
| Mathematics | Mr Oduyebo Jamiu |
| Basic / Intermediate Science | Mrs Ganiyu Ige |
| Social & Civic Studies | Mr Oduyebo Jamiu |
| Digital Technology | Mrs Adeyemo Zainab |
| Business Studies | Mr Maruf Afolabi |
| Trade Subjects | Mrs Adeyemo Zainab |
| Diction | Mr Yusuf Shola |
| Coding | Mr Oguntade Adebola |
| Yoruba | Miss Yusuf Raqeebah |
| Cultural & Creative Arts | Miss Ogunyinka Hassanah |
| History | Mr Oladele Abdulwasiu |

### 4b. Royal College — Senior Secondary School subjects (real, supplied — ⚠ UNRECONCILED, see below)

| Subject | Teacher |
|---|---|
| English Studies | Mr Yusuf Shola |
| Mathematics | Mrs Okoh Nimota |
| Physics | Mr Kassim Jamal |
| Chemistry | Mr Kassim Jamal |
| History | Mr Oladele Abdulwasiu |
| Literature in English | Miss Ogunyinka Hassanah |
| Biology | Mrs Ganiyu Rukayah |
| Digital Technology | Mr Oguntade Adebola |
| Trade Subjects | Mrs Adeyemo Rukayah |
| Further Mathematics | Mrs Okoh Nimota |
| Coding | Mr Oguntade Adebola |
| Account | Mr Maruf Afolabi |
| Commerce | Mr Maruf Afolabi |
| Economics | Mr Oduyebo Jamiu |
| Yoruba | Miss Yusuf Raqeebah |
| Cultural & Heritage Studies | Miss Yusuf Raqeebah |
| Government | Miss Yusuf Raqeebah |

**Note on two apparent name variants:** "Mrs Ganiyu Ige" (JSS Basic/
Intermediate Science) and "Mrs Ganiyu Rukayah" (SSS Biology) were
supplied as distinct entries — this register records them as supplied,
without merging or assuming they are the same or different people.
Same for "Mrs Adeyemo Zainab" (JSS) / "Mrs Adeyemo Rukayah" (SSS). This
is exactly the kind of ambiguity real HR data entry (§4a of
`docs/institutional-data-architecture.md`) needs to resolve with the
school directly — this register does not guess.

### 4a-bis. Royal College — second roster supplied this session (⚠ UNRECONCILED against §4a/4b above)

A different Royal College JSS/SSS teacher-subject list arrived in the
same message that corrected §4d's institution split below. It is
recorded here in full, exactly as supplied, rather than merged into
§4a/4b or treated as a silent replacement:

| Teacher | Subjects |
|---|---|
| Mrs Ganiyu Ige (Rukayah) | English Language |
| Mrs Kareemat | Mathematics |
| Mrs Fatimat Badmus | Basic Science, Physics |
| Mrs Adeyemo Zainab (Rukayah) | Biology, Agricultural Science |
| Mrs Opakunle | Chemistry |
| Mr Ismail | Further Mathematics, Technical Drawing |
| Mrs Omotola | Civic Education, Social Studies |
| Mrs Basirat | Business Studies, Commerce |
| Mrs Lawal | Economics |
| Mrs Amina | Government, History |
| Mrs Mariam | Literature in English |
| Mrs Khadijah | Home Economics |
| Mr Yusuf | Computer Studies, Information & Communication Technology (ICT) |
| Mrs Hafsat | French Language |

**What doesn't reconcile, specifically:** "Ganiyu Ige" appears in both
rosters but against different subjects (§4a: Basic/Intermediate
Science; here: English Language). "Adeyemo Zainab" appears in both but
against different subjects (§4a: Digital Technology/Trade Subjects;
here: Biology/Agricultural Science). "Yusuf" appears in §4a/4b as "Mr
Yusuf Shola" against English Studies/Diction; here as "Mr Yusuf"
against Computer Studies/ICT — possibly the same person with a dropped
surname and a different-term assignment, possibly not. Eight names in
§4a/4b (Ogunyinka Hassanah, Oduyebo Jamiu, Maruf Afolabi, Oguntade
Adebola, Yusuf Raqeebah, Oladele Abdulwasiu, Okoh Nimota, Kassim Jamal)
do not appear at all in this second list; nine names here (Kareemat,
Fatimat Badmus, Opakunle, Ismail, Omotola, Basirat, Lawal, Amina,
Mariam, Khadijah, Hafsat) do not appear in §4a/4b.

**This register cannot resolve which roster is current** — that needs
one direct answer from the school: is this a correction/update
superseding §4a/4b (e.g. a new term's assignments), a different cohort
or shift, or were the two simply drafted independently and need
reconciling by hand? Until answered, no public-facing faculty content
for Royal College should be published from either list alone.

### 4c. School of Islamic & Arabic Studies and Qur'an College subjects (real, by faculty specialisation)

No formal subject-list table was supplied for these two institutions,
but real faculty specialisations (§4d/§4e below) name the actual programme
components in practice: **Arabic Language, Arabic Grammar, Islamic
Studies, Qur'anic Studies** (School of Islamic & Arabic Studies); **Hifz
(Qur'an Memorisation), Tajweed, Qira'aat Studies, Ijazah Preparation,
Advanced Qur'anic Sciences** (Qur'an College). The Board's own requested
divisional structure (§5 below) adds **Fiqh, Aqeedah, Hadith, Seerah,
Islamic Leadership** as named components of the School of Islamic &
Arabic Studies — these are recorded here as the requested structure,
not yet confirmed as subjects any named faculty member currently
teaches.

### 4d. Qur'an College Faculty (real, supplied — corrected split, see revision note)

| Faculty member | Qualification | Specialisation |
|---|---|---|
| Ustadh Muhammad Fodio | Diploma in Qira'at Sciences; Specialist in the Ten Qira'at | Ḥifẓ al-Qur'an, Tajwīd, Qira'at Sciences, Qur'anic Studies, Ijazah Preparation |
| Ustadh Muhammad Awwal Ishola | B.A. Leadership and Counselling | Ḥifẓ al-Qur'an, Student Counselling, Leadership Development, Character Building, Qur'an College Student Affairs |

### 4e. School of Islamic & Arabic Studies Faculty (real, supplied — corrected split, see revision note)

| Faculty member | Qualification | Teaching areas |
|---|---|---|
| Ustadh Abdul-Hameed Abdurrahman | Diploma in Arabic Literature | Arabic Language, Arabic Grammar (Naḥw), Arabic Morphology (Ṣarf), Arabic Literature, Arabic Composition, Islamic Studies |
| Ustadh Sherifudeen Olaifa | **Not yet supplied** | Islamic Studies, Qur'anic Studies, Arabic Studies |
| Ustadh Mas'oud Abdul-Fattah | B.Sc. | Islamic Studies, Arabic Studies, Student Development |
| Engr. Ustadhah Fatimah A. | B.Sc. Mechanical Engineering | Islamic Studies, Arabic Studies, Educational Development, STEM Awareness & Mentorship |

Qualification recorded as "Not yet supplied" for Ustadh Sherifudeen
Olaifa exactly as given — this register does not fill in a
plausible-sounding credential. "Mas'oud Abdul-Fattah" corrects v1.1's
"Mas'sou Abdul-Fattah" as a spelling fix supplied in the same message;
recorded as a correction, not a second unreconciled name, since no
conflicting qualification/specialisation data came with it.

**Still a gap:** Nursery & Primary's faculty and subject list has not
been supplied. The Administrative Workforce Register
(`docs/workforce-data-collection-request.md` §3) also remains open.

## 5. Departments

**Status: a complete departmental framework is now proposed — still
not adopted.** The `departments` table (`sql/schema.sql`) remains
**empty in the running system**; nothing below has been entered as a
real row, and it should not be until the Board formally adopts it,
matching the exact discipline `docs/teacher-operating-model.md` already
applies to its own proposed roles. The table's original comment (*"the
public site names 'seven academic departments' but does not name them
individually anywhere"*) is no longer the state of documentation — it
is now the state of **adoption**: named, proposed, awaiting a decision.

### 5a. Royal College — proposed academic departments

Reconciled against `docs/teacher-operating-model.md` §2's own earlier
department sketch (Sciences/Humanities/Languages/Technology) so the two
documents describe one structure, not two:

| Proposed department | Subjects |
|---|---|
| Department of Languages & Communication | English Studies, Literature in English, Diction, Yoruba |
| Department of Mathematics & Computing | Mathematics, Further Mathematics, Coding, Digital Technology |
| Department of Sciences | Basic/Intermediate Science, Biology, Physics, Chemistry |
| Department of Social Sciences & Humanities | History, Government, Economics, Social & Civic Studies |
| Department of Business & Enterprise Studies | Business Studies, Commerce, Account, Trade Subjects |
| Department of Creative & Cultural Studies | Cultural & Creative Arts, Cultural & Heritage Studies |

Each maps directly onto `docs/teacher-operating-model.md` §2's proposed
**Department Head** role — one Head per department above, reporting to
Vice Principal, Academics.

**A second, differently-grouped department structure arrived in the
same message as the unreconciled §4a-bis roster above** — recorded here
rather than silently substituted for the structure above, same
discipline as §4a-bis:

| Alternative proposed department | Subjects |
|---|---|
| Mathematics & ICT Department | Mathematics, Further Mathematics, Computer Studies, ICT, Technical Drawing |
| Science & Technology Department | Basic Science, Physics, Chemistry, Biology, Agricultural Science |
| Humanities Department | English Language, Literature in English, Government, History, Civic Education, Social Studies |
| Business & Commercial Studies Department | Business Studies, Commerce, Economics |
| Languages Department | French Language |

Both structures remain **proposed, not adopted** — the `departments`
table is still empty in the running system either way — but which one
(if either) reflects the school's actual intended grouping is a Board
decision this register cannot make unilaterally, and is now the same
open question as the roster itself.

### 5b. School of Islamic & Arabic Studies and Qur'an College — proposed divisional structure

Per the directive: these are **two distinct academic entities**, never
collapsed into one generic "Islamic Studies" label, consistently
throughout this register, the prospectus, and all governance
documentation.

- **School of Islamic & Arabic Studies** — proposed component areas: Arabic Language, Islamic Studies, Fiqh, Aqeedah, Hadith, Seerah, Islamic Leadership.
- **Qur'an College** — proposed component programmes: Hifz Programme, Tajweed Programme, Qira'aat Programme, Ijazah Programme, Muraja'ah Programme, Qur'anic Sciences.

This maps onto `docs/teacher-operating-model.md` §3's already-proposed
specialised roles (Muhaffiz/Muhaffizah, Qur'an Supervisor, Ijazah
Coordinator, Arabic Language Instructor, Islamic Studies Instructor) —
this register does not propose new roles competing with those; §4d/§4e's
real faculty should be read against that existing role structure once
the Board adopts it (e.g. Ustadh Muhammad Fodio's Qira'at/Tajwīd/
Ijazah-Preparation specialisation maps naturally to Muhaffiz + Ijazah
Coordinator functions; Ustadh Abdul-Hameed Abdurrahman's Arabic
Language/Grammar focus maps to Arabic Language Instructor).

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
