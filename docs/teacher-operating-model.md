# SHRS Teacher Operating Model

*Written in response to two directives: (1) the post-Registrar's-Office
instruction that Migration Phases A and B's shared finding — attendance
and assessment entry both require a Teacher-tier identity that doesn't
exist — makes a Teacher Operating Model a real prerequisite for a
Teacher Portal; and (2) an explicit correction that followed: this
model must NOT be scoped primarily around Qur'an College, Arabic &
Islamic Studies, Hifz, or Ijazah. SHRS is a five-institution ecosystem.
Mainstream academic teaching — Mathematics, English, the Sciences, the
Social Sciences, Technology — is not a secondary concern with Qur'an
College attached; it is the majority of the institution by pathway
count and, once a Teacher Portal exists, will be the majority of its
users. This document is written that way from its first section, not
retrofitted.*

**Governance status: proposed, pending Board adoption. Nothing in this
document modifies `functions/_lib/permission-matrix.js`, the `roles`
table, or any running code.** Every role code below is a proposal, not
a grant — adopting any of them requires the same rigor the original
Role & Permission Matrix was held to: a Board-level decision, then a
lockstep revision of `role-permission-matrix.md` and
`permission-matrix.js` together, never one silently ahead of the other.
Until that happens, the single generic `TCH` (Teacher) and `VP` (Vice
Principal) codes already seeded in `setup.js` — both marked `'proposed'`
status, held by nobody — remain the only teaching-tier codes that
technically exist.

## 1. Institutional scope

Four of SHRS's five real institutions exist in this project's schema
today (`setup.js`'s `institutions` seed) — this model covers all four,
not one. (The fifth, Sultan Hanafi Online & Distance Learning School,
recognised by the Board's governance restructuring amendment of
2026-08-04, has no `institutions` seed row or class model yet — stated
plainly here rather than fabricated.)

| Institution | Pathway(s) within it |
|---|---|
| **Basic School** | Early Years (Creche, Nursery, Kindergarten/Preschool), Primary 1–6 |
| **Secular College** | Junior Secondary (JSS1–JSS3), Senior Secondary (SS1–SS3) — the institution's mainstream academic programme |
| **Qur'an College** | The published 5-stage Hifz Journey, Ijazah pathway |
| **Islamiyyah College** | Arabic language and Islamic Studies programmes |

A fifth line — **future continuing education / adult programmes** — is
named in the directive as a category to anticipate. No institution,
class, or enrolment record for it exists anywhere in this project
today; it is included here only so the role taxonomy below doesn't need
revisiting when it eventually does.

## 2. Mainstream academic role hierarchy

This is the primary structure — the one most students, most staff, and
(once built) most Teacher Portal users will sit inside. It applies
across Basic School and Secular College identically; the same
hierarchy, not a separate one, governs both.

| Proposed role | Reports to | Core responsibility |
|---|---|---|
| **Class Teacher** | Head of Subject or Department Head (Basic School: directly to Principal, given smaller staff counts there) | Attendance, pastoral oversight, day-to-day communication with guardians for one assigned class. This is the role Migration Phase A's finding names directly — attendance Create belongs here. |
| **Subject Teacher** | Head of Subject | Lesson delivery, continuous assessment, and exam-score entry for one or more subjects across one or more classes. Migration Phase B's finding names this role directly — assessment Create belongs here. Real subjects already implied by Secular College's academic programme: English, Mathematics, Physics, Chemistry, Biology, Economics, Government, Geography, ICT, Literature — this list is illustrative of what a real secondary curriculum requires, not a closed or invented set. |
| **Head of Subject** | Department Head | Curriculum oversight and moderation for one subject across all classes that teach it (e.g. all Mathematics teachers, JSS1 through SS3) — a quality-assurance layer between individual Subject Teachers and departmental leadership. |
| **Department Head** | Vice Principal, Academics | Leadership and staff supervision for a cluster of related subjects (e.g. a Sciences department covering Physics/Chemistry/Biology; a Humanities department covering Government/Geography/Economics; a Languages department; a Technology/ICT department). Department boundaries are a curriculum decision for the Board/Principal to make, not asserted here. |
| **Vice Principal, Academics** | Principal | Academic performance and quality assurance across the whole institution — the proposed split of the single existing `VP` code's academic half. |
| **Vice Principal, Administration** | Principal | Operations, discipline, and non-academic administration — the proposed split of `VP`'s other half. |
| **Principal** | Head of Schools / Administrator (EXE) | Institutional approval and governance execution for their own institution — unchanged from the existing, already-adopted `PRIN` role. |

**Why split the single `VP` code**: the existing seed comment already
describes `VP` as "mirrors Principal minus final approval authority" —
a single undifferentiated deputy. A real secondary school of this scale
needs academic quality assurance and day-to-day operations/discipline
handled by different people with different reporting lines from
teaching staff; collapsing both into one code would force every
Department Head and every Class/Subject Teacher to report through one
person regardless of which function's decision they need. This is a
proposal to resolve that, not a claim that SHRS has decided to make
these two distinct hires.

## 3. Specialised instructional roles

These sit **alongside** the mainstream hierarchy above, not beneath or
above it — a deliberate correction from any framing that would make
Qur'an College or Islamic & Arabic Studies subordinate pillars. A
Muhaffiz's institutional standing relative to a Subject Teacher is
lateral, not junior.

| Proposed role | Institution | Reports to | Core responsibility |
|---|---|---|---|
| **Muhaffiz / Muhaffizah** | Qur'an College | Qur'an Supervisor | Direct Hifz instruction and per-Juz' progress recording for assigned students — maps to the already-adopted `MUH` role; no change proposed here beyond adding the supervisory tier below it. |
| **Qur'an Supervisor** | Principal, Qur'an College | New — sits between individual Muhaffiz/Muhaffizah staff and the existing `QC-OFF` (Qur'an College Officer) institution-wide role, mirroring Head of Subject's position in the mainstream hierarchy. |
| **Ijazah Coordinator** | Qur'an College | Qur'an College Officer | A credentialing-specific role, distinct from day-to-day Hifz supervision — coordinates the Ijazah grant/verification process specifically (IQ-02), rather than folding it into `QC-OFF`'s broader institution-wide oversight as it is today. |
| **Arabic Language Instructor** | Islamic & Arabic Studies | Head of Subject (Islamic & Arabic Studies) | Arabic language instruction — the proposed split of the existing single `ARB` code's language half. |
| **Islamic Studies Instructor** | Islamic & Arabic Studies | Head of Subject (Islamic & Arabic Studies) | Islamic Studies instruction — the proposed split of `ARB`'s other half, mirroring the mainstream Subject Teacher tier for this institution specifically. |

## 4. Proposed permission mapping to existing system areas

This model does not invent new `SYSTEM_AREAS` — every proposed role
below maps onto areas that already exist in `permission-matrix.js`
(`student_records`, `attendance`, `assessments`, `results`,
`hifz_records`, `ijazah_records`, `communications`). What changes, if
this is adopted, is which *role code* sits in each area's grant rows —
today those rows use the single generic `TCH`/`MUH`/`ARB`; adoption
would replace `TCH` with `Class Teacher`+`Subject Teacher` (different
grants for each) and split `ARB` into its two instructor roles.

| Proposed role | `attendance` | `assessments` | `results` | `communications` |
|---|---|---|---|---|
| Class Teacher | V, C, E — own class, own period | V only | V — own class's contribution | P — own class only |
| Subject Teacher | V only | V, C, E — own subject/class | V — own subject's contribution | — |
| Head of Subject | V | V (moderation) | V | — |
| Department Head | V (aggregate) | V (aggregate) | V (aggregate) | — |
| VP Academics | V, A (own institution) | V | V, A (own institution) | — |
| VP Administration | V, A (own institution, discipline-related) | — | — | — |
| Muhaffiz/Muhaffizah | — | — | — | — *(governed by `hifz_records`, unchanged from today's `MUH`)* |
| Arabic Language Instructor / Islamic Studies Instructor | V | V, C, E — own subject/class | V | — |

This table is illustrative of how adoption would work, not a finished
proposal ready to paste into `permission-matrix.js` — the actual grant
scopes, especially for the newly-split Head of Subject/Department Head/
VP tiers, need real institutional input (does a Department Head need
Edit on assessments, or only View? Should VP Administration see
individual attendance records, or only aggregates?) that this document
cannot responsibly invent on the Board's behalf.

## 5. What adopting this model would resolve

Migration Phases A and B both found the identical structural gap:
attendance and assessment *Create* actions belong to a teaching-tier
role that doesn't exist as an issued account. Adopting Class
Teacher/Subject Teacher (or even just activating the existing generic
`TCH` code) would close that gap directly — this document exists
because that gap surfaced twice in a row, not as a spontaneous
reorganisation proposal.

## 6. Future LMS anticipation (design notes only — nothing built)

The directive asks this model to anticipate a future LMS's needs so a
Teacher Portal, when built, doesn't need re-architecting immediately
after. None of the following exists in this project today — this
section is a placeholder for where these concepts would attach to the
roles above, not a build plan:

- **Course/Lesson creation and management** — would belong to Subject
  Teacher (own subject) and Head of Subject (cross-class oversight),
  the same split already established for assessments.
- **Assignment submission and marking** — Subject Teacher creates and
  marks; Class Teacher would need read access for pastoral context
  (a student struggling across multiple subjects).
- **Grade publishing** — this is exactly the Results Approve/Publish
  gap `docs/academic-records-authority-map.md` already found
  unenforced; an LMS grade-publish action should route through
  whatever eventually implements that gate, not a new parallel one.
- **Academic analytics** — Department Head and VP Academics tiers exist
  precisely to consume aggregate views without individual-student
  drill-down, mirroring the Executive Dashboard's existing
  aggregate-only pattern for `EXE`.
- **Parent academic monitoring** — already partially real today (the
  Parent Portal shows term results, attendance, and Hifz snapshots);
  an LMS would extend this, not replace it.

## 7. Explicitly out of scope for this document

This document does not decide subject/department boundaries, does not
create any staff account, does not modify `roles`/`permission-matrix.js`,
and does not commit SHRS to hiring for any role named above. It is the
structural proposal Migration Phases A and B's findings called for —
the decision to adopt it, in whole or in part, sits with the Board, the
same as every other "proposed" item in this project's role table.
