# SHRS Portal Operational Audit — 2026-07-30

Requested directly by the Founder & CEO as an "Immediate Priority Override": before any mobile app work, prove — portal by portal — what actually registers, logs in, loads a dashboard, and works, versus what is placeholder, broken, or unfinished. This document is that audit, done by reading the real, deployed code (not by assumption) against the 12 named portals.

**Read this section first — it changes what "test accounts" can mean right now.**

## The infrastructure fact this audit depends on

This coding session (the one that produced this document) has **no credentials to your live Cloudflare Pages or Neon accounts** — confirmed just now by running `wrangler whoami`, which returned "not authenticated." There is no `DATABASE_URL`, no Cloudflare API token, no Neon connection string anywhere in this sandbox. That means **this session cannot itself create a real login, click into your Founder Dashboard, or open a real Registrar session** — there is nothing here to click into.

That is a real constraint, not a formality — but it is also not the same as "nothing is live." Per `docs/shrs-infrastructure-activation-register.md` and `docs/shrs-staging-verification-report.md`, both written from real, verified work against your actual accounts on 2026-07-27/28:

- **Production is real and live**: `https://shroyalschools.com`, SSL active, a real Neon production database connected, `/api/portal/setup` already run — **correctly empty of sample data**, zero real institutional records yet.
- **Staging/Preview is real and live**: `https://shroyalschools-web.pages.dev` (auto-deploys from this branch), a **separate** Neon database, seeded with demo accounts, and **already proven end-to-end**: a real Guardian, a real Student, and a real Teacher account were logged into live, through the real deployed backend, on 2026-07-28.

So the honest situation is: **the platform is not "under construction" at the infrastructure level — it is deployed, reachable, and partially proven live.** What's missing is (a) two roles never got a seeded demo login (Registrar, Finance), (b) no real Founder staff account exists yet (only the legacy token path was proven), and (c) this session has no way to act on your Cloudflare/Neon accounts directly. Only you (or whoever holds those account logins — the register lists the owner as `Ahmadbinibrohim@gmail.com`) can click the next buttons. Below is exactly what to click.

## How to enter the Founder Dashboard right now

The Founder Dashboard doesn't require a new account — it has a working **token gate** today, already verified live in staging:

1. Open `https://shroyalschools-web.pages.dev/portal/founder/` (staging — has demo data) or `https://shroyalschools.com/portal/founder/` (production — real, currently empty).
2. Enter the value of `PORTAL_FOUNDER_TOKEN` from that environment's Cloudflare Pages → Settings → Environment Variables. You (or whoever set up these environments on 2026-07-28) already has this value; it is not something this session can read or generate for you.
3. That's it — the dashboard loads. Staging will show the seeded demo institution's numbers; production will show real (currently zero) numbers.

This is a deliberate, separate "CEO/Board" credential by design (`functions/api/portal/founder/dashboard.js`), not a placeholder — see the code-level note below on why it's not yet a personal login.

## How to enter the Registrar dashboard right now

The Registrar's Office (`/portal/staff/registrar/`) is fully built and code-complete, but **no demo Registrar account was ever seeded** in staging, and no real one exists in production. Two ways to get in today:

**Fastest — via the Institutional Administration Centre (already built):**
1. Open `/portal/admin/centre/` on staging or production.
2. Enter the value of `PORTAL_SYSADMIN_TOKEN` for that environment.
3. Use the "New Staff + Login" form to create a real staff record with a `REG` (Registrar) role grant and an appointment to the Registrar's Office. This issues real Staff ID + password credentials immediately.
4. Sign in at `/portal/staff/login/` with those credentials — you're in the real Registrar's Office, with real lookup/enrol/attendance/certificate actions against the real database.

The same two steps also work for **Founder** if you want a real, individually-accountable session-based login instead of the shared token: grant the new staff record the `EXE` role and an Executive appointment, then `/portal/staff/login/` opens the Founder Dashboard through the session path (`functions/api/portal/founder/dashboard.js` already tries staff-session + `EXE` role first, and only falls back to the token if that check fails).

Nothing above needs new code — every endpoint involved was written and, for three of the four core roles, already proven against a real database on 2026-07-28.

---

## Portal-by-portal audit

Legend: **Y** = yes, real and working. **N** = no, by design (not a gap). **Partial** = real structure, honest placeholder content, or a subset of the checklist works.

### 1. Parent / Guardian Portal
`/portal/register/` → `/portal/login/` → `/portal/dashboard/`

| Capability | Status | Detail |
|---|---|---|
| Can Register | Y | Self-service, email verification (code + link), password strength meter |
| Can Login | Y | Password + email OTP (MFA), trusted-device 7-day bypass |
| Can Access Dashboard | Y | Gated on verified email |
| Is Dashboard Functional | Y | Real, not a shell |

Feature detail: **Fees** — real (invoices, receipts, payment status, QR-verifiable receipts). **Attendance/Results** — real, per enrolled child, per term. **Announcements** — real, site-wide feed + RSVP. **Digital ID** — real, QR-verifiable ID card. **Certificates** — real request flow (Registrar issues, Principal approves). **Messages** — **placeholder**: the "Messages" surface is the AI assistant chat widget, not a real two-way inbox with staff — flagging this explicitly since the audit checklist named it and it would mislead a parent expecting to message a teacher directly.

### 2. Student Portal
`/portal/student/login/` → `/portal/student/dashboard/`

| Capability | Status | Detail |
|---|---|---|
| Can Register | N (by design) | Students are issued logins by Registrar/Admin, never self-register — matches how a real school issues student IDs |
| Can Login | Y | Admission No. + password, MFA available once ICT sets a student email |
| Can Access Dashboard | Y | |
| Is Dashboard Functional | Y | Dual-enrolment chips, Hifz stage/Juz' progress, attendance, results, Digital ID |

### 3. Teacher Portal
`/portal/staff/teacher/` (via `/portal/staff/login/`)

| Capability | Status | Detail |
|---|---|---|
| Can Register | N (by design) | Admin-provisioned, like all staff |
| Can Login | Y | Verified live 2026-07-28 (demo teacher, `SHR-STF-0901`) |
| Can Access Dashboard | Y | |
| Is Dashboard Functional | Y | Roster, class/subject assignment, attendance entry, assessment score entry |

### 4. Staff Portal (generic identity)
`/portal/staff/login/` → `/portal/staff/offices/` (My Identity, directory, org chart)

| Capability | Status | Detail |
|---|---|---|
| Can Register | N (by design) | |
| Can Login | Y | Shared entry point for every staff/executive role |
| Can Access Dashboard | Y | Identity profile, office directory, interactive org chart, office/role switcher |
| Is Dashboard Functional | Y | Real appointment data, real reporting-line tree; not simulated |

### 5. Founder & CEO
`/portal/founder/`

| Capability | Status | Detail |
|---|---|---|
| Can Register | N (by design) | |
| Can Login | **Partial** | Code supports both a real staff-session `EXE`-role login and a legacy shared token; only the token path has been proven live so far — no real Founder staff account has been created in any environment yet (see "How to enter" above to fix this in minutes) |
| Can Access Dashboard | Y | Token path verified live 2026-07-28 |
| Is Dashboard Functional | Y | Real aggregate stats across all 4 schools, finance funnel/gauge/revenue charts, Hifz completion, explicitly labeled "Not Yet Available" section for anything the system can't honestly report — never fake numbers |

### 6. Registrar's Office
`/portal/staff/registrar/`

| Capability | Status | Detail |
|---|---|---|
| Can Register | N (by design) | |
| Can Login | **Partial** | Code complete, locally verified in an earlier phase; **not yet exercised against a live database** — no demo account was ever seeded (confirmed in `shrs-staging-verification-report.md`) |
| Can Access Dashboard | Y (code) | Not yet live-proven |
| Is Dashboard Functional | Y (code) | Student lookup, enrol-from-admission, attendance/assessment correction, lifecycle events (promote/transfer/withdraw/graduate/reinstate), certificate issue/revoke, pending-certificate-approval queue |

### 7. Finance Office
`/portal/staff/finance/`

| Capability | Status | Detail |
|---|---|---|
| Can Register | N (by design) | |
| Can Login | **Partial** | Code complete, not yet live-proven (built after the 2026-07-28 verification pass) |
| Can Access Dashboard | Y (code) | |
| Is Dashboard Functional | Y (code) | Invoices, receipts, debtors, payment plans, scholarships, fee-structure management |

### 8–11. Principal / Head Teacher / Ra'ees / Mudeer (school leadership offices)
`/portal/office/{head-teacher, principal-royal-college, raees, mudeer}/` (via staff login + office appointment)

| Capability | Status | Detail |
|---|---|---|
| Can Register | N (by design) | |
| Can Login | Y | Same staff login path as every other role |
| Can Access Dashboard | Y | Generic Office Portal loads for any of the four |
| Is Dashboard Functional | **Partial — by design, not a bug** | Real appointment record, real committee/reporting data where applicable, real KPI-tile *shells* (deliberately show "No data available," never a fake number). **Strategic Priorities and Annual Objectives are explicitly labeled TEMPLATE content**, not yet adopted institutional fact — that label is a feature, not an unfinished page: it exists specifically so template text can never be mistaken for a real decision. What's genuinely missing versus Registrar/Finance/Teacher: **no deep, role-specific operational workflow yet** (e.g. no discipline log, no gradebook oversight, no timetable authority tool) — those four offices currently work at the governance/reporting layer, not the daily-operations layer. Certificate **approval** (Principal-only action) does work, live inside the Registrar's Office UI.

### 12. Board of Trustees
`/portal/office/board-of-trustees/`

| Capability | Status | Detail |
|---|---|---|
| Can Register | N (by design) | |
| Can Login | Y | Staff login + Board appointment |
| Can Access Dashboard | Y | |
| Is Dashboard Functional | **Partial — by design** | Real committee structure (5 real committees), real seats — most explicitly marked **"Pending Appointment"** rather than fabricated names, per your own Level 3 directive. Resolutions register exists and is real, currently empty (no resolutions have been passed yet — that's accurate, not a bug). **Not yet built**: a Board Papers Centre (agenda packs, minutes, voting) — that's task #426 on the Institutional Excellence 2030 backlog, explicitly not started, not a hidden gap.

---

## Straight answer to the checklist's four questions, summarized

| Portal | Register | Login | Dashboard | Functional |
|---|---|---|---|---|
| Parent/Guardian | Y | Y | Y | Y (Messages = AI assistant only, not staff inbox) |
| Student | N (by design) | Y | Y | Y |
| Teacher | N (by design) | Y — live-proven | Y | Y |
| Staff (generic) | N (by design) | Y | Y | Y |
| Founder & CEO | N (by design) | Partial (token proven; no personal EXE account yet) | Y | Y |
| Registrar | N (by design) | Partial (code done, not live-proven, no seeded account) | Y (code) | Y (code) |
| Finance | N (by design) | Partial (code done, not live-proven) | Y (code) | Y (code) |
| Principal | N (by design) | Y | Y | Partial (governance layer only, no deep ops tool) |
| Head Teacher | N (by design) | Y | Y | Partial (same as above) |
| Ra'ees | N (by design) | Y | Y | Partial (same as above) |
| Mudeer | N (by design) | Y | Y | Partial (same as above) |
| Board | N (by design) | Y | Y | Partial (Papers Centre not built) |

**Bottom line:** nothing found in this pass is *broken*. The real gaps are: (1) Registrar and Finance logins are code-complete but not yet proven against a live database — five minutes in the Administration Centre fixes that; (2) the Founder role has no personal account yet, only the legacy token; (3) the four school-leadership offices and the Board operate at the governance/reporting layer, honestly, without deep day-to-day operational tools yet; (4) "Messages" in the Parent Portal is AI-assistant chat, not a staff inbox — worth relabeling if it's misleading parents.
