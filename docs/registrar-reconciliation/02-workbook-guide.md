# Workbook Completion Guide — Field by Field

**Pack document 02 (guide). Companion to `02-workbook.csv`.**
**Authority:** the Founder's Registrar Reconciliation Preparation Directive, 15 August 2026.
**Status:** PREPARED — AWAITING THE REGISTRAR. Filling in this workbook changes nothing in any
computer system. It is observation and record only.

> **The freeze remains in force while you work.** Nothing in this guide asks you — or permits
> anyone — to generate a key, create or change a record in the production database, print,
> reissue, or revoke anything. Every future action named here happens only **after** the full sign-off chain
> (Registrar → Technical → Cryptographic → Founder) has approved it, as set out in `04-sop.md`.

---

## 1. Purpose

The workbook brings the five sources of truth face to face — your records, the physical
certificate (or its confirmed absence), the verification database, the cryptographic records,
and the public verification service's live answer — one row per certificate, 51 rows in all.
The first eleven columns are already filled in from the systems and are locked. **You fill only
the observation columns**: what physically exists, what is printed on it, and who holds it.
Nothing is decided in this workbook; decisions come later, at the joint Technical Review, using
the decision tree (`03-decision-tree.md`).

---

## 2. Columns already filled in (locked — do not edit)

These are columns 1 to 11, `row` through `live_status_2026_08_15`. They record what the
computer systems said on 15 August 2026. If you believe one of them is wrong, do **not**
change it — write what you believe in `registrar_remarks` instead.

| Column | What it means |
|---|---|
| `row` | The row number, 1–51. Use it in photo filenames (Section 5) and in remarks. |
| `record_kind` | **`ISSUED_2026_08_08`** — one of the 13 certificates that truly exist in the verification database, created on 8 August 2026, and answering on the public verification site today. **`PLANNED_ONLY`** — one of the 38 certificates named in the ratified reissue plan that have **never been generated**: no database record, no signature, no number ever produced by the system. A `PLANNED_ONLY` row says nothing about whether a piece of paper exists — that is exactly what you are being asked to establish. |
| `known_certificate_no` | For the 13 issued certificates: the full stored serial number (e.g. `SHRS-CERT-IBT-2026-000035-368DC`). For planned rows it reads "(none — never generated)". |
| `plan_seq` | For planned rows only: the sequence number (48–85) the reissue plan **provisionally allocated**. This is a pencilled-in allocation in a planning file — **it is NOT a number presumed to be printed on anything**, and the allocations will be renumbered around whatever is actually in circulation. Never copy a `plan_seq` into any of your columns. |
| `student_full_name` | The student's name as the system or plan carries it. Some rows deliberately show an older, shorter form of a name (the plan later corrects it) — record the paper as it is; do not reconcile names here. |
| `student_identity_no` | The 15-digit permanent Student ID on record (marked "(plan)" where it comes from the plan rather than an issued record). |
| `programme_code` | The academic stage: IBT (Ibtidā'iyyah/Primary), IDD (I'dādiyyah/Intermediate), QUR (Qur'an College), TMH (Tamhīdiyyah/Preparatory), PRY (Basic 5), JSS (JSS 3), SS (SSS 3). |
| `session` | The academic session, 2025/2026 throughout. |
| `plan_action` | What the Founder-ratified plan of 8 August 2026 proposes for this row (KEEP / REISSUE / REVOKE / MINT). **Ratified but not executed** — it is context, not an instruction, and nothing happens until after full sign-off. |
| `db_record_exists_2026_08_15` | Whether a database record existed on 15 August 2026, per the live presence audit (GitHub Actions run 31862779664, 03:48–03:50 UTC, sequence numbers 1–150 checked): exactly 13 exist (000035–000047); 137 numbers found nothing; 0 errors. |
| `live_status_2026_08_15` | What the public verification page answered on 15 August 2026 (run 31857567994, 01:50 UTC — all 13 verified on every printed identifier and QR). See below for the two wordings. |

### What "active (intact)" and "active (pending_signature)" mean, in plain words

- **active (intact)** — the record exists, and the mathematical check fully passes: the
  computer re-ran the calculation and confirmed the record matches its own signature. Shown by
  the 7 IBT certificates (000035–000041), signed under key v1, which is retired but still
  available for checking.
- **active (pending_signature)** — the record exists and matches the Registrar's file, but the
  key that signed it (v2) is missing from the live system, so the mathematical check cannot
  currently be re-run. Shown by the 6 IDD certificates (000042–000047). **This is an honest
  "key unavailable" state, not a mismatch** — it does not mean the certificate is suspect, and
  the system deliberately never displays it as a failure.

---

## 3. Columns YOU fill in (columns 12–23)

General rules for every observation column:

1. **Record what you see, never what "should" be there.** The workbook exists to capture the
   paper exactly, discrepancies included.
2. **Never leave a cell blank.** If you genuinely cannot establish something, write `Unknown`.
3. Where a row's certificate does not physically exist, write `NONE` in
   `printed_certificate_no_exact` and `N/A` in the remaining `printed_` columns.
4. Do not edit the locked columns, and write only in your own row's cells.

### 3.1 `physical_certificate_exists` — Yes / No

Does a physical printed certificate exist **anywhere** for this row's award — in the student's
hands, in a parent's keeping, in the school's files, framed on a wall, anywhere?

1. Write `Yes` if you have seen it, hold it, or have reliable confirmation it exists.
2. Write `No` only when you are satisfied no such document was ever printed.
3. If you cannot establish it either way, write `Unknown` and explain in `registrar_remarks`.

### 3.2 `physically_awarded` — Yes / No

Was a physical certificate formally handed to the student (or their family) — at a ceremony,
by collection, or by delivery?

1. `Yes` — it was presented or handed over, at any time.
2. `No` — it was printed but never handed over, or was never printed at all.
3. `Unknown` if you cannot establish it; say why in `registrar_remarks`.

### 3.3 `currently_held_by_student` — Yes / No / Unknown

Where is the document **now**?

1. `Yes` — the student or their family holds it today.
2. `No` — the school holds it, or it is confirmed lost or destroyed (say which, in remarks).
3. `Unknown` — you cannot currently establish its whereabouts.

### 3.4 `printed_certificate_no_exact` — copy the printed number character for character

This is the single most important column in the workbook. If a certificate exists:

1. Take the physical document (or a clear photograph of it).
2. Find the certificate number printed on it.
3. Copy it **exactly, character for character** — every letter, digit, and hyphen, in order.
4. Some documents carry a 5-character tail after the six-digit number (e.g. `-368DC`); some may
   not. **Include the tail if the paper shows one; omit it if the paper does not.** Copy
   exactly what is printed, no more and no less.
5. Do not add a year, remove a year, correct a "typo", or make the number match the plan or
   the locked columns. If the printed number differs from `known_certificate_no` or from
   anything you expected, that difference is precisely what we need to see — copy it faithfully
   and note the discrepancy in `registrar_remarks`.
6. If no physical certificate exists, write `NONE`.

**Record every document on the row of the student and programme it names** — never on the row
whose planned number happens to match what is printed. (Section 6 explains why.)

### 3.5 `printed_qr_present` — Yes / No

Does the physical document carry a QR code (the square barcode)? `Yes` or `No`. If no
certificate exists, `N/A`.

### 3.6 `qr_payload_exact` — scan and paste

If a QR code is present:

1. Scan it with any phone's camera or any free QR-reading app.
2. The phone will show the text or web address hidden inside the code.
3. Copy that text **exactly as the phone shows it** into this cell — do not shorten it, do not
   retype it from memory, and do not follow the link and copy something from the page instead.
4. If the code will not scan (damaged, faded), write `Unscannable` and note it in remarks.
5. If there is no QR code, write `N/A`.

### 3.7 `printed_verification_code_present` — Yes / No

Does the document carry a printed verification code — twelve hexadecimal characters
(letters/digits) grouped in fours (e.g. in the style of the real issued codes
`5679-8589-3C87` on certificate 000042, or `368D-CFC6-B85D` on certificate 000035), usually
near the QR code or on a verification panel? `Yes` or `No`. If no certificate exists, `N/A`.

### 3.8 `printed_verification_code_exact`

If present, copy the verification code exactly as printed, keeping or omitting the hyphens and
spacing exactly as the paper shows them. If absent, `N/A`.

### 3.9 `printed_verification_url`

If the document prints a web address for verification (anywhere on the sheet), copy it exactly
as printed. If none is printed, write `N/A`. Do not substitute the address you know the live
service uses — copy the paper.

### 3.10 `printed_issue_date`

Copy the issue date exactly as it appears on the document, **in whatever format it is printed**
("8 August 2026", "08/08/2026", a Hijri date, or both — copy all date lines shown). If no
date is printed, write `None printed`. If no certificate exists, `N/A`. You transcribe the date
exactly as printed; conversion to the ISO `YYYY-MM-DD` form happens later, at the joint
Technical Review — you never convert it.

### 3.11 `registrar_remarks`

Free text. Use it for:

1. Anything the fixed columns cannot capture — damage, corrections made by hand on the paper,
   duplicate documents, a family's account of when it was received.
2. Every discrepancy you notice between the paper and the locked columns (name spelling,
   number, programme, date).
3. The basis for any `Unknown` answer — what you tried and why it could not be established.
4. Any physical certificate you encounter that matches **no row at all** — describe it here on
   the nearest relevant student's row, and raise it at the joint Technical Review.

If there is nothing to say, write `None`.

### 3.12 `supporting_evidence_ref`

List the photo filenames for this row, using the convention in Section 5 — for example:
`row07-front.jpg` or `row07-front.jpg; row07-qr.jpg`. If no certificate exists and there is
therefore nothing to photograph, write `N/A`.

---

## 4. Columns filled in LATER, at the joint Technical Review — not by you alone

Columns 24–27 stay **empty** during your review. They are completed jointly, with the
technical reviewer present, by walking each finished row through the decision tree in
`03-decision-tree.md`:

| Column | Who fills it, and when |
|---|---|
| `final_classification` | Joint Technical Review. Each row is classified A, B, or C by the decision tree — mechanically, from your observations, with no per-row improvisation. |
| `recommended_action_code` | Joint Technical Review. One of the pack's terminal action codes (table below), or the holding value **`B2 — pending P1/P2`** for a B-category row awaiting the Founder's one-time written P1/P2 policy selection (it resolves mechanically to `B2a` or `B2b` the moment that selection exists). Recording a code here is a **recommendation only** — no code is executed until the full sign-off chain (Registrar → Technical → Cryptographic → Founder) has approved it. |
| `registrar_signoff` | You — but only at the formal sign-off step in `04-sop.md`, after the classification columns are complete, not while observing. |
| `auditor_signoff` | The technical/audit reviewer, at the same formal step. |

The terminal action codes you will see used across the pack (all gated behind sign-off; none
may be performed during the freeze):

| Code | Meaning (executed only after full sign-off) |
|---|---|
| A1 | Leave the certificate unchanged. |
| A2-R | Execute the ratified reissue for this certificate. |
| A2-V | Execute the ratified revocation for this certificate. |
| B1a | Register the printed document as-is under key v1 (only where the printed tail is cryptographically reproduced under v1). |
| B2a | Record the printed number in the legacy certificates register — it then resolves publicly, with no cryptographic self-check; the paper is unchanged. |
| B2b | Formal reissue under a new, fully-signed number; the printed document is formally superseded. |
| C0 | No award due — record and close. |
| C1 | Mint fresh under key v3, after all gates (including v3 generation, which has not happened — v3 does not yet exist). |

One further gate you should know exists: before **any** B2 action is taken, the Founder selects
once, in writing, between policy P1 (legacy registration suffices for already-printed unsigned
documents) and P2 (every circulating credential must be cryptographically signed, so B2
documents are reissued). The chosen policy then applies mechanically to every B2 certificate —
there is no per-certificate discretion, and nothing for you to decide row by row.

---

## 5. Evidence photographs

1. Take **one clear photograph of the front of every physical certificate** you record. This
   is the minimum; it is required for every row where `physical_certificate_exists` is `Yes`.
2. Photograph flat-on, in good light, with the whole sheet in frame and every printed number
   and code legible when zoomed. Retake it if any number is blurred.
3. Add close-ups where useful: the QR code, the verification panel, the back of the sheet if
   anything is printed there.
4. Name the files by workbook row, two digits:
   - `row07-front.jpg` — the front of the certificate on row 7 (required)
   - `row07-back.jpg` — the back, if anything is printed on it (optional)
   - `row07-qr.jpg` — close-up of the QR/verification panel (optional)
5. List every filename in that row's `supporting_evidence_ref` cell.
6. Deliver the photographs together with the completed workbook for the joint Technical
   Review (`04-sop.md`). The exact transfer channel (shared folder, drive, or physical media):
   [TO BE CONFIRMED BY REGISTRAR] — agree it with the Founder's office before you begin, and do
   not send photographs over any channel not agreed there.

---

## 6. The number 48 collision — why "copy exactly" is the rule

On 15 August 2026 the Founder reported, with a screenshot of the live verification page, a
physical certificate **already in a student's hands** printed **`SHRS-CERT-JSS-000048`** — a
JSS certificate. But the reissue plan allocates sequence 48 to a **Qur'an College** certificate
(row 14 of the workbook, Aisha Omoshalewa Anofi). The plan and at least one printed document
therefore disagree about who holds number 48.

This is exactly why the workbook demands the printed number **exactly as it appears**:

1. **Never "correct" a printed number to match the plan**, the locked columns, or your
   expectation. A number printed on paper in a child's hand outranks a number in a planning
   file; the plan's allocations (48–85) are provisional and will be renumbered around whatever
   is physically in circulation — never the other way round.
2. **Record each document on the row of the student and programme it names**, not on the row
   whose planned sequence number happens to match. The physical JSS-000048, for instance,
   belongs on the JSS row of whichever student it names — not on row 14.
3. There may be further collisions we do not yet know about. Your exact transcriptions are the
   only way to find them.

---

## 7. Completion checklist

Before handing the workbook over, confirm:

- [ ] All 51 rows have an answer in every observation column (columns 12–23).
- [ ] No observation cell is blank — every genuinely unresolvable item says `Unknown`, with the
      reason in `registrar_remarks`.
- [ ] Every row with `physical_certificate_exists = Yes` has a `printed_certificate_no_exact`
      copied character for character from the paper (or a remark explaining why not), and every
      row without one says `NONE`.
- [ ] Every physical certificate has at least a `row<NN>-front.jpg` photograph, listed in
      `supporting_evidence_ref`, with all printed numbers legible.
- [ ] Every QR code present has been scanned and its exact payload pasted (or marked
      `Unscannable` with a remark).
- [ ] Every discrepancy between paper and the locked columns is noted in `registrar_remarks` —
      including any document matching no row at all.
- [ ] The locked columns (1–11) and the review columns (24–27) are untouched.
- [ ] No number has been "corrected", reconciled, or copied from `plan_seq`.

When every box is ticked, the workbook is ready for the joint Technical Review under
`04-sop.md`. Nothing further happens — no key, no mint, no record change, no reissue, no
revocation — until the full sign-off chain has approved it.
