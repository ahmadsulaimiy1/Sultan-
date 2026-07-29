# Finance Platform

**Priority 3 of the SHRS Imperial Digital Campus Directive** (per the
Board's revised sequencing — Finance third, right after Certificates &
Digital ID Cards, ahead of Founder Analytics, the Institutional
Knowledge Base, and the full LMS). This document records what actually
shipped, what it builds on, and what's explicitly deferred — the same
honest-scoping standard used for Priorities 1 and 2.

## What this is

A real invoice/receipt ledger replacing the single `fee_status`
due/paid snapshot that was the entire financial data model before this
phase — per-institution fee structures, an invoice engine, QR-verifiable
receipts, scholarships, payment plans, a debtors/ageing report for the
Finance Office, and real revenue/collection figures on the Founder
Dashboard.

## What already existed (not rebuilt)

- The `finance` permission area in `functions/_lib/permission-matrix.js`,
  with `FIN` (Finance Officer) already holding View/Create/Edit/Export
  and `EXE` holding an aggregate View — added during an earlier
  "Migration Phase C" pass. Every endpoint in this phase reuses those
  exact grants; no new role or permission was added.
- `fee_status` (the old due/paid-per-term snapshot) — left completely
  unchanged. It still powers three existing read-only displays
  (guardian dashboard, student dashboard, Founder Dashboard's legacy
  "Fees" section) exactly as before. The new `invoices`/`receipts`
  ledger is additive, not a replacement — see "Design note" below for
  why both now exist side by side.
- `institutions` (four real rows: Nursery & Primary, Royal College,
  Islamic & Arabic Studies, Qur'an College) and `academic_terms` — fee
  structures and invoices key off these exactly as every other
  institution-aware table in this codebase does.
- The certificate verification pattern (`functions/api/certificates/
  verify.js` + `qr.js`) — receipts reuse the identical public,
  no-login, reference-number-is-the-key design.

## What's new

- **Schema**: `fee_structures`, `invoices`, `invoice_items`, `receipts`,
  `scholarships`, `payment_plans`, `payment_plan_installments` (see
  `sql/schema.sql`'s Finance Platform block for full column detail and
  design rationale on each).
- **Real seed data, not placeholders**: fee structures for Qur'an
  College (Tahfiz, boarder), Royal College SSS 1 (boarder + new
  entrant), and Royal College JSS 1 (boarder + new entrant) were seeded
  from the school's own actual fee bills, supplied directly by the
  school's finance contact (WhatsApp, 1–2 Nov 2025) — registration,
  tuition, feeding & accommodation, first aid, educational resources,
  development fee, uniform items (school uniform/sportwear/hostel
  wear/Friday wear), textbooks, and the female-only hijab item, with
  exact amounts. Nursery & Primary and every other class/institution
  combination have **no fee structures seeded** — nothing was invented
  for classes the school hasn't supplied a schedule for yet.
- **Fee Structure Management**
  (`functions/api/portal/staff/finance/fee-structures.js`): Finance
  Officer create/deactivate, independently configurable per institution
  and class.
- **Invoice Engine** (`functions/api/portal/staff/finance/invoices.js`):
  builds an invoice from selected fee-structure templates plus optional
  custom line items; auto-generates `SHR-INV-<year>-<seq>` (same
  pattern as certificate reference numbers,
  `functions/_lib/finance-no.js`); automatically applies any active
  scholarship discount and **snapshots** it onto the invoice at
  issuance, so a later scholarship change never silently rewrites an
  invoice already issued.
- **Receipts** (`functions/api/portal/staff/finance/receipts.js`):
  records a payment against an invoice, generates `SHR-RCT-<year>-<seq>`,
  recomputes the invoice's status (unpaid/partial/paid).
  `payment_method` is limited to cash/bank transfer/cheque/POS/other —
  **no online payment gateway integration exists** (no processor
  credentials are configured anywhere in this deployment), so a receipt
  records a payment the school already received through another
  channel; it is not a live checkout.
- **Public receipt verification** (`functions/api/finance/verify-receipt.js`
  + `receipt-qr.js`, `/verify-receipt/` EN+AR): identical philosophy to
  certificate verification — no login, receipt number is the public
  key, staff-assigned only.
- **Scholarships** (`functions/api/portal/staff/finance/scholarships.js`):
  full/partial/sponsored, percentage or fixed-amount discount,
  term-scoped or ongoing, revocable (never deleted).
- **Payment Plans** (`functions/api/portal/staff/finance/payment-plans.js`):
  monthly/termly/custom instalment schedules generated for an invoice,
  amounts split evenly with the remainder folded into the final
  instalment so the sum always reconciles exactly.
- **Debtors & Ageing Report**
  (`functions/api/portal/staff/finance/debtors.js`): every
  unpaid/partial invoice, days-overdue computed live from `due_date`
  (0–30/31–60/61–90/90+ buckets), grouped and summed by bucket.
- **Finance Officer staff UI** (`portal/staff/finance/index.html` +
  `js/portal-staff-finance.js`): a real office — fee structure
  management, invoice creation with a live fee-structure checklist,
  payment recording (with inline receipt number, verify link, and QR
  code, exactly like the Registrar's certificate-issuance panel),
  scholarship granting, payment plan setup, and the debtors report —
  reachable at its direct URL the same way the Registrar's and
  Teacher's office pages are, since no staff "office directory" hub
  page exists yet in this codebase for any office.
- **Parent & Student Portal integration**
  (`functions/_lib/finance-summary.js`, shared by both `/api/portal/me`
  and `/api/portal/student/me`): current balance, invoice list with
  status badges, scholarship note, next payment-plan instalment due,
  and payment history with links to the public verify page — a new "My
  Fees" card (`js/finance-widget.js`) shown only when a student
  actually has invoice data, so a student with none sees nothing extra
  rather than an empty fabricated section.
- **Founder Dashboard — real revenue analytics**
  (`functions/api/portal/founder/dashboard.js`'s new `finance` block,
  rendered by `js/portal-founder-dashboard.js`): revenue by month (hand-
  rolled inline SVG bar chart, no charting library exists in this
  codebase — see `docs/shrs-design-system.md`'s Charts section — built
  on the `--chart-1..6` design-system tokens), revenue by institution,
  outstanding by institution, total invoiced/collected, collection rate
  percentage, and scholarship exposure (total discount value granted).
  These are computed from the real ledger, not the old `fee_status`
  snapshot, which stays visible underneath as a clearly-labelled
  "Legacy Snapshot" section.

## What's honestly still missing

- **A real Finance Officer account.** Exactly the gap `docs/
  financial-authority-map.md` and `docs/identity-migration-plan.md`
  already flagged before this phase: the `FIN` role has never been
  assigned to any real staff record. Every capability in this document
  exists in code and is fully permission-gated and audited — but until
  the school provisions a real FIN (or delegates FIN authority to an
  existing staff member), every staff member gets the same honest 403,
  not a privileged subset. This is a governance/HR action, not a code
  gap, and this phase deliberately does not invent a workaround for it.
- **Online payment gateway / self-service checkout.** Parents can see
  their balance and payment history, but cannot pay online from the
  portal — no Paystack/Flutterwave/Stripe integration exists, and none
  should be added without the school's own merchant credentials and a
  considered decision about which processor to use.
- **Approval workflow for scholarships.** The permission matrix already
  grants `EXE` an Approve permission scoped to "refund/waiver/
  scholarship," but flags itself that "no policy exists yet to route
  this through." No Approval Workflow Architecture exists anywhere in
  this codebase (a known, separately-tracked roadmap item) — granting a
  scholarship here is a direct FIN action, not a two-step
  request/approve flow. Building that properly is future work, not
  solved by inventing an ad hoc approval step here.
- **Refunds.** Not built — there is no refund concept in the schema at
  all yet. A revoked receipt marks that specific payment as no longer
  valid (e.g. a bounced cheque); it does not model money being returned
  to a payer.
- **Fee structures beyond what the school has supplied.** Nursery &
  Primary has zero fee structures. Royal College and Qur'an College
  only have the specific classes/categories in the real bills supplied
  so far. The Finance Officer UI lets staff add more the moment a real
  schedule exists for them — nothing here blocks that — but none were
  fabricated to "fill out" the four schools evenly.
- **Automatic instalment reconciliation.** Recording a receipt does not
  automatically mark a specific payment-plan instalment as paid — a
  Finance Officer does that manually, since there's no payment gateway
  to detect which instalment a given bank transfer was meant to cover.
- **Multi-currency / tax handling.** Everything is Naira, with no tax
  or multi-currency modelling — matches every other financial figure
  already on this site (marketplace prices, the legacy `fee_status`
  amounts).

## Design note: why `fee_status` and `invoices` both still exist

Rewriting the three existing `fee_status`-reading displays to the new
ledger risked breaking working code for a marginal short-term gain,
and the two aren't in conflict — `fee_status` is a manually-entered
snapshot nobody could actually write to anyway (no FIN account exists),
while `invoices`/`receipts` is the real, permission-gated ledger this
phase was built to deliver. The Founder Dashboard shows both, clearly
labelled ("Finance — Executive Command Centre" vs. "Fees (Legacy
Snapshot)"), so nothing is silently replaced or hidden.
