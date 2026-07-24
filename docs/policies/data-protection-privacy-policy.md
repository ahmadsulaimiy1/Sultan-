# SHRS Data Protection & Privacy Policy

**Status:** DRAFT v0.1 — not yet adopted.
**Owner (proposed):** CTO-equivalent (currently the closest real role is
the ICT Head, Mr. Oguntade Adebola Aliu — this policy's ownership
should be confirmed by the Board, since data protection ownership is
usually a named accountable individual, not just a department).
**Review cycle:** Annual, or immediately on any data breach or change
to the Parent Portal's data handling.
**Depends on:** Parent Portal (already live — `docs/parent-portal.md`,
`docs/parent-portal-audit.md`); Child Protection & Safeguarding Policy
(for the safety-override exception in Section 9).

> **Before this governs a real decision:** this document must be
> reviewed by legal counsel familiar with the Nigeria Data Protection
> Act 2023 (NDPA) and the Nigeria Data Protection Commission's (NDPC)
> guidance before adoption. The NDPA and NDPC are real, and SHRS's
> Parent Portal — which already stores real names, contact details,
> attendance, academic, and fee records for real children and their
> guardians — is squarely the kind of processing the NDPA governs. This
> draft states what the Portal technically does today (verified against
> its actual code) and proposes governance around it; it does **not**
> certify that SHRS is NDPA-compliant, and specific obligations (e.g.
> whether SHRS must register with the NDPC as a data controller of
> major importance, breach-notification deadlines, cross-border
> transfer rules) need confirmation from qualified counsel.

---

## 1. Purpose

To state what personal data SHRS collects about students, guardians,
and staff; why; who can see it; how long it is kept; and what rights
a guardian has over their own and their child's data — across every
system that touches it today (the Parent Portal) and in future
(a Student Portal, Staff Portal, and any AI-assisted system).

## 2. Scope

Applies to all personal data processed by SHRS through any digital
system, currently limited to the Parent Portal (student records,
attendance, academic term results, fee status, guardian accounts,
in-portal notifications) and the website's AI assistant (which does not
currently authenticate users or store conversation history server-side
— this should be re-verified against `docs/digital-assistant.md` at
each review, since assistant behaviour can change independently of this
policy).

## 3. Definitions

- **Personal data** — any information relating to an identified or
  identifiable person (a named student, a named guardian).
- **Processing** — collecting, storing, using, or disclosing personal
  data, by a human or a system.
- **Data controller** — the entity that decides why and how data is
  processed (SHRS, as an institution).
- **Data subject** — the person the data is about (a student or a
  guardian).
- **Guardian** — a parent or legal guardian with a Parent Portal
  account linked to one or more students.

## 4. What the Parent Portal actually stores today

*(Kept factual and specific, verified against `sql/schema.sql`, so this
section can't drift silently from what the system really does.)*

- **Guardian accounts:** name, email, a scrypt-hashed password (or, for
  a newly created account, a time-limited activation token instead of a
  password), failed-login-attempt count and lockout timestamp.
- **Student records:** name, class, enrolment status (active,
  graduated, withdrawn, or suspended), and the guardian(s) linked to
  them.
- **Academic data:** term-level results and attendance summaries (not
  per-lesson granularity — see `docs/parent-portal-audit.md` for why
  this is a deliberate Phase 1 scope decision, not a gap).
- **Financial data:** a fee-status snapshot per term (paid / balance
  outstanding), not full transaction/payment-processor data.
- **Notifications:** short system-generated messages to a guardian
  (e.g. a new result posted), with a read/unread flag.
- **What it does not store:** health/medical data, disciplinary
  records, free-text notes about a child, or any data beyond what is
  listed above. If any of those are added in a future phase, this
  policy must be updated before that data starts flowing.

## 5. Principles

1. Data is collected only for a stated, legitimate school purpose —
   never speculatively "in case it's useful later."
2. A guardian can only ever see their own linked child(ren)'s data —
   this is already enforced in the Portal's access-control logic
   (verify this claim still holds at each review; do not assume it
   silently).
3. Staff access to guardian/student data is role-scoped, not
   all-or-nothing (admin endpoints require an admin token distinct from
   a guardian's session).
4. Data is kept only as long as it serves a purpose — see the
   retention section below, which currently has **no defined retention
   period and needs one** (flagged as a real gap, not resolved by this
   draft).
5. Security failures are disclosed, not hidden — see Section 8.

## 6. Responsibilities

| Role | Responsibility |
|---|---|
| Board of Trustees | Approves this policy and any material change to what data the Portal collects. |
| Data Protection Owner *(role to be confirmed — proposed: ICT Head)* | Maintains this policy, is the first point of contact for a data-subject request or a suspected breach. |
| ICT Head | Implements technical controls (already includes: scrypt password hashing, timing-safe token comparison, login lockout — see `docs/parent-portal-audit.md`). |
| Admin-portal staff (Registrar, class teachers with admin access) | Only enter data that is accurate and necessary; do not share admin tokens. |
| Guardians | Responsible for keeping their own login credentials confidential. |

## 7. Guardian rights (proposed — pending legal confirmation of exact NDPA entitlements)

- **Access:** a guardian can already see all data linked to their
  child(ren) via the dashboard (`/api/portal/me`).
- **Correction:** currently requires contacting the school directly
  (Registrar) to correct an error — there is no self-service edit form
  yet, which is a reasonable Phase 1 limitation given accuracy of
  academic/financial records should stay staff-controlled.
- **Portability / erasure:** **not yet implemented or defined.** This
  is a genuine gap: NDPA-style regimes typically expect some form of
  these rights, and SHRS has not yet decided how a guardian would
  request deletion of their account, or what happens to a graduated
  student's historical records on request. This needs a Board decision,
  informed by legal advice, before it can be answered honestly to a
  parent who asks.

## 8. Breach response

- Any suspected unauthorised access, data leak, or credential
  compromise is reported to the Data Protection Owner the same day it
  is discovered.
- **This policy does not yet define a breach-notification timeline to
  affected guardians or to the NDPC** — that timeline is a legal
  requirement to confirm, not something to guess at here.
- Until a formal process exists, the default is: assume disclosure is
  required, and seek legal advice on timing rather than staying silent
  by default.

## 9. Interaction with the Child Protection & Safeguarding Policy

Where a safeguarding concern requires sharing a child's data with an
external statutory body (see the Safeguarding Policy, Section 6.4),
that duty overrides the confidentiality provisions of this policy. This
is a deliberate, named exception — not an oversight — and should be
mirrored as a cross-reference in the Safeguarding Policy.

## 10. Compliance

Written with awareness of the Nigeria Data Protection Act 2023 and the
Nigeria Data Protection Commission. **Does not certify compliance.**
Retention periods, data-subject rights (Section 7), and breach-
notification timelines (Section 8) are the three concrete open items
that need legal input before this policy can be considered complete,
not just reviewed.

## 11. Appeals

A guardian who believes their or their child's data has been
mishandled may raise it through the existing Complaint Policy (Policy
IX) as the first step, escalating to the Data Protection Owner and, if
unresolved, the Board.

## 12. Exceptions

Safeguarding disclosures (Section 9). No other exceptions are defined;
any future exception must be added here explicitly, not assumed.

## 13. Review cycle

Annual, or immediately after any breach, or any material change to
what the Parent Portal collects or how it's used (e.g. adding a Student
Portal, adding AI-assisted features that process student data).

## 14. Version control

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1 | Draft | Initial draft from Governance Master Register, Phase A | Drafted per SHRS governance directive; not yet reviewed or adopted |
