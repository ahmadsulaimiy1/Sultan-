# SHRS Admissions Policy

**Status:** DRAFT v0.1 — not yet adopted. Builds directly on the real,
live 12-stage admission process already published at `/admission/` —
does not replace it, governs around it.
**Owner (proposed):** CEO (Zakariya Olanrewaju Anofi), in consultation
with each institution's Principal/Head Teacher for institution-specific
eligibility.
**Review cycle:** Annual.
**Related documents:** Data Protection & Privacy Policy (application
data handling), Academic Regulations (Phase B, for placement-assessment
context), Child Protection & Safeguarding Policy (safer-recruitment
principle extends conceptually to safer-admission vetting where
relevant, e.g. transfer students with a disciplinary history).

> **Before this governs a real decision:** fee structure, scholarship
> criteria, and international-student arrangements are left
> deliberately open below, exactly as the live admission page already
> discloses to the public. This policy does not invent figures to fill
> that gap — it states what SHRS has told visitors directly: that
> information isn't published yet.

---

## 1. Purpose

To govern the principles behind SHRS's admission process — who is
eligible, how selection decisions are made, what happens to
application data, and how a disputed decision is appealed — as the
policy layer above the live 12-stage process, which already tells a
family exactly what steps to expect.

## 2. Scope

All prospective students across all four institutions.

## 3. Definitions

- **Applicant** — a prospective student whose guardian has submitted
  an admission form.
- **Entrance assessment** — the existing "Entrance Exam" stage (test
  and interview) already named on the live admission page; not a new
  step.
- **Admission letter** — the existing unique-number letter issued at
  Stage 9 of the live process.

## 4. Admissions principles

1. Admission decisions are based on the entrance assessment and
   documentation, applied consistently regardless of the family's
   background, in line with the Equal Opportunity Policy (Policy V,
   live).
2. The 12-stage process (already live at `/admission/`) is the single
   source of truth for what a family experiences — this policy adds
   the criteria behind Stage 5 (Entrance Exam) and Stage 7 (Admission
   Offer) decisions, not a competing process description.
3. Required documentation is exactly what the live page already states
   — birth certificate, two passport photographs, and a report sheet
   or testimonial from the previous school — this policy does not add
   undisclosed requirements.

## 5. Eligibility

- **Nursery & Primary:** age-based eligibility per the live academics
  page (from age 2) — the exact minimum age cutoff per class level
  should be confirmed and stated explicitly here once provided by the
  school (not invented).
- **Royal College, Qur'an College, School of Arabic & Islamic
  Studies:** eligibility follows successful completion of the entrance
  assessment (Stage 5) and, for transfer students, an academic-standing
  check against their previous school's report (part of the required
  documentation already collected at Stage 3).

## 6. Selection criteria

- Performance in the entrance exam, test, and interview (Stage 5) —
  already the live process's stated basis for the Admission Offer
  (Stage 7). This policy does not add hidden selection criteria beyond
  what stage already discloses to families.
- For Qur'an College specifically: prior Qur'anic learning experience
  may inform placement level once admitted, governed by the Hifz
  Regulations (Phase B), not a pre-admission selection filter.

## 7. Documentation requirements

Exactly the live page's required-documents list: birth certificate,
passport photographs (2 copies), and a report sheet or testimonial
certificate from the previous school. This policy adds one governance
layer: documentation is verified for authenticity by the Registrar
before an Admission Offer is confirmed (Stage 7), closing a gap the
live page doesn't currently state.

## 8. Interviews & assessments

The entrance exam, test, and interview (Stage 5) are conducted by
staff designated by the relevant Principal/Head Teacher. Results are
recorded and retained per Section 12 (Record Retention) below — not
just used once and discarded, so a family can query a past decision if
needed.

## 9. International students

**Not defined.** The live admission page does not describe
international-student arrangements, and this policy does not invent
visa, documentation-equivalency, or fee arrangements for a category of
student SHRS has not yet published guidance for. This section remains
a placeholder until the school provides real criteria.

## 10. Scholarships

**Not defined**, for the same reason — the live admission page states
plainly that "scholarship criteria... aren't published on the current
site or in any policy document." This policy preserves that honesty
rather than fabricating a scholarship framework.

## 11. Enrollment

Formalised at Stage 10 (Class Acceptance Ticket) and Stage 11 (Start of
Classes) of the live process. This policy adds: a new student's
Parent Portal guardian account and activation link (per
`docs/parent-portal.md`) is issued at this stage, alongside the
physical Class Acceptance Ticket — closing a real integration gap
between the live admission flow and the live Portal that no document
currently states explicitly.

## 12. Withdrawal

- A guardian withdrawing a student notifies the Registrar in writing.
- The student's Portal status is updated to `withdrawn` (a status the
  Portal's schema already supports — see `sql/schema.sql` — surfaced to
  guardians as a badge rather than hidden, per
  `docs/parent-portal-audit.md`).
- **Refund terms on withdrawal are not defined here** — they depend on
  the fee schedule this policy explicitly does not invent (Section 9,
  Fees, in the Parent Handbook, similarly left open).

## 13. Record retention

Application and admission records (entrance assessment results,
submitted documentation) are retained by the Registrar's office.
**A specific retention period is not set here** — it should be decided
alongside the Data Protection & Privacy Policy's own unresolved
retention-period gap (see that document, Section 5), not set
independently and risk contradicting it.

## 14. Appeals

A guardian disputing a non-admission decision may request a review by
the CEO, who was not part of the entrance-assessment decision itself —
following the same independent-reviewer, defined-response-window
convention used throughout this document ecosystem (see
`phase-b-dependency-review.md` §3), rather than a newly invented
process.

## 15. Compliance

No specific Nigerian/Lagos State education-admission regulation is
cited here because none has been verified as applicable — a matter for
legal confirmation, not assumption.

## 16. Monitoring & compliance

CEO reviews admission-decision consistency annually against the
Equal Opportunity Policy (Policy V) to confirm no institution's
practice has drifted from stated criteria.

## 17. Review cycle

Annual.

## 18. Version control

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1 | Draft | Initial draft from Governance Master Register, Phase B | Drafted per SHRS governance directive; not yet reviewed or adopted; fees, scholarships, and international-admission sections intentionally left open pending real school input |
