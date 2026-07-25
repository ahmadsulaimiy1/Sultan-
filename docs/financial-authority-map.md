# SHRS Financial Authority Map

*Required before finalising Migration Phase C, per explicit directive:
"do not treat this as merely moving routes." Same method and column
set as `docs/academic-records-authority-map.md` — every answer below
is read from `functions/_lib/permission-matrix.js`'s `finance` area and
the actual schema/endpoints in this repository, not proposed fresh.
Where a category the directive asked about doesn't exist as a system
concept, that is stated plainly, matching how Report Cards/Discipline/
Co-Curricular were treated in the Academic Records Authority Map.*

## What actually exists today

**One table: `fee_status`** — `student_id`, `term`, `amount_due`,
`amount_paid`. That's the entire financial data model. It is already
documented elsewhere in this project, in the Founder Dashboard's own
response, as "a snapshot, not a real ledger with receipts or
instalments" (`founder/dashboard.js` line 143, citing FN-03 — the
Tuition & Fees Policy — as Missing). There is no invoice table, no
payment/transaction table, no waiver/discount/scholarship table, no
refund table, no arrears calculation, and no statement-generation
capability anywhere in this codebase.

## The map

| Financial concept | Creator | Reviewer | Approver | Export Authority | Archive Authority |
|---|---|---|---|---|---|
| **Fee status (due/paid snapshot)** — the one real thing that exists | **Matrix says** Finance Officer (`FIN`, `finance` area, `C`). **Reality**: `FIN` is seeded `'proposed'` status in `setup.js` — no Finance Officer account has ever been issued. **No other role holds Create or Edit on `finance` at all** — not Registrar, not Principal, not Executive. Today this is written only via `admin/students.js`'s bearer token, which enforces no role check whatsoever beyond token possession. | Not named in the Matrix | Not named in the Matrix for routine entry | Finance Officer (`FIN`, `X`); Executive (`EXE`, `V` — aggregate only, Founder Dashboard, already live) | None — overwritten in place on re-entry (`ON CONFLICT (student_id, term) DO UPDATE`), no history of prior values kept |
| **Invoices** | **Does not exist as a system concept.** No table, no generation step. A family currently only ever sees a due/paid pair, never an itemised invoice. | — | — | — | — |
| **Payments** *(individual transactions — receipts, dates, methods)* | **Does not exist.** `fee_status` stores only running totals; there is no record of individual payment events, so "who paid what, when, by what method" cannot be answered by this system today. | — | — | — | — |
| **Waivers / Discounts / Scholarships** | **Does not exist as a distinct concept**, but the Matrix already anticipates it: `finance` area grants `EXE` an `A` (Approve) permission specifically scoped "refund/waiver/scholarship — no policy exists yet to route this through, flagged" — the Matrix's own authors already named this gap explicitly rather than silently omitting it. No corresponding Create action exists for anyone to originate a waiver request in the first place. | — | Executive (`EXE`, `A`) — **cannot be exercised**; nothing exists to approve | — | — |
| **Refunds** | **Does not exist.** Same `EXE` Approve grant above is the Matrix's only mention of refunds; no request/creation path exists. | — | Executive (`EXE`, `A`) — same unexercisable state as Waivers | — | — |
| **Arrears** *(amounts overdue, tracked as their own concept)* | **Does not exist as a computed or stored concept.** `amount_due` minus `amount_paid` can be derived ad hoc from `fee_status`, but nothing in this project calculates, flags, or reports arrears as a first-class thing — no "overdue" status, no ageing, no threshold-based flag. | — | — | — | — |
| **Statements** *(a family-facing document summarising fee history)* | **Does not exist.** No document-generation capability exists anywhere in this project (the same gap already named for Report Cards, Certificates, and Transcripts) — a guardian's dashboard shows the current term's due/paid pair directly from `fee_status`, not a generated statement. | — | — | Guardian/student see their own current-term snapshot already (`me.js`, `student/me.js`, `registrar/student.js`) — this is the closest thing to "export" that exists | — |

## The finding this map exists to surface

**Migrating `fee_status` write access to the Permission Engine as the
Matrix is actually written today would leave *no one* able to enter
fee data at all.** This is a more severe version of the Attendance/
Assessment findings from Phases A and B — those left Registrar able to
*correct* an existing record, just not create a new one. Finance has no
such fallback: Registrar holds zero grants in the `finance` area,
Principal holds zero, and Executive holds only View(aggregate)/Approve
(refund-waiver, itself unbuilt). The only role the Matrix grants
routine Create/Edit to — Finance Officer — has never been filled.

**This is not solved here by inventing a grant the Matrix doesn't
contain**, per the explicit standing instruction not to paper over a
missing-role gap by expanding an adjacent role's authority. Migration
Phase C (see `identity-migration-plan.md`) implements the endpoint
exactly as the Matrix specifies — meaning it will return the same
honest "your role does not hold this" response to literally every
staff member today, not just an unprivileged subset of them, until a
Finance Officer account exists. That is named here as a real,
significant operational consequence for the Board to weigh — appoint a
Finance Officer, or make an explicit, recorded decision to grant
someone else interim authority — not a decision this document or the
migration makes on its own.

## Relationship to the wider institution

This map, together with the Academic Records Authority Map and the
Teacher Operating Model, points at one underlying pattern rather than
three separate ones: **the Role & Permission Matrix already anticipates
an operational workforce (Teachers, Muhaffiz, Arabic Instructors,
Finance Officer) that has never been hired or onboarded into the Staff
Identity Platform.** Attendance, Assessments, and now Fees all trace
back to the same missing layer — not three unrelated gaps, one gap
found three times.
