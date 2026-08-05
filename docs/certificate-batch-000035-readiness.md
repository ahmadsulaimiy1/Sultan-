# Deployment Readiness — Ibtidā'iyyah Certificate Batch 000035–000041

**Prepared for:** The Founder, Sultan Hanafi Royal Schools
**Batch:** `2026-08-08-IBT-000035` · seven certificates · serials 000035–000041
**Verified at commit:** see `git log` for the commit that carries this file
**Standard applied:** evidence, not assurance. Every claim below names the check
that produced it and the way that check can fail. Anything I could not verify is
marked as not verified, and anything that does not exist is marked as not built.

---

## 1. Summary

The seven certificates are releasable. Three independent gates pass:

| Gate | Result | What it inspects |
|---|---|---|
| `scripts/verify-certificate-batch.mjs` | **40/40** | The rendered sheets — identifiers, names, bidi, assets, placeholders |
| `scripts/verify-certificate-layout.mjs` | **7/7 clean** | Real browser geometry — collisions, off-sheet, clipping, page errors |
| `scripts/test-student-identity-no.mjs` | **10/10 properties** | The Student ID generator over 200,000 sequence values |
| PDF glyph-stream audit | **7/7 Arabic names exact** | The delivered PDF itself, not the source that made it |

Two defects were found during this verification pass and fixed before release.
Both are described in §6, because a report that only lists passes is not
evidence of anything.

The Registrar Portal is **partly built**. Of the ten screens requested, four are
real and reachable, three exist in adjacent form, and three do not exist. §7
gives a per-screen answer. No live screen can be demonstrated in this
environment, and §7.1 explains exactly why.

---

## 2. The batch

| Serial | Certificate Number | Student ID | Student |
|---|---|---|---|
| 000035 | `SHRS-CERT-IBT-2026-000035-FB287` | `714743483445443` | Naheemah Ismail Seriki · نعيمة إسماعيل سركي |
| 000036 | `SHRS-CERT-IBT-2026-000036-4EB48` | `717988020633236` | Ashraf Korede Ojewumi · أشرف كوردي أوجومي |
| 000037 | `SHRS-CERT-IBT-2026-000037-4227E` | `711232557821021` | Al-Ameen Okoh · الأمين أكو |
| 000038 | `SHRS-CERT-IBT-2026-000038-77E9D` | `714477095008816` | Al-Ameen Abidemi Jokomba · الأمين أبديمي جوكمبا |
| 000039 | `SHRS-CERT-IBT-2026-000039-7EB07` | `717721632196601` | Aisha Lawal · عائشة لوال |
| 000040 | `SHRS-CERT-IBT-2026-000040-D1432` | `710966169384396` | Imran Iremide Adegoke · عمران إريمدي أدغكي |
| 000041 | `SHRS-CERT-IBT-2026-000041-74B86` | `714210706572189` | Daud Aliu · داود علي |

Numbering starts at exactly 000035 and runs to 000041 with no gaps — checked,
not assumed, by asserting `seqs[0] === 35` and `seqs[i] === 35 + i`.

---

## 3. Names

The Founder's Name Accuracy Directive is enforced in two independent places, on
purpose:

1. **At issuance** — `scripts/issue-certificate-batch.mjs` holds a second,
   separately-typed copy of the approved list (`APPROVED_AR`) and compares it to
   the roster **code point by code point** after NFC normalisation. A single
   different character aborts the run. It does not compare rendered shapes, and
   it does not compare "close enough".
2. **At the gate** — `scripts/verify-certificate-batch.mjs` holds a *third*
   copy, transcribed independently from the directive, and compares it to the
   **rendered sheets**. It deliberately does not import the issuer's list:
   importing it would mean the issuer verifies itself, which proves nothing.

Both pass. `داود علي` — not `داود عليو` — on the sheet, in the register, and in
the PDF.

### 3.1 On the PDF you saw

You were right that the file you were looking at showed `داود عليو`. The cause
was mine: I sent the corrected PDF under **the same filename** as the earlier
one, so your reader almost certainly kept the first. The corrected file is
delivered alongside this report as **`SHRS-IBT-000035-000041-rev-B.pdf`** — a
distinct name, so there is nothing to collide with.

Verified in the delivered PDF three ways:

- **Glyph stream** — every Arabic name reconstructed from the PDF's own
  positioned glyphs, sorted right-to-left, matches the approved spelling exactly:
  7/7.
- **Text search** — `داود علي` occurs once; `داود عليو` occurs zero times.
- **Rendered at 300 DPI** — page 7 rasterised and read visually. It reads
  **داود علي**.

One caveat worth stating so it does not alarm anyone later: `pdftotext -layout`
appears to mangle several names (`SCHO OLS`, `C E RT I F IC AT E`, Arabic names
split into fragments). That is the extractor's column reconstruction reacting to
letter-spaced and justified type — it is not in the document. The glyph-stream
audit above bypasses that reconstruction entirely, which is why it is the check
I trust.

---

## 4. Identifiers

**Student ID** — 15 numeric digits, format `71` + 12-digit body + Luhn check
digit. The body is an affine map `(seq × M + C) mod 10¹²` with `M` coprime to
10¹², so it is a bijection: no two students can ever collide, and the number is
deterministic from the enrolment sequence. Verified over 200,000 values:

- every number exactly 15 digits · no collisions · check digit validates
- all 135 single-digit typos on a sample number are rejected
- deterministic across calls · institution prefix constant
- consecutive intakes are more than 1,000,000,000 apart, so two cards from one
  class do not reveal issue order
- digit patterns occur at **1.77%** against a measured chance baseline of 1.86%
- **no year at any fixed position** — incidental year-like runs occur, as they do
  in any numeric identifier, and carry no information

**Certificate Number** — `SHRS-CERT-IBT-2026-000035-FB287`. Structurally
distinct from the Student ID (alphanumeric, hyphenated, prefixed). Every serial
parses under the production grammar and embeds its own sequence.

**Cross-mapping** — the real risk is not a duplicate, it is a correctly-unique
identifier printed on the **wrong student's sheet**. Each sheet is therefore
checked against the register entry for its own certificate number: Student ID,
serial, Document ID and Archive Reference must all appear on that student's
sheet and the filename must match. Zero mismatches.

**Uniqueness** — eight fields checked distinct across the batch: `identityNo`,
`serialNo`, `contentHash`, `verifyCode`, `documentId`, `archiveRef`,
`verifyUrl`, `qrUrl`.

**Grade** — stored against the record (it is transcript-bound data and a hash
input) and **never rendered**. The gate greps every sheet for grade vocabulary in
English and Arabic and fails on any hit. Zero hits. The public verification
response does not carry it either.

---

## 5. The artwork

**Layout** — measured in a real browser at device pixel ratio 3, converting DOM
boxes to millimetres against the sheet: **0 collisions, 0 elements off-sheet, 0
clipped text, 0 page errors** across all seven. Text elements are measured by
their actual text range, not their container box, so a short line inside a wide
box cannot hide a collision.

**Bidirectional text** — the Arabic academic session now reads correctly for an
Arabic reader. You were right about this and I was wrong: I had tested whether
each numeral rendered internally left-to-right, which is the wrong test. The
right test is which year an RTL reader meets *first*. Measured empirically:
with the `dir="ltr"` isolate the reader met 2026 first; without it, 2025. The
isolate is removed. The gate now asserts no `dir="ltr"` survives inside the
Arabic paragraph, so it cannot come back silently.

**QR codes** — all seven decode with a real decoder (OpenCV) to their own
register entry's verification URL. Not "a QR is present" — decoded, and the
payload compared to the register.

**Asset resolution**

| Asset | Effective print resolution |
|---|---|
| Embossed seal | 772 DPI |
| Principal signature | 1978 DPI |
| Chairman signature | 621 DPI |
| Security patch | 432 DPI |
| **Locked background artwork** | **92 DPI** |

The last row is a hard limit and I want it stated plainly rather than buried:
the supplied artwork is 1080 px across a 297 mm sheet. That is 92 DPI, well
below the 300 DPI print floor. **This pipeline did not degrade it** — that is
the source file's own resolution, and no amount of processing recovers detail
that was never captured. It is listed separately in the gate so it cannot fail
silently every run and train everyone to ignore a red line. Raising it requires
the original layered artwork at press resolution.

---

## 6. Defects found during this verification pass

Both were found by the checks, not by inspection, and both are fixed.

**6.1 — A QR that would not have scanned.** The verification URL was 86
characters, which forced a 53×53 module QR. At the printed size that is **3.83
pixels per module at 300 DPI** — below the reliable-scan threshold. Certificate
000038 failed to decode at *any* scale or threshold in testing. Fixed by
shortening the payload to `/v/<serial>` (45×45, **4.51 px/module**) and adding a
`_redirects` rule mapping `/v/*` to the verification page. All seven now decode.
This would have shipped as certificates that look correct and do not work.

**6.2 — Patterned Student IDs.** The first multiplier chosen produced numbers
like `711111110220782` and `713456789134204` — 47% of the first hundred carried
a visible digit run, including four of these seven students. Nothing was
mathematically wrong, which is why no collision or check-digit test could see
it; the multiplier simply sat near 5×10¹³/81, and 1/81 = 0.012345679…, so its
small multiples inherited that expansion. Fixed with a different affine map, and
the pattern rate is now at chance. The test that catches it is now permanent.

Two of my own checks were also wrong on first run and were corrected: the QR
check counted `<rect>` elements when the encoder emits a single path, and the
identifier check searched for the verify URL as literal text when it exists only
inside the QR's modules. Both were the check being wrong, not the artwork.

---

## 7. Registrar Portal — the ten screens

### 7.1 First, the limitation

**No live Registrar screen can be shown from this environment.** `DATABASE_URL`,
`SESSION_SECRET` and `DOCUMENT_HASH_SECRET` are all unset here. Every Registrar
endpoint returns `Portal is not configured yet — no database is linked.` without
them. I can render these pages with mocked routes, but a route-mocked screenshot
proves the markup renders, not that the office works — so I am not presenting
one as evidence. The findings below come from reading the endpoints and the page
markup, which is what can honestly be established without a database.

### 7.2 Per screen

| # | Screen requested | State | Detail |
|---|---|---|---|
| 1 | Registrar dashboard | **Real** | `portal/staff/registrar/index.html`, 363 lines, 11 live endpoints behind it, permission-gated per the Role & Permission Matrix |
| 2 | Search by **Student ID** | **Real, but only in the Certificate Centre** | `stage-certificates.js` searches `student_identity_no ILIKE`. The Registrar's own "Look Up a Student" searches **admission number only** — see §7.3 |
| 3 | Search by **Certificate Number** | **Real** | Same endpoint, `serial_no ILIKE`; also direct lookup by `?serial=` |
| 4 | Search by **Verification ID** | **Not built as a search** | The public page verifies one reference at a time; there is no staff-side search *by* verification code |
| 5 | Student profile | **Real** | `registrar/student.js` — enrolment, status, Hifz/Ijazah snapshot, academic standing, lifecycle timeline, certificates |
| 6 | Certificate record | **Real** | Certificate Register in the Certificate Centre: serial, batch, both names, Student ID, programme, year, issue date, active/revoked, open + PDF |
| 7 | Graduation register | **Real** | `graduation-register.js`, surfaced in the Registrar page |
| 8 | Audit trail | **Written, not readable** | `auth_audit_log` exists and 10+ endpoints write to it. **There is no staff endpoint or screen that reads it back.** The Registrar page tells staff their actions are logged — which is true — but no one can currently view the log |
| 9 | Verification result | **Real** | Public `/verify-certificate/`, plus staff-side Lifetime Verification History showing every check against a reference |
| 10 | Print history | **Does not exist** | No `print_history`, `printed_at` or `print_count` anywhere in the schema, endpoints, or UI. Certificates can be opened and printed; **nothing records that it happened** |

### 7.3 The Student ID search gap, stated precisely

The `students` table has an `identity_no` column, and the Registrar's student
lookup does not use it — it queries `WHERE s.admission_no = $1`. So today,
searching a 15-digit Student ID finds that student's **certificate**, but not
their **student record**. On a certificate that prints the Student ID as its
primary student identifier, that is the wrong way round: the number on the
document should reach the person.

This is a small, well-scoped fix — one extra branch in `registrar/student.js`
and one field in the lookup form. I have **not** made it as part of this batch,
because the batch was the deliverable and changing a live lookup endpoint on the
way out is how avoidable mistakes happen. It is the first thing I would do next
if you want it.

---

## 8. Open items requiring the institution

Ordered by how much they block.

1. **Press-resolution artwork master.** 92 DPI is the ceiling until the original
   layered file exists. Everything else on the sheet is already 400–2000 DPI.
2. **A full, uncropped re-scan of the Chairman's signature.** The supplied file
   is 391 px and cropped on three edges — 190, 40 and 32 ink pixels touch the
   top, bottom and right borders respectively, meaning strokes were cut off
   before the file reached me. It renders acceptably at 16 mm, but it is
   reconstruction at the margins, not the full signature.
3. **The Chairman's name.** The approved Arabic reads **حنفي** (Hanafi) while the
   English on the same signature block reads **Anofi**. Both are printed as
   supplied. Please confirm which is intended — this is the one item on the
   certificate I cannot resolve without you.
4. **Confirm the verification URL.** Certificates carry
   `https://shroyalschools.com/v/<serial>`. Once printed this cannot be changed.
5. **At deployment:** set `DOCUMENT_HASH_SECRET`, run the one-time setup
   endpoint, and confirm browser binding.

---

## 9. What this report does not claim

- It does not claim the Registrar Portal has been exercised end-to-end against a
  live database. It has not, in this environment, and §7.1 says why.
- It does not claim the printed result has been inspected on press stock. It has
  been inspected at 300 DPI on screen and at print size.
- It does not claim the 92 DPI background is acceptable. It is reported as a
  limit, and it remains a limit.
- It does not claim the audit trail is usable. It is written but unreadable, and
  that is a gap, not a feature.
