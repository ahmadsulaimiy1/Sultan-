# Executive Reporting System

**Institutional Excellence 2030, phase after the Organisational Chart
Engine.** A real, period-bounded report generator — Monthly / Quarterly
/ Annual — built entirely from data this portal already collects for
other reasons. It is not a new document-authoring tool and it does not
introduce a second, parallel set of numbers: every figure a report
shows is the same query (or the institution-scoped variant of it) that
already powers the Operations Centre, the Founder Dashboard, or the
office's own dedicated tools.

## What this is

`GET /api/portal/staff/reports?office=<slug>&period=monthly|quarterly|annual&anchor=YYYY-MM-DD`
(`functions/api/portal/staff/reports.js`) resolves the requested period
into a concrete `[start, end)` date range and aggregates that office's
real transactional or operational data over it. The frontend renderer
(`renderReports()` in `js/portal-office.js`) is wired into the **Reports**
tab that already existed on every office-portal page (previously showing
a static "not yet built" placeholder) — a period-type selector
(Monthly/Quarterly/Annual) plus Previous/Next navigation re-fetches and
re-renders in place.

## Which offices get a real report

| Office(s) | Report content | Source |
|---|---|---|
| Finance | Invoices issued (count + amount), payments received (count + amount) in the period; invoices currently unpaid/partial as of report generation | `invoices.created_at`, `receipts.paid_at` |
| Registrar | Certificates issued in the period; lifecycle events (enrolment/promotion/transfer/withdrawal/graduation/reinstatement) in the period | `certificates.issued_at`, `student_lifecycle_events.effective_date` |
| Admissions | Applications received in the period; decisions recorded (offered/admitted/declined) in the period | `admissions_applications.submitted_at`/`updated_at` |
| Head Teacher, Principal (Royal College), Ra'ees, Mudeer | As-of-now snapshot (students/staff/attendance/Hifz, same shape as the existing Operations Centre) + real in-period activity (lifecycle events and admissions flow for that specific institution) | Same institution-scoped queries as `functions/api/portal/staff/office/[slug].js`'s Operations Centre |
| Executive (Founder) | Institution-wide roll-up of Finance + Registrar + Admissions, plus current active student/staff totals | Same computations as above, unfiltered by institution |

Every other office (Board of Trustees, Management Council, the five
Board committees, Academic Affairs, Examinations, Digital Services/
Learning/Identity, Knowledge Base, HR, Alumni, Student Affairs,
Communications, Foundation, Library, Certificates) has neither a
transactional table nor an Operations Centre entry, so its Reports tab
returns `available: false` with the honest reason — not an empty
report, not an invented one.

## Design decisions

- **Point-in-time snapshots, not stored historical reports.** There is
  no `reports` table and no "report ID" — a request always computes
  live from the current tables. This is simpler and, more importantly,
  never risks a stored report silently disagreeing with the live data
  it was supposed to summarise.
- **Optional institution filter via `(${param}::text IS NULL OR col = ${param})`**,
  the same idiom already used in `announcements/list.js` and
  `marketplace/list.js` — avoids composing tagged-template SQL
  fragments, which Neon's serverless driver doesn't support.
- **Session-gated like the rest of the office directory** (any
  authenticated staff member, not scoped to "does this person belong to
  this office") — matches the existing `office/[slug].js` endpoint's own
  access model exactly; this file introduces no new authorization
  policy.
- **The Executive/Founder report needed no new UI.** `/portal/office/executive/`
  already renders through the same generic office-portal template as
  every other office, Reports tab included — the roll-up is reachable
  today without a bespoke addition to the Founder Command Centre's own
  page.

## What's explicitly not built

- **Board Papers Centre, Policy Management Centre, Accreditation
  Readiness Portal, the four new offices, and a Command Centre 2.0** —
  separate Institutional Excellence 2030 phases, untouched here.
- **PDF/print export of a generated report** — the report renders as an
  on-screen panel; no document-generation step exists (consistent with
  the certificates/receipts precedent: "issuing" a real record has
  never meant generating a PDF anywhere in this codebase).
- **Historical trend comparison across periods** (e.g. "up 12% vs last
  quarter") — each period is computed independently; nothing stores or
  diffs prior periods yet.
- **HR/Alumni/Library/etc. reports** — would require building the
  underlying transactional data model for those offices first (staff
  hiring/exit dates, alumni engagement records, library circulation),
  which doesn't exist yet.
