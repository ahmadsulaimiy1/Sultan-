# SHRS Institutional Readiness Review

*Required deliverable at the close of the Staff Identity & Role System
phase, per the Phase 2 Authorisation's "Additional Challenge." Answers
the five questions asked, in order, grounded in what was actually built
and verified in `docs/staff-identity-architecture.md` and
`docs/staff-identity-platform.md` — not aspirational.*

## Where the Digital Campus stands

The four foundational identity domains named in the Authorisation are
now real and live: **Parent Identity** (`shr_portal_session`),
**Student Identity** (`shr_student_session`), **Staff Identity**
(`shr_staff_session`, this phase), and the **Executive Dashboard**
(Founder Dashboard, aggregate-only). **Announcement Infrastructure**
sits alongside them as the first piece of institutional communication
that isn't authentication. Every one of these is backed by a real
Postgres database, not a mockup — this is the honest baseline the
answers below build from.

---

## 1. What offices can now be activated?

"Activated" here means: a real named person exists, a documented role
already grants them real permissions in `permission-matrix.js`, and
they can be onboarded via `admin/staff.js` today.

- **Registrar's Office** — the strongest case. Mrs. Anofi-Abdulkareem
  Mariam Tope is the only office-holder in the entire directory with
  *both* a named person and a documented job description (AC-02, PA-05)
  predating this phase. The REG role already carries real grants across
  more system areas (§4.1, 4.2, 4.6, 4.7, 4.11, 4.13, 4.14 of the
  Matrix) than any other role.
- **Executive Leadership (CEO)** — Zakaria Olanrewaju Anofi can be
  onboarded with the EXE role today; the Founder Dashboard already
  consumes exactly the aggregate-only scope EXE is granted.
- **ICT Office** — Mr. Oguntade Adebola Aliu (named ICT Head) can be
  onboarded with the ICT role; `system_settings` grants are already
  mapped.
- **Per-institution Principal leadership** — all four named Principals/
  Head Teacher can be onboarded with PRIN, scoped to their own
  institution, today.
- **Qur'an College Officer / Muhaffiz** — QC-OFF and MUH roles are fully
  mapped in the Permission Engine, but the *existing* Hifz admin
  endpoint (`admin/hifz-progress.js`) still checks `PORTAL_QURAN_TOKEN`,
  not a staff session — see the honest caveat in §3 below before calling
  this "activated" in practice.
- **Finance Office** — the FIN role exists and is directory-ready, but
  activating it in any real sense is still blocked on FN-03/04/05 (real
  fee data governance), exactly as `data-ownership-register.md` already
  flagged before this phase.

## 2. What modules are now unblocked?

- **Registrar's Office module** — the single biggest unlock. Everything
  it needs (a real role, real permission grants across the widest set
  of system areas, a real named person) is now in place; only the
  office-specific UI is missing.
- **Teacher Portal** — TCH/MUH/ARB roles are fully mapped against
  attendance and assessments; a real Teacher Portal can be built
  directly from those grants without further permission design.
- **Principal Dashboard** — the PRIN column is mapped across every
  relevant area; institution-scoping (the mechanism that makes "own
  institution only" actually enforceable) is exactly what the
  Permission Engine's `checkGrants()` resolves generically.
- **Delegation-based continuity** — "Registrar absent 14 days" is no
  longer a hypothetical; the mechanism exists and was verified. No
  office currently *uses* it in a real workflow yet, because no office
  UI exists yet to trigger one from.
- **A real Communications role for the Announcement system** —
  currently `admin/announcements.js` reuses `PORTAL_ADMIN_TOKEN` as an
  explicitly-flagged temporary compromise; a REG- or EXE-scoped,
  session-gated version is now buildable.

## 3. What governance gaps remain?

Named plainly, not glossed over:

- **Every existing bearer-token admin endpoint still bypasses the
  Permission Engine.** `admin/students.js`, `admin/hifz-progress.js`,
  `admin/announcements.js`, and `admin/create-student-login.js` all
  still check a flat shared token, not a staff session +
  `hasPermissionFor()`. The Permission Engine is correct and complete,
  but **most of the system doesn't call it yet** — only the new
  `staff/delegations.js` endpoint does. Treat this as the platform's
  most important open item, not a footnote: building a new Registrar's
  Office UI on top of endpoints that still bypass the access-control
  system this phase just built would be a real inconsistency, worth
  closing before or alongside that module (see §5).
- **HR governance is still entirely absent** (HR-01 through HR-09,
  besides the drafted-but-unpublished Staff Conduct Policy and Staff
  Handbook) — unchanged from before this phase, by design (§0 of the
  architecture doc).
- **GV-02 Board Charter doesn't exist** — the Board of Trustees is
  still only "4 Members," not individually named or constituted in any
  governance document.
- **No Identity & Access Management policy exists yet for this very
  platform.** Token rotation, session lifetime, delegation limits, and
  audit-log retention are all currently governed only by this
  architecture document's own engineering discipline, not by a
  Board-approved policy the way IT-03/IT-04/IT-05 govern other systems.
  A system this security-sensitive arguably needs one before it scales
  past a handful of staff.
- **The Designated Safeguarding Lead role is defined but still
  unappointed** (SW-02) — the `DSL` role exists in the reference table
  and the Matrix, with nobody assigned to it yet.
- **The Trust Signals gap from the Public Website Maturity Assessment
  remains open** — per the explicit instruction to keep it in the
  institutional improvement register until the school provides
  verifiable registration and affiliation information, it is repeated
  here rather than considered resolved by this phase, which did not
  touch it.

## 4. What policies still need to exist?

In rough priority order, matching what actually blocks the modules
named in §2:

1. **An Identity & Access Management policy** for this platform itself
   (new gap, named in §3 — nothing upstream required it before this
   phase existed to govern).
2. **GV-02 Board Charter** — names and constitutes the Board of
   Trustees; blocks any real Board-level workflow beyond the current
   read-only aggregate view.
3. **AC-03 Examination Policy** — blocks a real Examinations module
   (grading → moderation → publication pipeline), which the Registrar's
   Office will need soon after it ships.
4. **FN-03 Tuition & Fees Policy, FN-04 Refund Policy, FN-05
   Scholarship Governance Framework** — blocks real Finance write
   access; also the single highest-value *content* gap named in the
   Public Website Maturity Assessment (the admissions fee schedule).
5. **SD-05 Attendance, SD-06 Welfare, SD-07 Behaviour Policies** —
   blocks a real Student Affairs Officer role and a proper Teacher
   Portal attendance workflow beyond raw data entry.
6. **HR-04 through HR-07** (recruitment, onboarding, performance,
   exit — exact scope to be Board-defined) — still blocks any real
   personnel-file system, unchanged from before this phase.

## 5. Which module should be built next?

**Registrar's Office — confirmed, with one condition attached.**

The case for it independent of the brief's own suggestion: it is the
only office with both a real named person and a real documented job
description predating this project; its role already carries the
richest permission footprint of any role in the Matrix; and it directly
closes the gap this whole phase exists to close — right now, *nobody
but a bearer-token holder can act on the system*, which makes "Staff
Identity Layer" true in name but not yet in practice. A Registrar's
Office module, built against the Permission Engine from day one, is
what turns that from true-in-name into true-in-practice.

**The condition:** build it as the occasion to close the gap named in
§3, not alongside a gap left open. Every new Registrar's Office
endpoint should be session-authenticated and permission-checked from
the start (`readStaffSessionFromRequest` + `hasPermissionFor(sql,
staffId, 'student_records', 'E', institutionId)`, not a new bearer
token) — and, ideally, the existing `admin/students.js` migrates to the
same model in the same phase, rather than leaving two access-control
systems running side by side indefinitely. This is a scoping note for
whoever picks up that phase, not a blocker on starting it.
