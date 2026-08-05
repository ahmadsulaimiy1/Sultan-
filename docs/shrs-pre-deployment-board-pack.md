# SHRS Pre-Deployment Board Pack v1.0

Prepared for the Board of Trustees, CEO, and Management Team, ahead of
purchasing/confirming: the domain, Cloudflare infrastructure, Neon
infrastructure, and email infrastructure. This pack synthesizes the
Master Deployment Directive, the Maturity Report, and the Deployment
Readiness Checklist into one decision-ready document — it does not
introduce new claims beyond what those three already establish.

## 1. Current capability (what exists, working, today)

A real, tested-locally digital campus exists: Parent Portal, Student
Portal, Teacher Portal, Registrar's Office, a Founder/Executive
Dashboard, a Staff Identity & Permission Engine, guardian
self-registration with a full optional Institutional Identity Profile,
an Adhkār Centre, an Announcements system, and real academic-workforce
data now documented for Royal College's JSS/SSS and for Qur'an College/
Islamic Studies faculty. All of it is **Developed and Merged**; the
Parent Portal specifically was verified this engagement against a real
local database, not just mocked responses. This is a genuine asset —
most of the software work a school digital campus needs is already
written.

## 2. Current gaps (stated without softening)

- **Nothing is deployed.** No Cloudflare Pages project, no Neon
  production database, no confirmed domain, no CI/CD pipeline exist
  anywhere reachable — see the Master Deployment Directive's direct,
  evidenced audit.
- **No real institutional data populates the system**, except the
  workforce names now documented in the Master Academic Structure
  Register — no real students, no real staff logins, no real class
  roster beyond test examples.
- **Executive Identity is a named migration gap**, not yet closed —
  the Founder Dashboard runs on a shared bearer token today, not an
  individually-accountable login (see the Identity Migration Register,
  item #1 — the fix is scoped and small, once a real EXE staff account
  exists).
- **No LMS, no MFA, no CSRF protection, no backup plan, no monitoring,
  no disaster-recovery plan, no named incident-response owner.** All
  confirmed Absent or Initial in the Maturity Report.
- **Two of the four institutions (Nursery and Primary, and parts of the
  School of Islamic and Arabic Studies) have no documented faculty or
  subject list yet** — the next data-gathering step, not a system
  defect.

## 3. Deployment requirements (what must happen, in order)

Full detail in the Account Creation Playbook; summarized for Board
decision purposes:

1. Confirm domain ownership/registration status.
2. Create a Cloudflare account and a Pages project connected to this
   repository's `main` branch (staging environment variables only).
3. Create a Neon account and **two separate** database projects
   (staging, production — never shared).
4. Run the one-time setup call against staging; **confirm every
   existing module actually works at the staging URL** before
   proceeding — this is the step that would let the Maturity Report's
   scores genuinely rise.
5. Create a Resend account, verify a sending domain, confirm one real
   email delivers.
6. Repeat steps 3 and 5's account-creation actions for production,
   with separate credentials from staging.
7. Only then: begin real institutional data entry (Institutional Data
   Readiness Framework) and the Executive Identity migration (Identity
   Migration Register).

None of steps 2–5 can be performed by an AI coding session — they are
account-creation and payment actions requiring a human with
institutional authority and, in most cases, a payment method.

## 4. Cost implications

Given directionally, not as quoted current pricing — **verify exact,
current pricing directly with each vendor before budgeting**, since
this document cannot see live pricing pages and pricing changes over
time:

| Item | Typical range for a project this size | Notes |
|---|---|---|
| Domain registration/renewal | Low, annual (roughly the cost of one to a few dozen textbooks per year, order-of-magnitude, depending on TLD) | `.com` vs `.ng` pricing differs; confirm with a registrar directly. |
| Cloudflare Pages | Often free at this traffic scale; paid tiers exist for higher request volume/build minutes | Cloudflare's free tier is frequently sufficient for a school-sized site; Pages Functions execution has its own usage-based pricing beyond a free allowance. |
| Neon Postgres | Free tier exists for small databases; paid tiers add larger storage, more compute, and point-in-time recovery (the fastest real backup-plan win, per the Deployment Readiness Checklist) | Running staging and production means **two** billing lines, not one — factor this into budget, not just "one Neon subscription." |
| Resend | Free tier covers a modest volume of transactional emails (verification links, resets); paid tiers scale with volume | A school's real send volume (registrations, resets, notifications) should be estimated before assuming the free tier covers it indefinitely. |
| Institutional mailboxes (Google Workspace / Microsoft 365 / similar) | Per-mailbox, per-month, recurring | Separate from Resend entirely — a real mailbox-hosting subscription, priced per named person's inbox (`admissions@`, `registrar@`, etc.), not per-email-sent. |

**The Board's real cost decision is not "can we afford this" in the
abstract — every vendor above has a workable free or low-cost tier for
a school of unconfirmed but likely modest initial scale. The real
decision is which paid tiers become necessary once real usage begins,
and that should be revisited after Staging Verified status is reached,
not decided speculatively now.**

## 5. Operational implications

- **Someone must hold each of the five bearer-token secrets** named in
  the Identity Migration Register, and the Board should confirm no
  single person holds all five (a real segregation-of-duties decision,
  not a technical one).
- **Someone must own incident response** — "what happens when
  something breaks in production" has no named owner today.
- **Someone must own real data entry** — the Institutional Data
  Readiness Framework's Mandatory fields don't populate themselves;
  this is administrative work (likely the Registrar's Office and ICT
  Office), not further software development.
- **The Board should formally decide** on the proposed departmental
  framework (Master Academic Structure Register §5) and the proposed
  teaching-role split (`docs/teacher-operating-model.md`) before either
  is treated as adopted — both remain proposals pending exactly this
  kind of Board review.

## 6. What this pack asks the Board to decide

1. Approve proceeding to Account Creation Playbook Step 1 (Cloudflare)
   and Step 2 (Neon staging) — the lowest-cost, lowest-risk next action,
   reversible, and the only way to move any Maturity Report score above
   its current ceiling.
2. Name who holds each of the five administrative bearer-token secrets.
3. Name an incident-response owner.
4. Adopt, or send back for revision, the proposed departmental
   framework and teaching-role structure.
5. Confirm domain strategy (renew/confirm existing registration, or
   register fresh) before Playbook Step 1's domain-connection step.
