# Policy IT-02 — Data Protection & Privacy Policy

*Retrofitted to the full 13-section governance architecture and
substantially deepened, per the Tier 1 retrofit directive. Every
principle, factual claim about the Parent Portal, and open item from
v1.0 is preserved — none is weakened, removed, or quietly resolved
without real input. New in v2.0: third-party processor disclosure
(hosting/AI infrastructure), cross-border transfer awareness, a
dedicated children's-data section, consent/legal-basis discussion, and
a Data Protection Impact Assessment requirement for future systems. New
in v2.1: an image and media consent procedure — a gap surfaced directly
by the first real photography batch supplied for the website, where
three photos of identifiable students had to be held back because no
consent process existed to check them against.*

## 1. Policy Information

| Field | Value |
|---|---|
| Policy Code | IT-02 |
| Policy Title | Data Protection & Privacy Policy |
| Version | 2.1 (retrofitted from v1.0, Phase A; image-consent procedure added Phase G) |
| Effective Date | Not yet effective — pending Board adoption |
| Policy Owner | CTO-equivalent (currently the closest real role is the ICT Head, Mr. Oguntade Adebola Aliu — this policy's ownership should be confirmed by the Board, since data protection ownership is usually a named accountable individual, not just a department) |
| Approval Authority | Board of Governors |
| Review Cycle | Annual, or immediately on any data breach or change to the Parent Portal's data handling |
| Next Review Date | Not yet set — to be fixed upon adoption |

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

## 2. Purpose

To state what personal data SHRS collects about students, guardians,
and staff; why; who can see it; who else (if anyone) processes it on
SHRS's behalf; how long it is kept; and what rights a guardian has over
their own and their child's data — across every system that touches it
today (the Parent Portal, the AI assistant) and in future (a Student
Portal, Staff Portal, and any further AI-assisted system).

## 3. Scope

Applies to all personal data processed by SHRS through any digital
system, currently limited to the Parent Portal (student records,
attendance, academic term results, fee status, guardian accounts,
in-portal notifications) and the website's AI assistant (which does not
currently authenticate users or store conversation history server-side
— this should be re-verified against `docs/digital-assistant.md` at
each review, since assistant behaviour can change independently of this
policy).

## 4. Definitions

- **Personal data** — any information relating to an identified or
  identifiable person (a named student, a named guardian).
- **Processing** — collecting, storing, using, or disclosing personal
  data, by a human or a system.
- **Data controller** — the entity that decides why and how data is
  processed (SHRS, as an institution).
- **Data processor** — a third party processing personal data on SHRS's
  behalf under SHRS's instructions (e.g. a cloud hosting provider),
  distinct from a data controller who decides the purpose.
- **Data subject** — the person the data is about (a student or a
  guardian).
- **Guardian** — a parent or legal guardian with a Parent Portal
  account linked to one or more students.
- **Children's data** — personal data relating to a student under 18;
  treated with heightened care throughout this policy given SHRS
  enrols students from age 2.
- **Image/media consent** — a guardian's explicit, recorded permission
  for a specific use of their child's photograph or video, distinct
  from the general data-processing consent discussed in Section 7.9
  because it governs a different risk (public visibility and
  reputational/safeguarding exposure, not just data storage). See
  Section 7.10.

## 5. Policy Statement

Data is collected only for a stated, legitimate school purpose — never
speculatively "in case it's useful later." A guardian can only ever see
their own linked child(ren)'s data — this is already enforced in the
Portal's access-control logic (verify this claim still holds at each
review; do not assume it silently). Staff access to guardian/student
data is role-scoped, not all-or-nothing (admin endpoints require an
admin token distinct from a guardian's session). Data is kept only as
long as it serves a purpose — **no retention period is defined yet**
(flagged as a real gap in Section 8, Monitoring and Compliance, and
resolved in the Records Retention Policy, IT-04, not this document).
Security failures are disclosed, not hidden — see Section 7.4.

**What the Parent Portal actually stores today** *(kept factual and
specific, verified against `sql/schema.sql`, so this section can't
drift silently from what the system really does)*:
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

## 6. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| Board of Governors | Approves this policy and any material change to what data the Portal collects. |
| Data Protection Owner *(role to be confirmed — proposed: ICT Head)* | Maintains this policy, is the first point of contact for a data-subject request or a suspected breach. |
| ICT Head | Implements technical controls (already includes: scrypt password hashing, timing-safe token comparison, login lockout — see `docs/parent-portal-audit.md`); maintains the third-party processor list (Section 7.6). |
| Admin-portal staff (Registrar, class teachers with admin access) | Only enter data that is accurate and necessary; do not share admin tokens. |
| Guardians | Responsible for keeping their own login credentials confidential. |

## 7. Procedures

### 7.1 Guardian rights — access
A guardian can already see all data linked to their child(ren) via the
dashboard (`/api/portal/me`).

### 7.2 Guardian rights — correction
Currently requires contacting the school directly (Registrar) to
correct an error — there is no self-service edit form yet, which is a
reasonable Phase 1 limitation given accuracy of academic/financial
records should stay staff-controlled.

### 7.3 Guardian rights — portability and erasure
**Not yet implemented or defined.** This is a genuine gap: NDPA-style
regimes typically expect some form of these rights, and SHRS has not
yet decided how a guardian would request deletion of their account, or
what happens to a graduated student's historical records on request.
This needs a Board decision, informed by legal advice, before it can be
answered honestly to a parent who asks.

### 7.4 Breach response
- Any suspected unauthorised access, data leak, or credential
  compromise is reported to the Data Protection Owner the same day it
  is discovered.
- **This policy does not yet define a breach-notification timeline to
  affected guardians or to the NDPC** — that timeline is a legal
  requirement to confirm, not something to guess at here.
- Until a formal process exists, the default is: assume disclosure is
  required, and seek legal advice on timing rather than staying silent
  by default.

### 7.5 Data Protection Impact Assessment
- Before any new system that processes children's data is launched
  (e.g. a Student Portal, a new AI-assisted feature), a Data Protection
  Impact Assessment is conducted — a documented review of what data the
  new system would collect, why, and what risk it introduces — before
  launch, not retrospectively.
- **SHRS has not conducted one for the existing Parent Portal or AI
  assistant** — this section establishes the requirement going forward;
  retrospectively assessing the two live systems is a reasonable first
  action once this policy is adopted, not assumed already done.

### 7.6 Third-party processors
- The Parent Portal is hosted on Vercel, using a Postgres-compatible
  database (currently `@vercel/postgres`, flagged elsewhere as
  deprecated in favour of Neon's native SDK — a migration item, not a
  data-protection one). The AI assistant's requests are processed by
  Anthropic's API.
- Both are data processors acting on SHRS's instructions, not
  independent controllers of the data — **this policy names them as a
  factual disclosure of the real infrastructure in use; it does not
  certify that formal data-processing agreements exist with either
  provider**, which is itself an item for legal confirmation.

### 7.7 Cross-border data transfer
- Both Vercel's and Anthropic's infrastructure may process or store
  data outside Nigeria — **this has not been verified in specific
  technical detail (which regions, which safeguards)**, and any NDPA
  requirement around cross-border transfer of Nigerian children's data
  needs legal confirmation before this policy can state a compliance
  position on it.

### 7.8 Children's data — special considerations
- SHRS enrols students from age 2; no student can meaningfully consent
  to their own data processing, so parental/guardian consent (Section
  7.9) is the operative basis, not the child's own agreement.
- Any future feature giving a student their own direct system access
  (a Phase 2/3 product question, see
  `docs/parent-portal-phase2-3-roadmap.md`) must re-examine this
  section, since a student's own account changes the consent picture
  this policy currently assumes.

### 7.9 Consent and legal basis for processing
- **The specific legal basis SHRS relies on for processing student/
  guardian data (parental consent obtained at admission, contractual
  necessity for providing education, legitimate interest) has not been
  formally documented.** This section names the gap rather than
  asserting a basis that hasn't actually been confirmed with legal
  input — a genuinely open item, not a formality.

### 7.10 Image and media consent
- **No image/media consent process currently exists at SHRS.** This
  section names that gap and proposes a structure for it, rather than
  leaving photography and video governed only by the general data-
  processing discussion in Section 7.9, which was never written with
  publicity/publication use in mind.
- **The gap is not theoretical.** It was surfaced directly: a batch of
  campus photographs supplied for the website included three images of
  identifiable students that could not be published because no consent
  record existed to check against — see `docs/visual-asset-integration-
  plan.md` for the specific hold decisions this produced.
- **Proposed structure, pending Board confirmation:**
  1. At admission (Admissions Policy, PA-05, alongside the existing
     documentation collected at Stage 3), a guardian is asked to
     indicate consent separately for two distinct uses, since they
     carry different exposure: **(a) internal/institutional use**
     (yearbooks, ID badges, in-school displays, internal records) and
     **(b) public-facing use** (the public website, social media,
     prospectus, marketing materials, press).
  2. Consent is recorded per child, not assumed for a family or a
     class as a group, and is revocable at any time by a guardian's
     written request to the Registrar — a revocation takes effect
     going forward (it does not require retroactively removing
     material already lawfully published, which is a distinct
     question this policy does not resolve here).
  3. **Until this structure is adopted, the operative default is
     conservative, not permissive:** no photograph or video in which a
     student is individually identifiable is published to a public-
     facing SHRS channel without a specific, confirmed guardian consent
     for that use — silence or an unanswered request is treated as "no,"
     not as implied permission.
- **What does not require this consent:** a photograph where no
  individual student is reasonably identifiable (a facilities photo
  with no one in frame, a genuinely distant crowd shot with no
  individual as its subject) is not "children's data" in the sense
  this section addresses, and is governed by this policy's general
  provisions rather than Section 7.10 specifically.
- **This is a new provision, not previously stated in v2.0** — added
  in direct response to a real integration decision, not drafted
  speculatively ahead of one.

## 8. Monitoring and Compliance

Written with awareness of the Nigeria Data Protection Act 2023 and the
Nigeria Data Protection Commission. **Does not certify compliance.**
Retention periods (resolved separately in the Records Retention Policy,
IT-04), data-subject rights (Section 7.3), breach-notification
timelines (Section 7.4), third-party processor agreements (Section
7.6), cross-border transfer (Section 7.7), legal basis for processing
(Section 7.9), and the image/media consent structure (Section 7.10) are
the concrete open items that need legal input, Board confirmation, or
both before this policy can be considered complete, not just reviewed.

## 9. Records and Documentation

Data-subject access requests, correction requests, and any breach
incident are logged by the Data Protection Owner — retained per the
Records Retention Policy (IT-04).

## 10. Related Policies

Child Protection & Safeguarding Policy (SW-01, for the safety-override
exception in Section 11), Records Retention Policy (IT-04, for
retention periods this policy deliberately does not set
independently), Information Security Policy (IT-01, for the technical
controls this policy's principles depend on), AI Usage Policy (IT-05),
Admissions Policy (PA-05, the proposed point of collection for the
image/media consent structure in Section 7.10).

## 11. Exceptions

Where a safeguarding concern requires sharing a child's data with an
external statutory body (see the Child Protection & Safeguarding
Policy, SW-01, §7.5), that duty overrides the confidentiality
provisions of this policy. This is a deliberate, named exception — not
an oversight — and is mirrored as a cross-reference in that policy's
own §11. No other exceptions are defined; any future exception must be
added here explicitly, not assumed.

## 12. Appeals and Complaints

A guardian who believes their or their child's data has been
mishandled may raise it through the existing Complaint Policy (PA-01)
as the first step, escalating to the Data Protection Owner and, if
unresolved, the Board.

## 13. Review and Amendment

Annual, or immediately after any breach, or any material change to
what the Parent Portal collects or how it's used (e.g. adding a Student
Portal, adding AI-assisted features that process student data, or
changing hosting/AI infrastructure providers named in Section 7.6).

## Version control

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | Draft | Initial draft, Phase A | Drafted per SHRS governance directive; not yet reviewed or adopted |
| 2.0 | Draft | Retrofitted to the full 13-section architecture, Phase F Tier 1 retrofit — added third-party processor disclosure, cross-border transfer awareness, a dedicated children's-data section, consent/legal-basis discussion, and a Data Protection Impact Assessment requirement | Not yet reviewed or adopted; six concrete items (Section 8) still need legal input |
| 2.1 | Draft | Phase G — added an image and media consent procedure (Section 7.10), proposing separate internal/public-facing consent tracked per child, with a conservative default until adopted. Drafted directly in response to three real photographs that could not be published to the website for lack of a consent record — not speculative | Not yet reviewed or adopted; seven concrete items (Section 8) now need legal input, Board confirmation, or both |
