# Policy PA-05 — Admissions Policy

*Retrofitted to the full 13-section governance architecture and
substantially deepened, per the Tier 2 retrofit directive. Builds
directly on the real, live 12-stage admission process already
published at `/admission/` — does not replace it, governs around it.
Every provision from v1.0 is preserved, including the deliberate
honesty about fees/scholarships/international arrangements not being
invented. New in v2.0: safer-admission vetting for transfer students,
and a waiting-list/deferred-admission procedure. New in v2.1: a
cross-reference to the new image/media consent structure (Data
Protection & Privacy Policy, IT-02, §7.10), captured at the same
documentation stage.*

## 1. Policy Information

| Field | Value |
|---|---|
| Policy Code | PA-05 |
| Policy Title | Admissions Policy |
| Version | 2.1 (retrofitted from v1.0, Phase B; image-consent cross-reference added Phase G) |
| Effective Date | Not yet effective — pending Board adoption |
| Policy Owner | Head of Schools / Administrator (Zakariya Olanrewaju Anofi), in consultation with each institution's Principal/Head Teacher for institution-specific eligibility |
| Approval Authority | Board of Governors |
| Review Cycle | Annual |
| Next Review Date | Not yet set — to be fixed upon adoption |

> **Before this governs a real decision:** fee structure, scholarship
> criteria, and international-student arrangements are left
> deliberately open below, exactly as the live admission page already
> discloses to the public. This policy does not invent figures to fill
> that gap — it states what SHRS has told visitors directly: that
> information isn't published yet.

---

## 2. Purpose

To govern the principles behind SHRS's admission process — who is
eligible, how selection decisions are made, what happens to
application data, and how a disputed decision is appealed — as the
policy layer above the live 12-stage process, which already tells a
family exactly what steps to expect.

## 3. Scope

All prospective students across all five institutions.

## 4. Definitions

- **Applicant** — a prospective student whose guardian has submitted
  an admission form.
- **Entrance assessment** — the existing "Entrance Exam" stage (test
  and interview) already named on the live admission page; not a new
  step.
- **Admission letter** — the existing unique-number letter issued at
  Stage 9 of the live process.
- **Transfer student** — an applicant previously enrolled at another
  school, whose academic and conduct history (Section 7.9) is assessed
  as part of admission.
- **Waiting list** — a status for an applicant who met eligibility but
  could not be offered a place due to capacity, distinct from a
  non-admission decision.

## 5. Policy Statement

Admission decisions are based on the entrance assessment and
documentation, applied consistently regardless of the family's
background, in line with the Equal Opportunity Policy (SW-04, live).
The 12-stage process (already live at `/admission/`) is the single
source of truth for what a family experiences — this policy adds the
criteria behind Stage 5 (Entrance Exam) and Stage 7 (Admission Offer)
decisions, not a competing process description. Required documentation
is exactly what the live page already states — birth certificate, two
passport photographs, and a report sheet or testimonial from the
previous school — this policy does not add undisclosed requirements.

## 6. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| Head of Schools / Administrator | Owns this policy; decides admission appeals (Section 12). |
| Registrar | Verifies documentation authenticity; maintains admission records (Section 9); administers the waiting list (Section 7.10). |
| Principal / Head Teacher (per institution) | Designates entrance-assessment staff (Section 7.4); confirms institution-specific eligibility. |
| Designated Safeguarding Lead *(SW-02, once appointed)* | Consulted on the safer-admission vetting procedure (Section 7.9) for a transfer student with a disclosed disciplinary or safeguarding history. |

## 7. Procedures

### 7.1 Eligibility
- **Basic School:** age-based eligibility per the live academics
  page (from age 2) — the exact minimum age cutoff per class level
  should be confirmed and stated explicitly here once provided by the
  school (not invented).
- **Secular College, Qur'an College, Islamiyyah College:** eligibility
  follows successful completion of the entrance
  assessment (Stage 5) and, for transfer students, an academic-standing
  check against their previous school's report (part of the required
  documentation already collected at Stage 3).

### 7.2 Selection criteria
- Performance in the entrance exam, test, and interview (Stage 5) —
  already the live process's stated basis for the Admission Offer
  (Stage 7). This policy does not add hidden selection criteria beyond
  what stage already discloses to families.
- For Qur'an College specifically: prior Qur'anic learning experience
  may inform placement level once admitted, governed by the Hifz
  Regulations (IQ-01), not a pre-admission selection filter.

### 7.3 Documentation requirements
Exactly the live page's required-documents list: birth certificate,
passport photographs (2 copies), and a report sheet or testimonial
certificate from the previous school. This policy adds one governance
layer: documentation is verified for authenticity by the Registrar
before an Admission Offer is confirmed (Stage 7), closing a gap the
live page doesn't currently state. At the same stage, a guardian is
asked to complete the image/media consent structure proposed in the
Data Protection & Privacy Policy (IT-02) §7.10 — this policy points to
that document as the single authoritative source for the consent
procedure itself, rather than restating it here. **This is a new
provision, not previously stated in v2.0** — added alongside IT-02
§7.10, which it depends on.

### 7.4 Interviews and assessments
The entrance exam, test, and interview (Stage 5) are conducted by
staff designated by the relevant Principal/Head Teacher. Results are
recorded and retained per Section 9 (Records and Documentation) below —
not just used once and discarded, so a family can query a past decision
if needed.

### 7.5 International students
**Not defined.** The live admission page does not describe
international-student arrangements, and this policy does not invent
visa, documentation-equivalency, or fee arrangements for a category of
student SHRS has not yet published guidance for. This section remains
a placeholder until the school provides real criteria.

### 7.6 Scholarships
**Not defined**, for the same reason — the live admission page states
plainly that "scholarship criteria... aren't published on the current
site or in any policy document." This policy preserves that honesty
rather than fabricating a scholarship framework.

### 7.7 Enrollment
Formalised at Stage 10 (Class Acceptance Ticket) and Stage 11 (Start of
Classes) of the live process. This policy adds: a new student's Parent
Portal guardian account and activation link (per `docs/parent-
portal.md`) is issued at this stage, alongside the physical Class
Acceptance Ticket — closing a real integration gap between the live
admission flow and the live Portal that no document currently states
explicitly.

### 7.8 Withdrawal
- A guardian withdrawing a student notifies the Registrar in writing.
- The student's Portal status is updated to `withdrawn` (a status the
  Portal's schema already supports — see `sql/schema.sql` — surfaced to
  guardians as a badge rather than hidden, per
  `docs/parent-portal-audit.md`).
- **Refund terms on withdrawal are not defined here** — they depend on
  the fee schedule this policy explicitly does not invent (Financial
  Governance Framework, FN-02).

### 7.9 Safer-admission vetting for transfer students
- A transfer student's previous-school report (Section 7.3) is reviewed
  by the Registrar for any disclosed disciplinary or safeguarding
  history, consistent with the safer-recruitment principle the Child
  Protection & Safeguarding Policy (SW-01) §7.11 applies to staff —
  extended here conceptually to admissions, not as a duplicate
  procedure.
- Where a disclosed history raises a safeguarding question, the
  Registrar consults the Designated Safeguarding Lead before the
  Admission Offer (Stage 7) is confirmed — this does not create an
  automatic exclusion; it ensures the decision is informed.
- **This is a new provision, not previously stated in v1.0** — added
  because the underlying documentation was always collected (Stage 3)
  but this Regulation had never stated what happens to a disclosed
  history academically or from a safeguarding standpoint.

### 7.10 Waiting list and deferred admission
- An applicant who meets eligibility (Section 7.1) and passes the
  entrance assessment (Section 7.2) but cannot be offered a place due
  to capacity is placed on a waiting list, administered by the
  Registrar, in the order assessed — not on any other basis.
- A waiting-list applicant is informed of their status and given a
  realistic estimate of when a place might become available, rather
  than left without any update.

## 8. Monitoring and Compliance

Head of Schools / Administrator reviews admission-decision consistency annually against the Equal
Opportunity Policy (SW-04) to confirm no institution's practice has
drifted from stated criteria.

## 9. Records and Documentation

Application and admission records (entrance assessment results,
submitted documentation) are retained by the Registrar's office. **A
specific retention period is not set here** — it is set in the Records
Retention Policy (IT-04), which proposes a period for this exact
category; this policy does not set an independent, potentially
conflicting one.

## 10. Related Policies

Data Protection & Privacy Policy (IT-02, application data handling),
Academic Regulations (AC-02, transfer-student academic standing §7.7),
Child Protection & Safeguarding Policy (SW-01, safer-admission vetting
§7.9), Equal Opportunity Policy (SW-04, live), Financial Governance
Framework (FN-02, fee/refund terms this policy does not itself set).

## 11. Exceptions

None defined.

## 12. Appeals and Complaints

A guardian disputing a non-admission decision may request a review by
the Head of Schools / Administrator, who was not part of the entrance-assessment decision itself —
following the same independent-reviewer, defined-response-window
convention used throughout this document ecosystem (see
`phase-b-dependency-review.md` §3), rather than a newly invented
process.

## 13. Review and Amendment

Annual. No specific Nigerian/Lagos State education-admission
regulation is cited here because none has been verified as applicable
— a matter for legal confirmation, not assumption.

## Version control

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | Draft | Initial draft, Phase B | Drafted per SHRS governance directive; not yet reviewed or adopted; fees, scholarships, and international-admission sections intentionally left open pending real school input |
| 2.0 | Draft | Retrofitted to the full 13-section architecture, Phase F Tier 2 retrofit — added safer-admission vetting for transfer students and a waiting-list/deferred-admission procedure; assigned a policy code (PA-05) for the first time, having been drafted since Phase B without one | Not yet reviewed or adopted |
| 2.1 | Draft | Phase G — cross-referenced the new image/media consent structure (IT-02 §7.10) at the Section 7.3 documentation stage | Not yet reviewed or adopted |
