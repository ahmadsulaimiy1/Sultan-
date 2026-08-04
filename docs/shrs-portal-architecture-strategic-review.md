# SHRS Portal Architecture — Strategic Review

A CXO-level evaluation of the portal architecture from first principles, requested directly: is the current design the right one for an institution that intends to become one of the finest digital campuses in Africa and, eventually, the world — benchmarked against how Oxford, Cambridge, Harvard, Yale, and KAUST actually structure this problem, not against generic school-ERP convention.

This is an architecture and navigation review. It does not re-derive the data-model/rendering mechanics already documented in `docs/institutional-portal-architecture.md` (the office-portal engine), `docs/shrs-portal-access-matrix-2026-07-30.md` (the current URL/role/status table), or `docs/staff-identity-architecture.md` (permissions). It reads alongside them and cites them rather than repeating them.

## 1. What SHRS actually has today (the baseline this review judges)

Before recommending anything, the honest starting point: SHRS is **not** on a single monolithic portal, and it is **not** on 33 disconnected sites either. What exists is a three-way split by stakeholder identity, unified by one visual system and one discovery page:

- **Three independent session types** — guardian (`shr_portal_session`), student (`shr_student_session`), staff (`shr_staff_session`) — separately signed cookies, separate login flows, by deliberate design (`functions/_lib/session.js`), so a parent who is also a teacher can hold both sessions in one browser without collision.
- **One staff realm, many offices** — every staff member (Registrar, Finance, Principal, Head Teacher, Ra'ees, Mudeer, Board, Founder, teacher, 20+ other offices) logs in at a single `/portal/staff/login/`; which of the 33 office portals they see is a database grant (`office_appointments`), switchable at runtime via `myOffices` (`js/portal-office-switcher.js`) — not 33 separate accounts or logins.
- **One discovery surface** — `/portal/select/` (the "Institutional Access Gateway"), a card grid pointing every stakeholder to their correct entry point.
- **One shared design system** — `css/portal.css` (Royal/Light/Dark themes), with role-specific accent colour scoped only to the 3D identity-card component, not a full re-skin per role.
- **A public tier that is fully separate and unauthenticated** — the marketing site (`pages/`) and the four verify-* pages (certificate, graduation document, identity, receipt) that exist specifically so a third party (an employer, another school, a government office) can check a document's authenticity without any account at all.
- **No applicant-specific portal** — a guardian account is created first (`/portal/register/`), and admissions application is Stage 3 of a journey inside that same guardian portal.
- **No alumni self-service account type** — alumni relations is run as a staff-side office (`portal/office/alumni/`), not an alumni login.

That is the system under evaluation.

## 2. How the benchmarked institutions actually do this

It's worth naming plainly what "the Oxford/Cambridge/Harvard/Yale/KAUST model" actually is, because it is commonly assumed to be a single elegant unified portal and it is not. Without claiming inside knowledge of any specific institution's current internal systems, the well-known, publicly visible pattern at large research universities is consistent and is the opposite of "one login for everyone":

- **Students, staff, and alumni are on different systems entirely**, often with different branding, different login providers, and different information architectures — a student self-service/records system, a separate staff/HR/finance system, and a separate (often outsourced, engagement-focused) alumni platform.
- **One identity layer federates them**, not one application. Users authenticate once against a central identity provider and are then routed to whichever downstream system their role entitles them to — the unifying element is *identity and branding*, not *a single app*.
- **Public-facing trust surfaces are separate from everything else** — degree/enrolment verification for employers, for instance, is its own narrow, unauthenticated tool, never bundled into the student or staff system.
- **Prestige is carried by restraint and consistency of visual language**, not by forcing every audience through one interface. A prospective student, a sitting board member, and a retired alumnus have almost nothing in common in what they need to do, and elite institutions do not pretend otherwise.

Judged against that real-world pattern — not the imagined one — **SHRS's current three-session, one-gateway, one-design-system architecture is already structurally the right shape.** It is the same "federated by identity and brand, segmented by stakeholder" model, at a scale appropriate to SHRS today. This review's job from here is to say precisely where it currently falls short of that model's discipline, not to declare it wrong and start over.

## 3. Recommended architecture: Hybrid — Federated Stakeholder Portals under One Gateway and One Design System

This is not a new architecture. It is the current one, kept, with five specific corrections below. Restated as the standing design principle for the next phase of work:

> **One public brand. One discovery gateway. Segmented sessions per stakeholder type. One shared visual language carrying institutional identity across every segment. Independent, unauthenticated verification for the outside world.**

### Why this beats the alternatives

- **A single unified portal with one login and role-based dashboards** (option A in the brief) fails at scale and fails on prestige. It forces a parent, a board member, and a Qur'an-recitation teacher into the same information architecture, the same navigation depth, the same mental model — which is precisely the "generic training portal" feeling this project has already had to correct once, on the certificate. It also creates a single point of failure and a single, enormous permission matrix that becomes unauditable as the institution grows.
- **Fully independent, disconnected portals per stakeholder** (option B) is what SHRS would have if the gateway page and shared design system didn't exist — each surface would need its own branding, its own visual QA, its own "is this really SHRS" trust signal. That is not what elite institutions do either; it reads as outsourced, not sovereign.
- **A gateway with role navigation** (option C) is closest to correct but, taken literally, undersells what's already built — SHRS doesn't route by role at the gateway alone; it routes by *stakeholder identity* (which session cookie you can hold) and *then* by role within the staff realm (which office you're appointed to). That second layer is important and already exists (`myOffices`); it's why "hybrid" is the honest label, not "gateway."

### The five corrections this review actually recommends

1. **Give the discovery gateway (`/portal/select/`) the weight of a front door, not a sitemap.** Today it is a card grid. At the institutions this is benchmarked against, the equivalent page is deliberately minimal — usually closer to "who are you" (four or five large choices: Parent/Guardian, Student, Staff, Alumni, Verify a Document) than a dense list of every office. The 33-office list belongs one click deeper, inside the staff realm, not on the first screen every visitor sees.
2. **Build the alumni stakeholder as a real segment, not a staff-run office about alumni.** This is the sharpest gap. Every benchmarked institution treats alumni as a first-class, self-service population (their own login, their own limited-scope dashboard: verified credential, giving, events, directory opt-in) — not a CRM the institution's own staff operates on their behalf. `portal/office/alumni/` is legitimate as the internal-relations tool; it is not a substitute for an alumni account type. This is real, scoped future work, not a cosmetic fix — flagging it here rather than either fabricating it or quietly dropping it.
3. **Name the applicant stage honestly in the architecture, even though the current flow (guardian account first, application as Stage 3) is defensible.** It is a reasonable, revenue-of-trust-preserving design — an applicant becomes a known, verified guardian before submitting anything — but it should be described that way deliberately (`docs/shrs-portal-access-matrix-2026-07-30.md` already does this correctly; the gateway page currently doesn't make this legible to a first-time visitor, who sees no "Apply" affordance distinct from "Parent Portal" until they're already inside).
4. **Extend visual role-identity beyond the ID card.** The 10-theme role system (`css/portal.css`, task #488) currently only colours the identity card. A Founder session, a Registrar session, and a Guardian session should each carry a restrained but consistent accent throughout their own dashboard chrome — not a redesign, a systematic application of tokens that already exist.
5. **Stop growing the office-portal count as the default answer to new organisational structure.** 33 nearly-identical generic office portals (11 modules each, per `docs/institutional-portal-architecture.md`) is already near the edge of what "one data-driven template" can carry gracefully before it becomes 40, then 50, indistinguishable screens that no single person can hold a mental map of. The correction is not fewer offices — the real institution has the offices it has — but a navigational layer *above* them (a small number of groupings: Governance, Academic Leadership, Operations, Institutional Services — which already exist as categories in `docs/institutional-portal-architecture.md` but aren't yet a navigation structure a staff member actually sees).

## 4. Navigation hierarchy

```
Public Website (pages/, no login)
├── About / Academics / Admissions / Boarding / Facilities / Governance / Faculty / Gallery / ...
├── Verify a Document (no login — /verify-certificate/, /verify-graduation-document/,
│                       /verify-identity/, /verify-receipt/)
└── "Login to Portal" (header) ─────────┐
                                          ▼
                    Institutional Access Gateway — /portal/select/
                    "Who are you?"
        ┌───────────┬───────────┬───────────┬───────────────┬─────────────┐
        ▼           ▼           ▼           ▼               ▼             ▼
    Parent/      Student      Staff       Alumni¹        Applicant²    Founder
    Guardian     Portal       Portal      Portal          (pre-account   (staff EXE
    Portal       /portal/     /portal/    (recommended,   entry point,   role, or
    /portal/     student/     staff/      not yet built)  recommended)  token
    dashboard/   dashboard/   login/                                    fallback)
        │                          │
        │                          ▼
        │                 Office Switcher (myOffices)
        │                          │
        │        ┌─────────────────┼─────────────────────┐
        │        ▼                 ▼                      ▼
        │    Governance        Academic Leadership    Operations /
        │    (Board, Mgmt      (Principal, Head        Institutional
        │    Council,          Teacher, Ra'ees,         Services
        │    Committees)       Mudeer, Registrar,       (Finance, HR,
        │                      Examinations,            Library, Alumni
        │                      Admissions)              Relations, ...)
        │
        └── Apply (Stage 3 of guardian journey, real today)
```

Footnotes: ¹ recommended addition, §3.2. ² recommended framing of the existing guardian-first flow, §3.3 — not a new system, a clearer front door to the one that exists.

## 5. What appears on the public website

Unchanged from current practice, and correct as-is: the marketing site carries institutional story, academics, admissions information, governance transparency, and the four public verification tools. Nothing behind a login belongs here. The only addition this review recommends is a slightly more prominent, singular "Verify a Document" affordance in the main navigation (today it is discoverable but not a first-class nav item) — a public verification tool is a genuine trust signal for a "government/security-document feel" credential system, and elite institutions surface it, not bury it.

## 6. The "Login to Portal" experience

Recommended flow, correcting §3.1 above:

1. Header CTA reads **"Portal Access"** (not "Login to Portal," which presumes the visitor already has an account — an applicant or a first-time alumnus does not).
2. Lands on `/portal/select/`, restructured to five large, unambiguous choices — **Parent/Guardian · Student · Staff · Alumni · Verify a Document** — each with one line of description, not a dense card wall.
3. Each choice routes to its own login, in its own segment, exactly as today (guardian/student/staff separation preserved — it is correct and should not be merged).
4. A visitor with no account yet (a prospective parent) sees "Create a Parent Account" as a clearly secondary action under the Parent/Guardian choice, not a competing top-level card.

## 7. Role permissions

No change recommended to the underlying model — `docs/staff-identity-architecture.md`'s Permission Engine (data-driven, from the Role & Permission Matrix) is the correct pattern and should remain the single source of truth. This review's only addition is architectural, not mechanical: the permission model should be understood as answering two questions in sequence — *which stakeholder segment can this person enter* (session type), then *which offices/actions within that segment* (grants) — which is already exactly how it works; naming it this way here so future portal work is built against a named model rather than re-derived each time.

## 8. How users navigate between sections

Within a session, navigation stays inside that stakeholder's segment — a guardian never sees staff navigation chrome, a teacher's office switcher never offers to become a different stakeholder type. Moving between segments (a parent who is also a teacher) means an explicit, deliberate re-entry through the gateway with the other session's credentials — never a silent in-app switch. This is correct and matches how the benchmarked institutions keep each system's trust boundary legible: a person acting as staff and a person acting as parent are, deliberately, not the same "logged-in state," even when they are the same human being.

## 9. Where the previous assumption should be challenged

The one assumption worth challenging directly: that "more portals/offices/modules" is the same thing as "more prestigious." It isn't. Sections 2 and 3 above are the concrete version of that challenge — the fix for feeling like "a conventional school ERP" is not another dashboard, it's fewer, better-organised doors and a gateway that treats a first-time visitor's five seconds of orientation as seriously as everything built behind it. The certificate rebuild earlier in this project reached the identical conclusion for a single document (restraint over decoration); this review reaches it for the portal as a whole.

## 10. Recommendation for the next 20 years

Keep the hybrid federated-stakeholder architecture. Do not consolidate to one unified login, and do not fragment further into disconnected per-role sites. The five corrections in §3 are the actual scope of work — a real alumni segment, a genuinely minimal gateway, honest applicant framing, systematic (not ID-card-only) role identity, and a navigational grouping layer above the 33 offices — not a rebuild. Applying the "would this still be the architecture I'd recommend if SHRS were already Oxford" test: yes, with those five corrections; the current foundation is sound.

## Status

This is a strategic recommendation document, not an implementation. None of the five corrections in §3 have been built yet — this document exists so they can be discussed, prioritised, and (if approved) assigned as scoped, individually-trackable work rather than folded silently into unrelated changes.
