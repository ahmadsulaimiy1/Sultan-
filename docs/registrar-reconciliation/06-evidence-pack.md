# 06 — The Evidence Pack

**SHRS Registrar Reconciliation Pack — document 6 of 7. The per-certificate evidence index.**
**Authority:** the Founder's Registrar Reconciliation Preparation Directive, 15 August 2026.
**Status:** PREPARED — AWAITING THE REGISTRAR. No lifecycle action has been taken.

> **The freeze is in force.** This document is a citation index: it records where the proof
> for every workbook row lives. It performs no action and authorises none. No signing key is
> generated, no certificate is minted, no record is created or modified in the production
> database, and no
> reissue or revocation is executed until the full sign-off chain of the SOP (`04-sop.md`) —
> **Registrar → Technical → Cryptographic → Founder** — has been completed for that action.
> Every future step named here happens only **after sign-off**, when authorised.

---

## 1. Purpose and how to use this index

Every claim made anywhere in this pack must be traceable to a piece of evidence a reader can
open and check. This document does that in two layers:

1. **The shared evidence base (Section 2)** — the items cited by many rows at once. Each is
   given a short code (**E1**, **E2**, …) and described fully **once**.
2. **The per-row table (Section 3)** — one line per workbook row, all 51, pointing into the
   shared base by code. At the joint Technical Review (SOP Stage 2), each row's final column
   receives exactly one reconciliation note; until then it stays blank.

Everything in this index is pinned to the evidence baseline of 15 August 2026, repository
commit `afb80e87` (full: `afb80e8724c1a19c36aa0126ffa4f87bbb74adc5`).

---

## 2. The shared evidence base

| Code | Evidence item | What it establishes |
|---|---|---|
| **E1** | **Live database presence audit** — GitHub Actions run `31862779664`, 2026-08-15T03:48–03:50 UTC, repository commit `afb80e87` (public log: `https://github.com/ahmadsulaimiy1/Sultan-/actions/runs/31862779664`). Method: for every candidate sequence number 1–150, a read-only `GET https://shroyalschools.com/api/certificates/verify?ref=2026<seq, zero-padded to 6>` against the live public verification service — the archive-barcode lookup shape, which does not require guessing a programme code (audit §0). | Result: exactly **13 rows exist** (sequence numbers 000035–000047); **137 numbers found nothing** (1–34 and 48–150, including every one of the reissue plan's provisional allocations 48–85); **0 errors**. This is the direct, per-number proof that no database record exists for any planned certificate. |
| **E2** | **Live acceptance run** — GitHub Actions run `31857567994`, 2026-08-15T01:50 UTC. Read-only verification of the 13 issued certificates against production. | All 13 verify on **every printed identifier and QR payload**, status `active`. The 7 IBT certificates show integrity **intact** (full cryptographic confirmation under retired key v1); the 6 IDD certificates show **pending_signature** (the honest key-unavailable state — key v2 is lost — not a mismatch). |
| **E3** | **Cloudflare environment-name audit** — the read-only GitHub Actions workflow `cloudflare-env-audit.yml`, prior run as cited by the audit §3. It lists environment-variable **names only**; no secret value is ever read or displayed. | `DOCUMENT_HASH_SECRET` (the v2 key, SHA-256 fingerprint `24bb0f683233486a`) is **absent from both Production and Preview** — key v2 is lost and, per E9 §3, unrecoverable. `DOCUMENT_HASH_SECRET_V1` (the retired v1 key) is **present in Production**, so the 7 IBT certificates remain fully verifiable. |
| **E4** | **The full audit** — `docs/shrs-certificate-cryptographic-integrity-audit-2026-08-15.md`. | The primary evidence narrative: the 13-certificate ledger (§2.1), the formal key history v1/v2/v3 (§3), the per-item proof that no record, signature, QR, verification code, or sealed register exists for the 38 planned certificates (§4.1–4.6), the explicit statement that physical existence of paper is **not** provable from the systems (§4.7), and the immutability proof that a future v3 key cannot touch the existing 13 (§5). |
| **E5** | **Sealed register, IBT batch** — `docs/graduation-registers/2026-08-08-IBT-000035.json`, `….md`, `….sql`. | The project's own sealed record that the 7 IBT certificates (000035–000041) were generated and signed under key v1 on 2026-08-08. The SQL file omits `hash_key_version` and takes the default of 1, which is correct for this batch (E9 §6). |
| **E6** | **Sealed register, IDD batch** — `docs/graduation-registers/2026-08-08-IDD-000042.json`, `….md`, `….sql` (a `….sha256` seal file is also present alongside them, as is the combined `2026-08-08-PRODUCTION-IMPORT.sql`). | The sealed record that the 6 IDD certificates (000042–000047), issue-dated 2026-08-08, were re-minted and signed under key v2 on 2026-08-06 (E9 §5); the SQL writes `hash_key_version = 2` explicitly. |
| **E7** | **The canonical roll** — `docs/graduation-registers/canonical-roll-2026.json`. The Registrar's own Founder-ratified roll: 44 awards, 31 children, 7 categories (QUR 4, TMH 1, IBT 9, IDD 5, PRY 6, JSS 15, SS 4). | The institutional answer to "who is owed what award" — the register evidence for every planned row. |
| **E8** | **The ratified reissue plan** — `docs/graduation-registers/reissue-plan-2026.json`, Founder-ratified 8 August 2026. `actions`: 6 KEEP / 4 REISSUE / 3 REVOKE against the 13 issued certificates. `toMint`: 38 planned certificates with **provisional** sequence allocations 48–85. **Ratified but unexecuted** — under the freeze it remains a plan, not a record. | The plan-side evidence for every row: what was proposed for each issued certificate, and which student, programme, and provisional sequence each planned certificate carries. Its allocations 48–85 are provisional and will be renumbered around whatever is physically in circulation (invariant I1, `03-decision-tree.md` §7). |
| **E9** | **Key custody and deployment record** — `docs/certificate-key-deployment.md`. | What each key signs and proves (§1), the environment variables (§2), the custody rule and the consequence of loss (§3 — "read this part twice"), the rotation procedure (§4), and the 2026-08-06 v2 re-mint record with the before/after tails (§5). |
| **E10** | **Key repository commits** (all reachable from `main` at the baseline): **(a)** `7090fddd` — "Build the Certificate Generation System (Ibtida'iyyah certificate engine)": the certificate system build (engine code only — it contains no register file). The IBT sealed register (E5) was first added at `f586ca6a` ("Issue the first production batch", 2026-08-05); its current sealed content dates from `c3afdb4b` (2026-08-06 — regeneration on the final authoritative list of seven), last touched at `4bbe28d7`; **(b)** `f24544fe` — "Production import for the thirteen, and the key configuration it needs": the production import of the 13; **(c)** the JSS visual-template series `cc7b5da`, `d084ed1`, `8e8e97f`, `cb5bbce`, `5ad2e5c`, `963d815` — approved artwork/template work whose own commit message states plainly: *"Visual template only: no signatory map entry, no issuance endpoint"* (audit §4.7); **(d)** `afb80e87` — the commit the whole evidence baseline is pinned to. | (a) and (b) are the repository history of the 13 issued certificates' generation and import. (c) proves a JSS **template** exists — which is a separate fact from any specific student's document ever having been rendered from it. (d) fixes the exact state of the repository every citation in this pack refers to. |

**One honest limitation, stated once (audit §4.7).** E1–E10 together prove everything about
the database, the keys, the repository, and the live service. They prove **nothing either
way** about which pieces of paper physically exist in students' hands. That question belongs
to Stage 1 (Registrar Review), and its evidence — the physical documents and their
photographs — joins this index as it is gathered (Sections 4 and 5).

**A second stated limitation — the legacy `certificates` register.** The contents of the
legacy `certificates` register are **not** covered by the baseline presence sweep: run
`31862779664` (E1) queries `stage_certificates` row ids only. A read-only enumeration of
that table may be added during Stage 2 as a GET-only check; until then this pack treats
its contents as unknown.

---

## 3. Per-row evidence table — all 51 workbook rows

How to read the columns:

- **Register evidence** — where the institutional record for this row lives (file + entry).
- **Database evidence** — whether run `31862779664` (E1) found a database record on
  15 August 2026.
- **Repository evidence** — the sealed register file for the row, or the audit's proof that
  none exists.
- **Workflow evidence** — the GitHub Actions run IDs covering the row.
- **Production evidence** — the live public verification answer on 15 August 2026.
- **Reconciliation notes** — **blank by design.** Completed at the joint Technical Review
  (Stage 2): exactly one note per row, citing the evidence for every decision-tree question
  answered on the way to that row's terminal.

### 3.1 The 13 issued certificates (workbook rows 1–13)

| Row | Certificate | Register evidence | Database evidence | Repository evidence | Workflow evidence | Production evidence | Reconciliation notes |
|---|---|---|---|---|---|---|---|
| 1 | `SHRS-CERT-IBT-2026-000035-368DC` — Hameedah Adebimpe Ojewumi (IBT) | E5, entry 000035; E8 `actions`: KEEP | Found — E1 | E5 (engine built at E10a; register first added `f586ca6a`, current sealed content `c3afdb4b`/`4bbe28d7` — see E10a; imported at E10b) | E1 (`31862779664`), E2 (`31857567994`) | Live: `active`, integrity `intact` — E2 | |
| 2 | `SHRS-CERT-IBT-2026-000036-B9E10` — Aisha Anofi (IBT) | E5, entry 000036; E8 `actions`: REISSUE (to "Aisha Omoshalewa Anofi", plan seq 53) | Found — E1 | E5 (register commits per E10a; imported at E10b) | E1, E2 | Live: `active`, `intact` — E2 | |
| 3 | `SHRS-CERT-IBT-2026-000037-22C49` — Abdulbasit Adedokun (IBT) | E5, entry 000037; E8 `actions`: REVOKE ("not on the Registrar's IBT roll") | Found — E1 | E5 (register commits per E10a; imported at E10b) | E1, E2 | Live: `active`, `intact` — E2 | |
| 4 | `SHRS-CERT-IBT-2026-000038-2944F` — Naheemah Ismail (IBT) | E5, entry 000038; E8 `actions`: REISSUE (to "Naheemah Ismail Seriki", plan seq 59) | Found — E1 | E5 (register commits per E10a; imported at E10b) | E1, E2 | Live: `active`, `intact` — E2 | |
| 5 | `SHRS-CERT-IBT-2026-000039-518A8` — Ashrof Akorede (IBT) | E5, entry 000039; E8 `actions`: REISSUE (to "Ashraf Korede Ojewumi", plan seq 55) | Found — E1 | E5 (register commits per E10a; imported at E10b) | E1, E2 | Live: `active`, `intact` — E2 | |
| 6 | `SHRS-CERT-IBT-2026-000040-60DAF` — Imran Adegoke (IBT) | E5, entry 000040; E8 `actions`: REISSUE (to "Imran Iremide Adegoke", plan seq 57) | Found — E1 | E5 (register commits per E10a; imported at E10b) | E1, E2 | Live: `active`, `intact` — E2 | |
| 7 | `SHRS-CERT-IBT-2026-000041-6F66F` — Abdulateef Adedokun (IBT) | E5, entry 000041; E8 `actions`: KEEP | Found — E1 | E5 (register commits per E10a; imported at E10b) | E1, E2 | Live: `active`, `intact` — E2 | |
| 8 | `SHRS-CERT-IDD-2026-000042-56798` — Muhammad Ismail Seriki (IDD) | E6, entry 000042; E8 `actions`: REVOKE ("not on the Registrar's IDD roll"; roll awards at plan seq 58 and 79) | Found — E1 | E6 (E10b) | E1, E2 | Live: `active`, `pending_signature` (honest key-unavailable state, not a mismatch — E3, E4 §3) — E2 | |
| 9 | `SHRS-CERT-IDD-2026-000043-6EEAF` — Baqi Olamiposi Anofi (IDD) | E6, entry 000043; E8 `actions`: KEEP | Found — E1 | E6 (E10b) | E1, E2 | Live: `active`, `pending_signature` — E2 | |
| 10 | `SHRS-CERT-IDD-2026-000044-8B125` — Faridah Ayomide Aliu (IDD) | E6, entry 000044; E8 `actions`: REVOKE ("not on the Registrar's IDD roll"; roll awards at plan seq 56 and 74) | Found — E1 | E6 (E10b) | E1, E2 | Live: `active`, `pending_signature` — E2 | |
| 11 | `SHRS-CERT-IDD-2026-000045-F546F` — Thoirah Makinde (IDD) | E6, entry 000045; E8 `actions`: KEEP | Found — E1 | E6 (E10b) | E1, E2 | Live: `active`, `pending_signature` — E2 | |
| 12 | `SHRS-CERT-IDD-2026-000046-7E37A` — Abdulbasit Amobi Jabarr (IDD) | E6, entry 000046; E8 `actions`: KEEP | Found — E1 | E6 (E10b) | E1, E2 | Live: `active`, `pending_signature` — E2 | |
| 13 | `SHRS-CERT-IDD-2026-000047-CB9F5` — Abdullah Oladimeji Anofi (IDD) | E6, entry 000047; E8 `actions`: KEEP | Found — E1 | E6 (E10b) | E1, E2 | Live: `active`, `pending_signature` — E2 | |

### 3.2 The 38 planned certificates (workbook rows 14–51)

For every row in this block the same three facts hold, each by direct evidence, not
inference: **no database record** (found among E1's 137 not-found numbers), **no sealed
register anywhere in the repository's history** (audit §4.5 — E4), and **no live record**
(the same E1 queries, answered by production itself). The sequence numbers shown are the
plan's **provisional** allocations (E8) — they are cited here as plan entries, never as
numbers presumed printed on anything.

| Row | Plan reference (provisional) | Register evidence | Database evidence | Repository evidence | Workflow evidence | Production evidence | Reconciliation notes |
|---|---|---|---|---|---|---|---|
| 14 | Plan seq 48 — Aisha Omoshalewa Anofi (QUR) | E7, QUR category; E8 `toMint` seq 48 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 15 | Plan seq 49 — Baqi Olamiposi Anofi (QUR) | E7, QUR category; E8 `toMint` seq 49 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 16 | Plan seq 50 — Sofiah Anofi (QUR) | E7, QUR category; E8 `toMint` seq 50 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 17 | Plan seq 51 — Zaynab Zakariya Anofi (QUR) | E7, QUR category; E8 `toMint` seq 51 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 18 | Plan seq 52 — Abdulbasit Adedokun (TMH) | E7, TMH category; E8 `toMint` seq 52 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 19 | Plan seq 53 — Aisha Omoshalewa Anofi (IBT; replaces 000036) | E7, IBT category; E8 `toMint` seq 53 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 20 | Plan seq 54 — Ameerah Abdulhafeez (IBT) | E7, IBT category; E8 `toMint` seq 54 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 21 | Plan seq 55 — Ashraf Korede Ojewumi (IBT; replaces 000039) | E7, IBT category; E8 `toMint` seq 55 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 22 | Plan seq 56 — Faridah Ayomide Aliu (IBT) | E7, IBT category; E8 `toMint` seq 56 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 23 | Plan seq 57 — Imran Iremide Adegoke (IBT; replaces 000040) | E7, IBT category; E8 `toMint` seq 57 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 24 | Plan seq 58 — Muhammad Ismail Seriki (IBT) | E7, IBT category; E8 `toMint` seq 58 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 25 | Plan seq 59 — Naheemah Ismail Seriki (IBT; replaces 000038) | E7, IBT category; E8 `toMint` seq 59 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 26 | Plan seq 60 — Yaseer Balogun (IDD) | E7, IDD category; E8 `toMint` seq 60 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 27 | Plan seq 61 — Aisha Lawal (PRY) | E7, PRY category; E8 `toMint` seq 61 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 28 | Plan seq 62 — Al-ameen Okoh (PRY) | E7, PRY category; E8 `toMint` seq 62 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 29 | Plan seq 63 — Ashraf Korede Ojewumi (PRY) | E7, PRY category; E8 `toMint` seq 63 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 30 | Plan seq 64 — Daud Aliu (PRY) | E7, PRY category; E8 `toMint` seq 64 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 31 | Plan seq 65 — Imran Iremide Adegoke (PRY) | E7, PRY category; E8 `toMint` seq 65 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 32 | Plan seq 66 — Naheemah Ismail Seriki (PRY) | E7, PRY category; E8 `toMint` seq 66 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 33 | Plan seq 67 — Abdulrahman Abdullah (JSS) | E7, JSS category; E8 `toMint` seq 67 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 34 | Plan seq 68 — Aisha Omoshalewa Anofi (JSS) | E7, JSS category; E8 `toMint` seq 68 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 35 | Plan seq 69 — Allison Ganiyah (JSS) | E7, JSS category; E8 `toMint` seq 69 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 36 | Plan seq 70 — Ameerah Abdulhafeez (JSS) | E7, JSS category; E8 `toMint` seq 70 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 37 | Plan seq 71 — Ameerah Durodola (JSS) | E7, JSS category; E8 `toMint` seq 71 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 38 | Plan seq 72 — Anisa Opeyemi Jokomba (JSS) | E7, JSS category; E8 `toMint` seq 72 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 39 | Plan seq 73 — Baqi Olamiposi Anofi (JSS) | E7, JSS category; E8 `toMint` seq 73 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 40 | Plan seq 74 — Faridah Ayomide Aliu (JSS) | E7, JSS category; E8 `toMint` seq 74 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 41 | Plan seq 75 — Fatimah Desire Ibrahim (JSS) | E7, JSS category; E8 `toMint` seq 75 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 42 | Plan seq 76 — Fawaz Owolabi (JSS) | E7, JSS category; E8 `toMint` seq 76 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 43 | Plan seq 77 — Hameedah Adebimpe Ojewumi (JSS) | E7, JSS category; E8 `toMint` seq 77 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 44 | Plan seq 78 — Jubril Lawal (JSS) | E7, JSS category; E8 `toMint` seq 78 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 45 | Plan seq 79 — Muhammad Ismail Seriki (JSS) | E7, JSS category; E8 `toMint` seq 79 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 46 | Plan seq 80 — Radiah Apatira (JSS) | E7, JSS category; E8 `toMint` seq 80 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 47 | Plan seq 81 — Sa'ad Sanusi (JSS) | E7, JSS category; E8 `toMint` seq 81 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 48 | Plan seq 82 — Abdulbasit Amobi Jabarr (SS) | E7, SS category; E8 `toMint` seq 82 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 49 | Plan seq 83 — Aisha Shode (SS) | E7, SS category; E8 `toMint` seq 83 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 50 | Plan seq 84 — Mazeed Hassan-Murtala (SS) | E7, SS category; E8 `toMint` seq 84 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |
| 51 | Plan seq 85 — Thoirah Makinde (SS) | E7, SS category; E8 `toMint` seq 85 | Not found — E1 | No sealed register exists — audit §4.5 (E4) | E1 | No record — E1 | |

**Notes on the planned block (context, not row notes):**

1. **Row 14 and the number-48 collision.** The plan's allocation of sequence 48 to row 14's
   QUR certificate collides with the Founder-reported physical `SHRS-CERT-JSS-000048`
   (Section 4). Plan allocations 48–85 are provisional throughout and must be renumbered
   around whatever is physically in circulation, per invariant I1 (`03-decision-tree.md` §7)
   — never the other way round.
2. **JSS rows 33–47 and the template commits.** The repository holds real, approved JSS
   **visual-template** work (E10c). This is evidence a template exists — it is **not**
   evidence that any student's document was rendered or printed from it (audit §4.7). It is
   listed here so Stage 2 does not misread its presence either way.
3. **"Repository evidence: none exists" is itself a positive finding**, not a shrug: the
   audit's §4.5 check (`git log --all --diff-filter=A` across every branch) confirmed no
   sealed register for any of these was ever created — or created and later deleted.
4. **What this table does not say.** Nothing in this block speaks to whether a physical
   document exists for any of these rows. That is exactly what Stage 1 establishes, row by
   row, in the workbook's observation columns.

---

## 4. Founder-supplied evidence

| Code | Evidence item | Standing |
|---|---|---|
| **FE-1** | **Screenshot, 15 August 2026, supplied by the Founder:** a real device querying the live public verification page for `SHRS-CERT-JSS-000048` and receiving **"No record on file for this number"** — while, per the Founder's accompanying report, the physical certificate bearing that printed number is already in a student's hands. | Recorded as **Founder-reported evidence** that at least one physical document exists **outside the plan's numbering**. The screenshot proves the live service's answer (consistent with E1: sequence 48 is among the 137 not-found numbers). The existence and whereabouts of the paper itself are the Founder's report, which this pack accepts as the trigger for Stage 1 — not as something the systems can confirm (audit §4.7). |

**What happens next with FE-1.** The physical document behind it becomes **evidence item one
of Stage 1**: the Registrar locates it, records it on the JSS row of the student it names —
[TO BE CONFIRMED BY REGISTRAR] — copies its printed number character for character, and
photographs it per the convention below. It is never recorded on row 14 merely because the
plan's allocation happens to read 48 (`02-workbook-guide.md` §6). No action of any kind is
taken on the document or the number until the full sign-off chain has been completed — the
freeze applies to it exactly as to everything else.

---

## 5. Evidence-handling rules

1. **Naming.** Every evidence photograph is named by workbook row, two digits, per
   `02-workbook-guide.md` §5: `row<NN>-front.jpg` (required for every physical certificate),
   `row<NN>-back.jpg` and `row<NN>-qr.jpg` (optional close-ups). Every filename is listed in
   that row's `supporting_evidence_ref` cell.
2. **Append-only.** This index, and the evidence set behind it, only ever grows. No item is
   removed, replaced, or edited once recorded; a correction is a **new** item that names the
   item it corrects and why. A retaken photograph keeps a new name (e.g.
   `row07-front-2.jpg`) and both are listed.
3. **Every classification cites its evidence.** At Stage 2, no row receives a
   `final_classification` or `recommended_action_code` unless **every question answered on
   its path through the decision tree cites at least one evidence item** — a code from this
   index (E1–E10, FE-1), a photograph filename, a fresh live-query reference, or an F1
   worksheet — recorded in the row's `supporting_evidence_ref` and reconciliation note. A
   row whose evidence cannot be cited is marked [TO BE CONFIRMED BY REGISTRAR] and carries
   no code.
4. **Personal data.** The photographs necessarily show children's names, and the workbook
   carries names and permanent Student IDs. This material is stored **within the school's
   existing records custody** — the same keeping as the pupil files themselves — and is
   **never** committed to the public repository, attached to a public page, or sent over any
   channel other than the transfer channel agreed with the Founder's office before Stage 1
   begins (`04-sop.md` §3): [TO BE CONFIRMED BY REGISTRAR].
5. **Read-only means read-only — established per instrument, never assumed.** Of the
   workflows cited in this index, only `certificate-presence-audit.yml` (E1) is read-only by
   construction, and `cloudflare-env-audit.yml` (E3) lists environment-variable names only.
   `certificate-verification.yml` (the instrument behind E2) is read-only **only** when
   dispatched with `run_import: false` **and** `configure_cloudflare: false` — both inputs
   **default to true**, and its Monday 06:00 UTC schedule and its push triggers run the
   import/configure steps unconditionally when the required secrets are present. Every
   freeze-period run of it must therefore be dispatched with both inputs explicitly false.
   (At the baseline the stored GitHub secrets include neither `DATABASE_URL` nor
   `DOCUMENT_HASH_SECRET`, so the mutating steps currently skip or fail closed on scheduled
   runs — but this pack must not rely on that remaining true.) Re-running a genuinely
   read-only query during the reconciliation is permitted under the freeze precisely
   because it writes nothing. Any evidence-gathering step that would create or modify a
   record is not evidence-gathering and is prohibited until authorised through the
   sign-off chain.
6. **No secret values in evidence.** No signing key, in whole or in part, ever appears in
   this index, a photograph caption, a workbook cell, or any note. The only key-related
   value that may be written down is a SHA-256 fingerprint (first 16 hex characters), as
   `24bb0f683233486a` is recorded for key v2 (`04-sop.md` §3).

---

*End of document 06. Nothing in this index performs or authorises any lifecycle action.
Every action referred to above occurs only after the full sign-off chain — Registrar →
Technical → Cryptographic → Founder — and only as specified in `07-implementation-plan.md`.*
