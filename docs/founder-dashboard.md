# Founder Dashboard (Pilot)

Phase 1 of the build order agreed in `docs/digital-institution-blueprint.md`:
a read-only, institution-wide aggregate view, built first because it
needs no new authentication surface, no new schema, and no institutional
policy decision — and because building it honestly forces an answer to
"which requested KPIs can this system actually report today?"

It is **not a login**. It's a single bearer-token-gated page, the same
security model as the existing `admin/*` endpoints, just with a real UI
instead of curl-only. The token is kept in the browser tab's
`sessionStorage` only — closing the tab clears it; there is no persistent
session, no password, no MFA. That's an appropriate trade-off for a
read-only view a small number of trusted people open occasionally, not a
day-to-day login system — see `digital-institution-blueprint.md`'s Phase
2 (Staff Identity & Role System) for where a real login belongs.

## Setup

1. **Add one new environment variable**: `PORTAL_FOUNDER_TOKEN` — any
   long random string, held only by the CEO/Board. Deliberately separate
   from `PORTAL_ADMIN_TOKEN` (day-to-day data entry) and
   `PORTAL_QURAN_TOKEN` (Hifz data entry) — this token sees
   institution-wide aggregates, a narrower and more sensitive trust
   boundary than either.
2. **Redeploy.**
3. **Visit `/portal/founder/`** and enter the token.

No database migration is needed — every figure on this dashboard is a
live aggregate query over tables that already exist (`students`,
`classes`, `student_classes`, `attendance_summary`, `fee_status`,
`hifz_progress`, `hifz_enrolment`, `ijazah_register`, `guardians`).

## What it reports, and how honestly

Every count **excludes sample/demo records** (admission numbers starting
`DEMO-`), so this never quietly reports the demo guardian's two sample
children as real institutional numbers.

- **Students** — active count, full status breakdown (active/graduated/
  withdrawn/suspended), a per-institution bar chart, and how many
  students are currently dual/multi-enrolled (a number that literally
  did not exist as a queryable fact before this engagement's prior
  phase).
- **Attendance** — a school-wide average, computed from each student's
  *most recently recorded term* — explicitly labelled as not a live
  daily figure, because it isn't one.
- **Qur'an College — Hifz & Ijazah** — enrolled count, a bar chart by
  stage of the school's own published 5-stage Hifz Journey, total Juz'
  verified school-wide, and how many Ijazahs are currently in force
  (excluding revoked ones).
- **Fees** — total due/paid/outstanding, summed from each student's most
  recent fee record. Labelled explicitly as a **snapshot, not a
  ledger** — there are no receipts, instalments, or transaction history
  behind this number.
- **Academic results** — deliberately reports only a raw count of result
  records on file, not a performance metric. With real data this sparse,
  a computed "average score" would be more misleading than informative.

## What it deliberately does NOT report, and why

| Requested KPI | Why it's not here |
|---|---|
| Revenue | No real fee ledger exists — `fees.totalPaid` is a due/paid snapshot, not recognised revenue. Blocked on FN-03 Tuition & Fees Policy (listed **Missing** in `docs/policies/policy-code-index.md`). |
| Staff / teacher headcount | No staff identity system exists yet — this is exactly Phase 2 of the blueprint. |
| Admissions pipeline | Only post-enrolment records exist today. There's no applications/offers/waiting-list workflow to aggregate. |
| Boarding occupancy | Boarding classes can be recorded via `institution`/`className`, but there's no room/occupancy data model. |

This list is intentionally visible on the dashboard itself (`Not Yet
Available` panel), not just in this doc — a Founder opening this page
should see the honest edge of the current system, not a dashboard that
silently omits what it can't yet measure.

## Testing note

Same sandbox limitation as the rest of the portal docs: no egress to
Neon from this environment, so this was verified locally with `wrangler
pages dev` + Playwright against a mocked API response, not a real
database. Once deployed, confirm the numbers against what you'd expect
from the real data on file before treating this as authoritative for a
Board meeting.
