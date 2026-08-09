# SHRS Role & Permission Matrix v1.0

*Governance artefact required before any Staff Identity & Role System
code is written (per the Phase 2 Authorisation directive). No staff
authentication, no role field, no permission check should be built
until this document is accepted — it is the reference every future
Teacher Portal / Registrar Office / Admissions Office / Finance Office /
Principal Dashboard / Executive Dashboard / future LMS module gets built
against, so getting the shape right here is cheaper than fixing a wrong
permission model after five systems depend on it.*

---

## 0. Method note — established roles vs. proposed roles

This matrix follows the same discipline as
`digital-institution-blueprint.md`: build from what SHRS has actually
documented, and say plainly where the requesting brief names something
that doesn't exist yet. Three corrections:

- **No "Proprietor" separate from the Head of Schools / Administrator.**
  GV-01 names one top executive role, the **Head of Schools /
  Administrator** — per the Board's governance restructuring amendment
  of 2026-08-04, there is no office of "Chief Executive Officer"; the
  Founder holds the office of Head of Schools / Administrator together
  with the office of Chairman of the Board of Governors, and exercises
  the Founder's authority solely through those two offices. This matrix
  doesn't invent a second executive title.
- **"Hifz Instructor" is not the school's term.** IQ-01/IQ-02 already
  establish **Muhaffiz/Muhaffizah** as the role that supervises Hifz
  memorisation and Muraja'ah. This matrix uses the real term.
- **No standing "Ijazah Coordinator."** IQ-02 describes the Principal
  putting a student forward and named *external* examining scholars
  making the grant decision — there is no documented internal
  coordinator role. Where the requesting brief assumes one, this matrix
  either routes that administrative function through the Registrar/
  Qur'an College Officer or marks it **Proposed** for Board decision,
  never presents it as already established.

Every role below is tagged:

- **Established** — a real, currently-documented SHRS role (named
  person and/or documented responsibilities in GV-01/AC-02/PA-05/
  IQ-01/IQ-02).
- **Proposed** — a role the requesting brief and this matrix recommend
  for when Phase 2 (Staff Identity) is built, because the office it
  belongs to is real (e.g. Finance, Admissions) but no individual role
  or job description has been Board-documented yet. Building the
  *system* to support a Proposed role is fine — the Board still needs to
  formally adopt the role itself, the same way GV-02 (Board Charter) and
  several HR/FN policies are listed **Missing** in the policy index
  without that blocking everything upstream of them.

---

## 1. Permission legend

| Code | Permission | Meaning |
|---|---|---|
| **V** | View | Read access to the record/area |
| **C** | Create | Can originate a new record |
| **E** | Edit | Can modify an existing record |
| **D** | Delete | Can permanently remove a record — granted almost nowhere in this matrix on purpose; see §2 |
| **A** | Approve | Can authorize a workflow step (promotion, grant, offer, refund) |
| **P** | Publish | Can make something visible to a wider audience (guardian/student portal, public website) |
| **X** | Export | Can extract data out of the system (file download, report, transcript) — the most data-protection-sensitive permission after Delete |
| **Vf** | Verify | Can attest a record's authenticity to a third party (e.g. confirm an Ijazah is genuine) |
| **Ar** | Archive | Can move a record to an inactive/historical state without deleting it |
| **MU** | Manage Users | Can create/modify other staff accounts and their role assignment — the highest-privilege category, restricted to one role system-wide |

A blank cell means no access. A role not listed in an area's table has
no access to that area at all.

---

## 2. Least-privilege principle

**Default: no access.** Every permission in this document had to be
justified against a real responsibility documented somewhere (a policy
code, an existing job description, or an explicit Board decision this
matrix proposes) — nothing was granted because it would be convenient
for a role to have it.

**Delete is granted nowhere on core institutional records.** Student,
guardian, attendance, result, Hifz, and Ijazah records use **Archive**
(a status change, fully reversible, audit-visible) instead — this
already matches how the system is built today (`students.status`:
active/graduated/withdrawn/suspended; `ijazah_register.revoked_at`: set,
never deleted, per IQ-02 §7.6). The only place Delete appears at all is
staff account deactivation, and even that is framed as deactivation
(Archive) by default, with hard deletion reserved for data-protection
deletion requests specifically (`privacy_requests`, already built).

**Every Approve/Publish/Export/Verify grant states who owns the process,
which policy governs it, and whether a second role's sign-off is
required** — see each system-area section below. Where no policy exists
yet to govern a workflow (Examinations, Finance beyond the current
snapshot), this matrix says so rather than inventing an approval chain
the Board hasn't set.

**Scope, not just role, gates access.** A Teacher's grants below are
scoped to *their own assigned classes*, a Principal's to *their own
institution*, a Muhaffiz's to *their own assigned Hifz students* — this
is enforced the same way the Founder Dashboard's design already commits
to (institution-scoped queries, not a single flat "staff" bit). This is
also what makes the model multi-campus-ready without redesign — see §5.

---

## 3. Role directory

| Code | Role | Status | Scope | Real person / source |
|---|---|---|---|---|
| **EXE** | Head of Schools / Administrator / Executive Leadership *(role code unchanged; label updated per the 2026-08-04 amendment — no office of CEO exists)* | Established | All institutions | GV-01; Zakariya Olanrewaju Anofi, Founder, Chairman of the Board of Governors & Head of Schools / Administrator |
| **PRIN** | Principal / Head Teacher | Established | Own institution | GV-01 (per-institution); named for Sultan Hanafi Nursery and Primary School (Mrs. Mariam Tope Anofi-AbdulKareem) |
| **VP** | Vice Principal | Proposed | Own institution, mirrors Principal minus final approval authority | Not yet documented — recommended where an institution's size warrants it |
| **REG** | Registrar | Established | All institutions (academic records are institution-wide) | AC-02, PA-05; Mrs. Mariam Tope Anofi-AbdulKareem |
| **AREG** | Assistant Registrar | Proposed | Delegated subset of Registrar's scope | Not yet documented — recommended once Registrar workload requires it |
| **ADM** | Admissions Officer | Proposed | All institutions, pre-enrolment only | PA-05 describes the admissions *process*; no standing officer role documented yet — today the Registrar performs verification |
| **FIN** | Finance Officer (covers Accounts Officer / Bursar) | Proposed | All institutions | FN-01 establishes the *principle* of financial control; no officer role documented. Consolidated into one code — split only if the school later separates the duties |
| **TCH** | Teacher (covers Subject Teacher / Class Teacher) | Proposed | Own assigned classes/subjects only | Institution-agnostic; the role that unlocks a real Teacher Portal |
| **MUH** | Muhaffiz / Muhaffizah | Proposed | Own assigned Hifz students only | IQ-01, IQ-02's real term for this role |
| **ARB** | Islamic and Arabic Studies Instructor | Proposed | Own assigned classes, Sultan Hanafi School of Islamic and Arabic Studies | Mirrors TCH scope for that division |
| **QC-OFF** | Qur'an College Officer | Proposed | Qur'an College institution-wide | Institution-level oversight above individual Muhaffiz assignments |
| **SA** | Student Affairs Officer | Proposed | All institutions | SD-05/06/07 (Attendance/Welfare/Behaviour policies) are Missing/Partial — this role and its governing policy should arrive together |
| **BRD** | Boarding Officer (covers House Parent) | Proposed | Boarding students only | SD-04 Boarding Regulations is published; no digital officer role yet |
| **ICT** | ICT Administrator | Proposed | All institutions, system-level | IT-06 names an "ICT Head" as a Management Team member — this role is that person's operational tier |
| **SYSADMIN** | System Administrator | Proposed — one account, tightly held | Everything, technical only | The single highest-privilege technical role; see §4.20 |
| **DSL** | Designated Safeguarding Lead | Established (role defined, not yet appointed) | All institutions, safeguarding-relevant fields only | SW-02 |

> ### ⚠ PRIN and REG are currently the same person
>
> Mrs. Mariam Tope Anofi-AbdulKareem appears against **both** rows above.
> That is not a duplicate to be tidied away — she genuinely holds two
> offices: Registrar of Royal College and Head Teacher of the Nursery and
> Primary School. Earlier drafts of this matrix and of the governance
> pages recorded the two offices under two spellings of her name and so
> treated them as two people. They are one.
>
> **The consequence is a real internal control, not a data-entry
> detail.** `docs/data-ownership-register.md` sets the approval authority
> for a change of student status as *"Registrar + Principal"* — a
> deliberate two-person check, so that no single officer can both create
> a record and approve a change to it. For the Nursery and Primary
> School, both halves of that check are now the same individual, and the
> control does not exist.
>
> This document does not decide what to do about it; that is the Board's.
> The three ordinary answers are: appoint the **AREG** (Assistant
> Registrar) role already proposed above and route Basic School approvals
> through it; name a second approver from the Management Team for Basic
> School status changes only; or accept the concentration explicitly, in
> writing, with the Board recording that it has done so. What must not
> happen is the control staying on paper while one person holds both
> ends of it.
>
> The identity-platform consequence — one `staff` row cannot carry two
> offices — is recorded in `docs/staff-identity-platform.md`.
| *(for context)* GUARDIAN | Guardian | Established, built | Own linked children only | Live — Parent Portal |
| *(for context)* STUDENT | Student | Established, built | Own record only | Live — Student Portal |

---

## 4. Permission tables by system area

Each table lists only roles with any access. All other roles/areas: no
access.

### 4.1 Student Records
*Owner office: Registrar. Governing: AC-02.*

| Role | V | C | E | Ar | X |
|---|---|---|---|---|---|
| REG / AREG | ✓ | ✓ | ✓ | ✓ | ✓ |
| PRIN | own institution | | own institution | | |
| ADM | at intake only | ✓ (intake) | | | |
| TCH / MUH / ARB | own classes only | | | | |
| SA | ✓ | | | | |
| DSL | safeguarding fields only | | safeguarding fields only | | |
| EXE | aggregate only (no individual PII) | | | | |

No Delete anywhere — `status` (active/graduated/withdrawn/suspended) is
the archive mechanism, already built. Status changes (e.g. to
`withdrawn`) require REG, with PRIN co-sign for their own institution's
students. Export requires a logged reason (matches `auth_audit_log`'s
existing discipline of writing every sensitive action, not just logins).

### 4.2 Guardian Records
*Owner office: Registrar. Governing: IT-02.*

| Role | V | C | E | X |
|---|---|---|---|---|
| REG / AREG | ✓ | ✓ | ✓ | ✓ |
| ADM | at intake | ✓ (intake) | | |
| FIN | billing contact fields only | | | |

Deletion only via the existing `privacy_requests` data-protection
channel (IT-02), actioned by REG — never a routine permission.

### 4.3 Staff Records
*Owner office: none exists yet.* HR-01 through HR-09 are almost all
**Missing** in the policy index (only Staff Conduct/Handbook drafted,
unpublished). **This entire area is ungoverned.** Recommendation: do
not build a staff personnel-record system in Phase 2 — build the
*portal login* identity only (see §4.20), and treat HR records as a
later phase gated on HR-04/05/06/07 existing, the same way Finance is
gated on FN-03/04/05.

| Role | V (portal account only, not HR file) | MU |
|---|---|---|
| SYSADMIN | ✓ | ✓ |
| EXE | ✓ | approve new accounts only |

### 4.4 Attendance
*Owner office: Registrar / Academic Office. Governing: SD-05 (Missing — build ahead of policy here is reasonable since attendance-taking is already live via admin API).*

| Role | V | C | E | X |
|---|---|---|---|---|
| TCH | own class, own period | ✓ (own class) | ✓ (own class) | |
| PRIN | own institution | | ✓ (override) | |
| REG | ✓ | | ✓ (correction) | ✓ |
| SA | ✓ (patterns, not raw entry) | | | |
| DSL | flagged/safeguarding-relevant only | | | |
| EXE | aggregate only (already built — Founder Dashboard) | | | |

### 4.5 Assessments (raw CA/exam score entry)
*Owner office: Teacher, subject to Registrar oversight. Governing: AC-01 (live), AC-03 Examination Policy (Missing).*

| Role | V | C | E |
|---|---|---|---|
| TCH / MUH / ARB | own subject/class | ✓ (own subject/class) | ✓ (own subject/class, logged) |
| PRIN | own institution | | |
| REG | ✓ | | correction only, logged |

No Publish here — see Results. Grade corrections must remain visible in
history (AC-02 provides for appeals), never silently overwritten.

### 4.6 Results (finalised per-term aggregate)
*Owner office: Registrar, jointly with Principal per AC-02's stated joint promotion/probation threshold-setting.*

| Role | V | A | P | X |
|---|---|---|---|---|
| REG | ✓ | ✓ | ✓ | ✓ |
| PRIN | own institution | ✓ (own institution) | | |
| TCH | own subject's contribution only | | | |

Publish = release to the guardian/student portal (already built —
`term_results`). Requires REG + PRIN joint approval before release,
matching AC-02.

### 4.7 Report Cards
*Owner office: Registrar. Not yet built — this table is the target for when it is.*

| Role | A | P | X |
|---|---|---|---|
| PRIN | ✓ (own institution) | | |
| REG | | ✓ | ✓ |

Guardian/student self-export of their own record already exists in
spirit via the Personalisation Centre's "Download My Data" feature.

### 4.8 Hifz Records
*Owner office: Qur'an College. Governing: IQ-01.*

| Role | V | C | E | A |
|---|---|---|---|---|
| MUH | own assigned students | ✓ | ✓ | |
| QC-OFF | institution-wide | ✓ | ✓ | ✓ (stage advancement) |
| PRIN (Qur'an College) | ✓ | | | ✓ (jointly, per IQ-01's "Principal puts forward") |
| REG | snapshot only (matches the guardian-dashboard snapshot already shipped) | | | |

Assessment fields stay free text (murajaah_note/tajweed_note), not a
numeric score — IQ-04 Tajweed Assessment Policy doesn't exist yet; this
matrix doesn't invent a rubric ahead of it, matching the discipline
already applied when this table was first built.

### 4.9 Muraja'ah Records
*Folded into Hifz Records per IQ-03 (Partial, within IQ-01 §7.1) — same table as §4.8, same owners.*

### 4.10 Ijazah Records
*Owner office: Qur'an College jointly with Registrar (credentialing). Governing: IQ-02.*

| Role | V | C (record the outcome) | A (grant/revoke) | Ar |
|---|---|---|---|---|
| QC-OFF | ✓ | ✓ | | |
| PRIN (Qur'an College) | ✓ | | ✓ (jointly with QC-OFF) | ✓ (revocation, with reason) |
| REG | ✓ | | | |
| STUDENT/GUARDIAN | own only | | | |

**No Delete, ever** — already enforced at the schema level
(`ON DELETE SET NULL`, frozen `student_full_name`). "Create" here means
recording an external examining scholars' decision, not originating a
credential internally — IQ-02 keeps the actual examination external.
**Verify** (public, third-party lookup by reference number) is
deliberately not a staff permission at all — it's the still-deferred
IQ-02 §7.5 public endpoint, unauthenticated by design once built.

### 4.11 Admissions
*Owner office: proposed Admissions Officer, final verification by Registrar per PA-05.*

| Role | V | C | A | X |
|---|---|---|---|---|
| ADM | ✓ | ✓ | | |
| REG | ✓ | | ✓ (verification, waiting-list) | ✓ |
| PRIN | own institution | | ✓ (offer decision, jointly) | |

### 4.12 Finance
*Owner office: proposed Finance Officer. Governing: FN-01 (control principle only — FN-03/04/05 Missing).*

| Role | V | C | E | A | X |
|---|---|---|---|---|---|
| FIN | ✓ | ✓ | ✓ | | ✓ |
| EXE | aggregate only (already built) | | | ✓ (refund/waiver/scholarship — no policy exists yet to route this through, flagged) | |

**Explicit separation of duties**: FIN has no Student Record edit
access (§4.1) and no Academic Record access (§4.5/4.6) — matches FN-01's
own stated principle. Do not build Finance write access ahead of
FN-03/04/05 the same way the Founder Dashboard's fee figures are
labelled a snapshot, not a ledger.

### 4.13 Certificates
*Owner office: Registrar. Governing: AC-05 (Missing).*

| Role | V | C | A |
|---|---|---|---|
| REG | ✓ | ✓ (once graduation approved) | |
| PRIN | own institution | | ✓ (jointly with REG) |

This is the first area where "jointly" is a real, enforced two-step
approval in code, not just documented text — see
`docs/approval-workflow-architecture.md`. A Registrar's `issue` action
creates a pending request; the certificate only exists once a distinct
Principal actually decides on it via their own `A` grant here.

Verify: same public-endpoint pattern as Ijazah — future work, not a
staff permission.

### 4.14 Transcripts
*Owner office: Registrar.*

| Role | V | C | X |
|---|---|---|---|
| REG | ✓ | ✓ | ✓ |
| STUDENT/GUARDIAN | own only | | own only (already built) |

### 4.15 Communications
*Owner varies by content and audience.*

| Role | C | E | P | Ar |
|---|---|---|---|---|
| REG | school-wide academic notices | ✓ | ✓ | ✓ |
| PRIN | own-institution notices | ✓ | ✓ (own institution) | ✓ |
| TCH | own-class parent messages (not yet built — Teacher Portal item) | | own class only | |
| EXE | institution-wide announcements | ✓ | ✓ | ✓ |

**E and Ar added during the Announcements admin migration**
(`identity-migration-plan.md`, Migration Phase D item #4b). The original
version of this row only named C and P — enough for authoring and
publishing a notice, but not for the real `update` and `archive` actions
`admin/announcements.js` has had since it was first built (see
§4.15 history: the endpoint was live before this Matrix cell was
complete, a documentation gap rather than a code one). REG, PRIN, and EXE
already hold full authorial + publishing authority (C+P) over
communications; granting them E (edit a draft before publishing) and Ar
(archive a notice once it's done, never delete) is the same authority's
natural lifecycle, not a new one — and uses the same low-privilege codes
this Matrix pairs with C everywhere else for that exact pattern (see
§4.12 Finance's FIN row: C+E together). TCH is deliberately excluded: TCH
never held C here, and its row is still "not yet built."

`feature`/`unfeature` (marking a published notice as the single homepage
hero, or clearing that slot) has no dedicated permission code — it isn't
V/C/E/D/A/P/X/Vf/Ar/MU, it's an app-specific state on top of an already-
published record. Rather than invent an eleventh code for one field on
one table, the endpoint reuses **P**: a role trusted to decide what the
public sees (Publish) is also trusted to decide which published item is
most prominent. This is a judgement call, stated here rather than left
implicit in code.

**A named scope-enforcement gap:** PRIN's "own institution" scope cannot
be checked at the row level today — `announcements` has no
`institution_id` column; `category` (e.g. `quran_college`,
`arabic_studies`) is a loose editorial label, not a foreign key to
`institutions`. `admin/announcements.js` therefore checks the Matrix
grant itself (does this PRIN session hold C/E/P/Ar on `communications`
at all?) but cannot additionally confirm the specific notice belongs to
that Principal's own institution — the same category of gap as MUH's
missing assigned-student data in `hifz_records` (identity-migration-plan.md
§ Hifz/Ijazah status update), named here rather than silently assumed
away. Fixing it for real would mean adding an institution/category
mapping to the schema, tracked as future work, not done as part of this
migration.

### 4.16 Policies
*Owner: policy-owning office per `policy-code-index.md` (e.g. Registrar owns AC-02). Approval: Board of Governors for Tier 1.*

No in-system publish permission exists — this is git-based (a document
is drafted, Board-approved, then physically added to the site by
whoever holds repository access). Recommendation: **keep this git-based**
rather than building a policy CMS prematurely; the current review
discipline (one document at a time, verified before commit) is working.

### 4.17 Website Content
Same reality as Policies — no CMS, no in-system Publish permission
exists. Not a gap to fix in Phase 2.

### 4.18 Governance Documents
*Owner: Board of Governors.* Same git-based reality.

### 4.19 Analytics

| Role | V |
|---|---|
| EXE | all institutions, aggregate (already built — Founder Dashboard) |
| PRIN | own institution only (not yet built) |
| REG | academic-record-scoped (not yet built) |

### 4.20 System Settings
*Owner: ICT / System Administrator.*

| Role | V | E | MU |
|---|---|---|---|
| SYSADMIN | ✓ | ✓ | ✓ |
| ICT | ✓ | operational settings only | |
| EXE | ✓ | | approve new SYSADMIN/staff accounts only |

**This is the tier every environment variable/bearer token in this
project (`PORTAL_ADMIN_TOKEN`, `PORTAL_QURAN_TOKEN`,
`PORTAL_FOUNDER_TOKEN`, and the future per-role staff logins) ultimately
answers to.** Manage Users is restricted to exactly one operational role
system-wide, with Executive approval required to create a new
SYSADMIN account — the single highest-blast-radius grant in this
entire matrix, and the reason it gets the narrowest population.

---

## 5. Future scalability — multi-campus, multi-institution, university expansion

Nothing in this matrix is SHRS-specific in structure. Every role's scope
is expressed as **role + institution**, never a flat global grant (PRIN
is scoped to "own institution," TCH to "own assigned classes," QC-OFF to
"Qur'an College," etc.) — the same pattern already proven by the Student
Portal's dual-enrolment work, where `institution` is a queryable
dimension on every class, not a hardcoded assumption. Adding a second
campus, a fifth institution, or a future university tier means adding
new `institution`/`class` rows and, later, a `campus_id` dimension
alongside it — it does not mean redesigning who can see what. A future
Principal at a second campus gets the exact same PRIN role, scoped to
their own institution's data, automatically.

---

## 6. Success criterion check

Every module named in the directive can be built directly from this
matrix without further permission design:

- **Teacher Portal** → §4.4, §4.5, §4.8, §4.15 (TCH/MUH/ARB rows)
- **Registrar Office** → §4.1, §4.2, §4.6, §4.7, §4.11, §4.13, §4.14
- **Admissions Office** → §4.11
- **Finance Office** → §4.12 (with FN-03/04/05 named as the real
  blocker, not a code gap)
- **Principal Dashboard** → the PRIN column across every section, plus
  §4.19
- **Executive Dashboard** → already built (Founder Dashboard); §4.19
  shows exactly what it's scoped to see
- **Future LMS** → slots into §4.5/§4.6's TCH grants without a new
  permission category

Where a module is blocked, it's blocked on a **named, real** gap (a
Missing policy code, an unappointed role) — not on an undefined
permission model.

**Status update — Teacher Portal (TCH row).** Built per
`docs/teacher-portal.md`: §4.4/§4.5's "own class, own period" / "own
subject/class" scope qualifiers, which this document could only state
in prose, now have a real data structure to be checked against
(`teacher_class_assignments`, added by Teacher Identity & Academic
Workforce Activation) and two endpoints that enforce it
(`staff/teacher/attendance.js`, `assessments.js`). §4.15's TCH
Communications row is unchanged — still "not yet built." The MUH/ARB
halves of §4.4/§4.5 are unchanged too — still no issued account for
either role.

See `docs/data-ownership-register.md` for the companion document mapping
each record type to its owner, retention authority, and approval chain.
