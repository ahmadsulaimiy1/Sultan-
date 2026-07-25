# Policy IT-04 — Records Retention Policy

*Retrofitted to the full 13-section governance architecture and
deepened, per the Tier 2 retrofit directive. Unlike most documents in
this set, this one was written to actually **resolve** an open item —
"no retention period defined" — rather than defer it; every proposed
period from v1.0 is preserved unchanged. New in v2.0: a legal-hold
procedure and a periodic data-minimisation review.*

## 1. Policy Information

| Field | Value |
|---|---|
| Policy Code | IT-04 |
| Policy Title | Records Retention Policy |
| Version | 2.1 (retrofitted from v1.0, Phase C; archival/destruction-authority section added post-Registrar's-Office phase) |
| Effective Date | Not yet effective — pending Board adoption |
| Policy Owner | Registrar, Royal College (Mrs. Anofi-Abdulkareem Mariam Tope), jointly with the ICT Head for Portal-held data |
| Approval Authority | Board of Trustees, with legal input given the intersection with the NDPA 2023 |
| Review Cycle | Annual, or immediately after any change to the Data Protection & Privacy Policy's retention-related sections |
| Next Review Date | Not yet set — to be fixed upon adoption |

> **Before this governs a real decision:** every retention period below
> is a proposed default grounded in common school-record-keeping
> practice, not a period SHRS currently applies or a period required by
> a specific Nigerian statute this draft has verified. The Board (with
> legal input, given the intersection with the NDPA 2023) must confirm
> or adjust each one before this policy is treated as binding.

---

## 2. Purpose

To set, for the first time, how long each category of record SHRS
holds is kept, closing the gap named repeatedly across the Data
Protection & Privacy Policy, Academic Regulations, and Admissions
Policy — each of which needed an answer and correctly deferred to this
document rather than each inventing its own. The Data Protection &
Privacy Policy (IT-02) §5/§8 already point here rather than restating
"no period defined yet" — this document is that answer.

## 3. Scope

All student, guardian, staff, and applicant records held by SHRS in any
system, including the Parent Portal.

## 4. Definitions

Reuses "personal data," "processing," and "data controller" from the
Data Protection & Privacy Policy (IT-02) without redefining them.

- **Legal hold** — a suspension of normal deletion/anonymisation for a
  specific record where litigation, a regulatory inquiry, or an
  ongoing safeguarding investigation makes early deletion
  inappropriate (Section 7.4).
- **Data minimisation review** — a periodic check of whether a stored
  data category still serves the purpose it was collected for (Section
  7.5).

## 5. Policy Statement

A record is kept only as long as it serves a genuine purpose — defined
per category in Section 7.1, not as a blanket "keep everything forever"
default. Some categories are deliberately long or indefinite where the
record's value outlives enrolment (an Ijazah register entry, for
example) — these are named exceptions (Section 11), not oversights.
When a retention period expires, the record is deleted or anonymised,
not simply left in place because deleting it wasn't automated — this
is a real operational commitment, not just a paper policy, and should
be checked at each annual review.

## 6. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| Registrar | Owns academic, admission, and disciplinary record retention. |
| ICT Head | Owns Parent Portal account retention and deletion mechanics. |
| Designated Safeguarding Lead *(SW-02, once appointed)* | Owns the safeguarding-log retention category specifically, given its sensitivity; decides any legal hold (Section 7.4) with a safeguarding dimension. |

## 7. Procedures

### 7.1 Proposed retention periods (pending Board confirmation)
| Record category | Proposed period | Rationale |
|---|---|---|
| Parent Portal account (guardian) | Duration of the last linked child's enrolment + 2 years | Allows a returning family's history to be found without keeping accounts indefinitely. |
| Student academic records (term results, attendance summaries) | Duration of enrolment + 7 years after graduation/withdrawal | A common school-sector benchmark allowing a former student to request a transcript years later; **not a Nigerian legal citation**, a proposed default. |
| Application/admission records (entrance assessment results, submitted documentation) | 3 years from decision if not admitted; duration of enrolment + 7 years if admitted | Matches the academic-record period once a student is enrolled; shorter for unsuccessful applicants since the ongoing purpose is weaker. |
| Disciplinary records (Student Code of Conduct) | Duration of enrolment + 3 years | Long enough to inform a future reference request, short enough not to follow a graduate indefinitely for a resolved matter. |
| Safeguarding records (Child Protection & Safeguarding Policy incident log) | Until the student turns 25, or 7 years from the record's creation, whichever is longer | **This is the one category where common professional child-protection practice favours long retention** (a concern may only become clear years later) — this specific benchmark needs confirmation from a child-protection professional, not just internal Board judgement, given how much weight it carries. |
| Ijazah register | Indefinite | Already established in the Ijazah Governance Framework (IQ-02) §7.4 — restated here for completeness, not re-decided. |
| Staff records | Duration of employment + 6 years | Common employment-record benchmark; to be confirmed against actual Nigerian labour-record requirements. |
| Fee/payment records | 7 years | Common financial-record benchmark; to be confirmed against actual Nigerian tax/financial-record requirements once the Tuition & Fees Policy exists. |
| Visitor logs, security incident reports, drill/emergency records | Not yet set | Named as an open item across the Visitors Policy (SW-08), Health & Safety Policy (SW-07), and Emergency Response Plan (SW-09) — this table should be extended to cover these categories at the next review, not left implicitly uncovered. |

### 7.2 Deletion and anonymisation
At each annual review, the Registrar/ICT Head identify records past
their retention period (Section 7.1) and confirm deletion or
anonymisation — this is not automated today and should be tracked
manually until the Parent Portal or a future system supports it
directly.

### 7.3 Early deletion requests
A guardian's request for early deletion (see the Data Protection &
Privacy Policy, IT-02, §7.3's still-open erasure-rights question) is
handled under that policy once it defines the process — this policy
does not pre-empt that decision.

### 7.4 Legal hold
- Where litigation, a regulatory inquiry, or an ongoing safeguarding
  investigation makes early deletion of a specific record
  inappropriate, normal retention/deletion (Section 7.2) is suspended
  for that record until the hold is lifted.
- **This is a new provision, not previously stated in v1.0** — added
  because a retention *period* alone doesn't answer what happens if a
  record becomes relevant to an active matter right as its period
  would otherwise expire.

### 7.5 Data minimisation review
At each annual review, the Registrar and ICT Head jointly reconsider
whether every category in Section 7.1 still reflects what SHRS's
systems actually collect (Data Protection & Privacy Policy, IT-02, §5)
— a new data category added to the Parent Portal or any future system
should be added to this table before it starts accumulating
un-governed data, not discovered after the fact.

### 7.6 Archival vs. deletion — authority before mechanism

*New in v2.1, added in direct response to a governance instruction
following the Registrar's Office phase: before any deletion or purge
mechanism is coded, this policy must say who is authorised to archive
a record, who is authorised to destroy it, and which of those two
things this project's actual systems do today. This section answers
that, drawing on `docs/data-ownership-register.md` (the canonical
per-record ownership answer) and `docs/data-lifecycle-register.md` (the
canonical per-record technical-lifecycle answer) rather than re-deciding
either.*

**Archival and deletion are not the same event, and this project has
built almost exclusively the first.** Archiving means a record moves to
an inactive/superseded state but the row still exists and can still be
read (a student's `status` becoming `withdrawn`/`graduated`/`archived`;
a certificate's `revoked_at` being set; a delegation reaching its
`ends_at`). Deletion means the row is gone. Every system built in this
project so far defaults to the first and has, as a rule, never built the
second — Section 7.2's "identify records past retention and confirm
deletion or anonymisation" describes a manual review process this
policy has always required, not a capability that exists in code. That
gap is not new; what is new here is naming it precisely, category by
category, so nobody mistakes "we have a retention *period*" for "we
have a retention *mechanism*."

| Record category | Archival mechanism, as built today | Archive authority | Destruction mechanism, as built today | Destruction authority |
|---|---|---|---|---|
| Student record | `students.status` flag (`withdrawn`/`graduated`/`suspended`/`archived`) + `student_lifecycle_events` trail | Registrar (per `student_records` Edit grant) | **None exists in code** | None, per the Data Ownership Register — only a data-protection deletion request, itself not yet built |
| Guardian record | No dedicated archive flag; implicitly inactive once no linked active student remains | Registrar | **None exists in code** | Data-protection deletion request only (IT-02/`privacy_requests`) — the request-handling exists; the deletion action it would trigger does not |
| Attendance / Assessment / Result records | Overwritten in place on correction (no archive of the prior value); bundled with the student record's own archival | Registrar (attendance, as of Migration Phase A); no equivalent yet for assessments/results | **None exists in code** | None, per the Data Ownership Register |
| Hifz & Muraja'ah records | Overwritten in place on correction, same as above | Qur'an College Officer / Muhaffiz | **None exists in code** | None |
| Ijazah register | `revoked_at`/`revocation_note` — **the one category where archival is enforced at the schema level**, not just by convention (`ON DELETE SET NULL`, frozen `student_full_name`) | Qur'an College Officer + Principal jointly (recordable, not system-enforced — see Section 7.6.1) | **Structurally impossible** — no delete path exists in any endpoint, by design | **None, ever** — IQ-02 §7.6, the one already-settled answer in this entire register |
| Certificates | `revoked_at`/`revocation_note`, mirroring the Ijazah pattern deliberately | Registrar | **None exists in code** | None recommended, pending Board confirmation (arguably permanent — see Section 7.1) |
| Admissions/application records | `admissions_applications.status` (`declined`/`withdrawn`, etc.) — never removed, so a family's history stays traceable | Registrar / Principal | **None exists in code** | After the 3-year unsuccessful-applicant window, once Board-confirmed — no code implements this today |
| Staff portal account | `staff.status` (`active`/`suspended`/`archived`) | System Administrator, on confirmed departure | **None exists in code** | Data-protection deletion request only |
| Delegations | `revoked_at` or natural `ends_at` expiry, checked at query time (no cron) | Self-service by the delegator, or the delegate's manager | **None exists in code** — expired delegations are never purged, only ignored by the expiry check | Not yet assigned |
| Communication records (notifications, WhatsApp escalation logs) | None — **ungoverned**, matching the Data Ownership Register's own flag | Not yet assigned | **None exists in code** | Not yet assigned |

#### 7.6.1 What this table means for future code

No deletion or purge mechanism should be written for any category
above until its **Destruction authority** column says something other
than "None," "None recommended," "Not yet assigned," or "Data-protection
deletion request only" *and* that request-handling path is itself
built. Where this table says "None exists in code," that is the correct
state to leave a category in until the Board makes an explicit
destruction-authority decision for it — silence here is not an
oversight to be quietly fixed by whoever next touches that endpoint.
Where an *archival* mechanism already exists (most categories above),
new code may extend or reuse it freely; archival was never the gated
thing.

## 8. Monitoring and Compliance

Written with awareness of the NDPA 2023's general expectation that
data isn't kept longer than necessary — the specific periods in
Section 7.1 are proposals to satisfy that principle, not a certified
compliance position; legal confirmation is still required, especially
for the safeguarding-record category.

## 9. Records and Documentation

The annual review's findings (records identified for deletion, any
legal hold in effect, any data-minimisation finding) are logged by the
Registrar and ICT Head jointly.

## 10. Related Policies

Data Protection & Privacy Policy (IT-02), Ijazah Governance Framework
(IQ-02, for the indefinite-retention exception), Child Protection &
Safeguarding Policy (SW-01, for the safeguarding-log category),
Academic Regulations (AC-02), Admissions Policy (PA-05), Financial
Controls Policy (FN-01).

## 11. Exceptions

The Ijazah register (Section 7.1) is the one deliberate indefinite-
retention exception, already established elsewhere and not re-decided
here.

## 12. Appeals and Complaints

Not generally applicable; a guardian disputing how long their data was
kept raises it through the Complaint Policy (PA-01) or the Data
Protection & Privacy Policy (IT-02) §12, not a new channel.

## 13. Review and Amendment

Annual, or immediately after any change to the Data Protection &
Privacy Policy's retention-related sections, or any legal hold (Section
7.4) being placed or lifted.

## Version control

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1 | Draft | Initial draft, Phase C | Drafted per SHRS governance directive; not yet reviewed or adopted; every period is a proposed default pending Board and, for the safeguarding category, professional confirmation |
| 2.0 | Draft | Retrofitted to the full 13-section architecture, Phase F Tier 2 retrofit — added a legal-hold procedure, a periodic data-minimisation review, and named visitor/security/emergency record categories as not yet covered by the retention table | Not yet reviewed or adopted |
| 2.1 | Draft | Added Section 7.6 (Archival vs. Deletion — Authority Before Mechanism) and its per-category Archive/Destruction Authority table, per the governance instruction issued after the Registrar's Office phase: define retention, archival, and destruction authority before any deletion/purge mechanism is coded. No previously-stated period or authority changed; this section adds the archival/destruction dimension the v2.0 table didn't yet separate from "retention period." | Not yet reviewed or adopted |
