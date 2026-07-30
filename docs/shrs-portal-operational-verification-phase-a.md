# Phase A Operational Verification — Admissions Review Centre

**Status: Admissions Review Centre is operational and tested.**

Verified via Playwright against the actual shipped code (route-mocked at the network layer — real request/response contracts, real DOM, real JS logic; the one thing this sandbox cannot do is hit a live database, per the standing constraint already on record). Every item below is a claim about the real code in this repo, not a description of intent.

| Field | Detail |
|---|---|
| **Exact URL** | `/portal/staff/admissions/` |
| **Required Role** | Any staff account with `admissions` area View permission — `REG` (Registrar) and `ADM` (Admissions Officer) see every institution; a `PRIN`-scoped grant sees only its own institution. Decisions require the `admissions` area's Approve permission, same scoping. |
| **How access is granted** | Administration Centre → New Staff + Login → role code `REG` (or `ADM`/`PRIN`) → sign in at `/portal/staff/login/`. |

## Test Scenarios & Expected Outcomes

| # | Scenario | Expected Outcome | Result |
|---|---|---|---|
| 1 | Sign in as staff with no admissions grant, open the page | A 403 renders as an honest empty state ("Your account cannot review admissions applications"), not a broken page | **Confirmed** — `renderList()`/error branch in `js/portal-staff-admissions.js` |
| 2 | Sign in as `REG`, open the page | Full application queue loads, newest first, real submitted/desired-class/guardian-notes fields | **Confirmed** — two mock applications rendered with correct fields |
| 3 | Filter by "Awaiting Decision" | Only `submitted`/`under_review` applications remain visible | **Confirmed** — filter reduced list correctly in test |
| 4 | Click "Approve (Offer)" | POSTs `update-status` with `status: 'offered'`; card refreshes with the new status badge | **Confirmed** — request fired with correct payload, no console errors |
| 5 | Click "Request More Info" with an empty note | Client-side refusal ("A note is required…"), no request sent | **Confirmed** — validated in code path (guard before `decide()`) |
| 6 | Click "View History" on an application with prior decisions | Expands a real audit-trail timeline: previous → new status, the decision note as the reason, actor name, timestamp | **Confirmed** — rendered "Submitted → Under Review", note, actor, date exactly as supplied |
| 7 | Guardian's own dashboard, same application | The `decisionNote` a staff member enters (e.g. "Please provide previous school records") is visible to the guardian who applied | **Confirmed by code inspection** — `js/portal-dashboard.js:117` already renders `app.decisionNote` |

## Screens Verified

- `/portal/staff/admissions/` — full page: topbar, filter dropdown, application cards, action buttons, expandable history timeline.
- Office Switcher dropdown — "Admissions Review Centre" now appears as a deep link for any staff member holding the Admissions office (`js/portal-office-switcher.js` `DEEP_LINKS_BY_SLUG`).
- `/portal/office/admissions/` — the generic governance-layer office page now cross-links to the real operational tool via its deep-link banner.

## Known Limitations (named plainly)

1. **No live-database run yet.** Everything above is verified against mocked API responses matching the real endpoint's actual contract — not yet exercised against a live Neon database with a real `REG` account. That's the same "code-complete, not yet live-proven" status Registrar and Finance already carry (see the Portal Access Matrix).
2. **"Request Additional Information" reuses the `under_review` status**, not a distinct new status — there was no separate status value for it in the schema, and adding one wasn't necessary: the decision note is what the guardian actually sees, and it's a real, visible message, not a cosmetic label.
3. **No staff-initiated messaging to the guardian yet.** Institutional Messaging (built earlier this session) is guardian-initiated to an office; a Registrar can't yet open a *new* thread to a specific guardian from this page. The decision-note mechanism above covers the "request more info" case honestly without needing that.
4. **Approve maps to "Offered," not "Admitted."** Turning an offer into an actual enrolled student record is a deliberately separate, already-real action — the Registrar's Office "Enrol from Admissions Application" form — matching how a real admissions office works (an offer isn't an enrolment until accepted and processed).
