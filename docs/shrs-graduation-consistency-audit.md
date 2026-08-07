# Graduation 2026 — full consistency audit

**Date:** 8 August 2026 · **Revision 2** — extended after the Registrar's
Notice of 2 July 2026 was supplied.
**Scope:** the ceremony programme, the running order, and every graduation
certificate for the Class of 2026.
**Sources of truth used, in order of authority:**

1. The certificate registers — `docs/graduation-registers/*.json`. The permanent
   record. Authoritative on who graduated and how a name is spelled.
2. The certificate rolls in `scripts/issue-royal-college-batch.mjs` — the
   Founder's lists of 7 August 2026, with his rulings recorded beside them.
3. The school's own **Programme of Event** (`Programme_of_Event1.docx`, supplied
   7 August 2026). Authoritative on the running order.
4. The Registrar's **Notice of the 2026 Combined Graduation Ceremony**,
   2 July 2026 (`DOC-20260703-WA0002.pdf`). The notice sent to parents.
   Authoritative on the published time, the venue, the fees and the guest
   allocation — **and it carries a roll of graduands that does not agree with
   the certificate rolls.** See §8.

**Verdict: 6 defects found and corrected. 4 of the 6 were mine. 27 of the 40
certificates cannot be minted in this environment and are blocked on one input.**

---

## 1 · What the uploaded document actually contains

It is the **running order only** — fourteen items, a letterhead, and the
programme coordinators. **It contains no student names.** If a roll of graduands
was meant to be attached, it is not in this file.

That is not a problem for the certificates: the full roll of all forty awards is
already held in the repository, and every name reconciles (§4). It is recorded
here so nobody assumes a list was received that was not.

---

## 2 · Defects in the source document

Six, all in the times. Every item and every wording is kept; only the minutes
are resolved, because as written the sequence cannot be run.

| # | As supplied | Problem | Printed as |
|---|---|---|---|
| 1 | Introduction of the Graduands `10:10-10:30` | Runs backwards through the anthems and across the whole of the Key Guests' slot `10:15-10:30`. Two items claim the same fifteen minutes. | `10:30 – 10:45` |
| 2 | Welcome Address `10:30-11:30` | Collides with the above once it is placed. | `10:45 – 11:30` |
| 3 | Solatu Dhur `12:45 – 1: 1:20` | Malformed — two end times, one of them incomplete. | `12:45 – 13:20` |
| 4 | Donation `1:00-1:05` | Falls **inside** Ṣolātu Ẓuhr. Duration kept (5 min), placed after the prayer. | `13:35 – 13:40` |
| 5 | Light Refreshments `1:05-1:20` | Also falls inside the prayer. Duration kept (15 min). | `13:45 – 14:00` |
| 6 | Royal Students Presentation, Goodwill message | No time given at all. | `13:20 – 13:35` and `13:40 – 13:45` |

Read literally, the supplied document has **five things happening during the
Ẓuhr prayer**. That is the single most consequential thing in it, and it is why
the tail had to be resolved rather than transcribed.

**Two wordings are normalised and nothing else is.** "Lecture! Lecture!!
Lecture!!!" prints as **Lecture**; "Solatu Dhur" prints as **Ṣolātu Ẓuhr**
beside the Arabic صلاة الظهر. Both are one-line reversions in
`scripts/build-graduation-programme.mjs` if the Founder prefers his own forms.

**The ceremony ends at 2:00 p.m.** on these resolutions. The last time the
source states is 1:20 p.m.; the earlier trifold said 3 p.m. All three numbers
now have a stated basis, and the printed one is the only one that fits the
items the school listed.

---

## 3 · Defects in my own earlier work — all corrected

Four. Two were reordering, one was an invention, one was a single byte that
would have reached a permanent record.

### 3.1 · The running order was resequenced while claiming not to be

The programme's own source comment said the items were "in his sequence". They
were not. Two pairs had been swapped:

- **Introduction of Key Guests / Introduction of the Graduands** — the school
  lists Key Guests first. I printed the Graduands first.
- **Donation / Goodwill Message** — the school lists Donation first. I printed
  the Goodwill Message first.

Both restored to the document's order. This was the worse of the two kinds of
error in this audit, because the comment asserted a fidelity the code did not
have — a later reader would have trusted it.

### 3.2 · An item was printed that appears in no school document

`Arrival and Seating of Guests · 10:00 – 10:05` was introduced by my commit
`8638e2a` and has no source. **Removed.** The ceremony now begins at 10:05, as
the school wrote it.

### 3.3 · One name differed from its certificate by one character

This is the serious one, and it is the reason this audit was worth running
before the batches were minted rather than after.

| | Spelling | Codepoint |
|---|---|---|
| Ceremony programme | `Sa’ad Sanusi` | U+2019 right single quotation mark |
| Junior Secondary certificate roll | `Sa'ad Sanusi` | U+0027 apostrophe |

The printed name is one of the fields hashed into the certificate serial
(`certificateHashFields` → `studentFullName`). Two spellings therefore produce
**two different certificate numbers and two different verification codes** for
the same child, and the Registrar's name matching is exact-string.

Resolved in favour of the certificate roll, per the standing rule that the
permanent record outranks the ephemeral one: the programme now prints
`Sa'ad Sanusi` with U+0027, byte for byte identical to what will be engraved.

**This is a live decision, and now is the last free moment to make it.** The
Junior Secondary batch has not been minted. If the Founder wants the
typographic apostrophe on the certificate instead, say so *before* the batch is
run and it costs one line. Afterwards it costs a re-mint, because the engraved
number changes with the name.

### 3.4 · The domain note was imprecise

The school's own letterhead, on this very document, reads
`https://shroyalschools.ng`. Every verification URL, every QR in the registers,
and the live site are `.com`. A guest who types the `.ng` reaches nothing. The
`.com` prints; the source comment now cites the letterhead it disagrees with
rather than describing it vaguely. **Still awaiting the Founder's ruling.**

---

## 4 · Certificate coverage — all forty reconcile

A new preflight, `scripts/preflight-graduation-coverage.mjs`, runs every gate the
issuance pipeline runs except the signing, and can be run at any time. It writes
nothing and signs nothing.

```
CODE   PROGRAMME                        PRINTED  CERTIFICATE  STATE
QUR    Ḥifẓ of the Glorious Qur’an            3            3  AWAITING KEY
IBT    Ibtidā’iyyah                           7            7  ISSUED
IDD    I‘dādiyyah                             6            6  ISSUED
PRY    Primary School Graduation              7            7  AWAITING KEY
JSS    Junior Secondary School Graduation    13           13  AWAITING KEY
SS     Senior Secondary School Graduation     4            4  AWAITING KEY
                                             40
```

- **40 awards across 34 distinct graduands.** Six students hold two awards —
  an Islamic-stage certificate and a secular one in the same year — and each
  is named under both, as the programme says.
- **Certificate sequence 35–74, contiguous, forty numbers, no overlap.** The
  sequence is global: one number is issued once, ever, across every stage and
  every year.
- **New Student ID spans:** JSS 48–55, SS 56–57, PRY 58–64, QUR 65–66. No
  collisions.
- **8 Student ID carry-overs**, every one resolving against a published
  register, and every short-form match carrying a Founder's ruling by date.
- **2 Arabic names** on the outstanding rolls, each traced to a written ruling.
  No name is transliterated, generated or guessed anywhere in this pipeline.
- Every Qur'an College entry names its award variant, so a Ten Juz' sheet can
  never print under "Certificate of Completion".

**Preflight result: PASSED**, after the `Sa'ad Sanusi` correction. It failed on
exactly that one name before it, which is what it was written to catch.

---

## 5 · Why 27 certificates cannot be minted here

`scripts/issue-royal-college-batch.mjs` refuses to run without
`DOCUMENT_HASH_SECRET`. That refusal is correct and must not be worked around.

The five characters engraved on a certificate face are the head of an HMAC over
that certificate's own fields, keyed by that secret. It is what makes the
printed number self-checking: a forger can invent a plausible sequence number
but cannot compute a tail that matches it. **A batch minted under any other key
produces certificates that fail public verification** — and this repository has
already been through that once, when six real certificates came to be signed by
a development literal simply because a run succeeded without anyone choosing.

The key lives in the Cloudflare environment and the Board's credential store,
not in this repository (`docs/certificate-key-deployment.md`). It is not present
in this environment. **I did not, and will not, mint a batch with a substitute
key — not even to a scratch directory.**

### To complete the roll-out

Run these four, in this order, on a machine holding the production key. The
sequence is global and each batch reads the one before it:

```
DOCUMENT_HASH_SECRET=… DOCUMENT_HASH_KEY_VERSION=2 SHRS_BATCH=JSS \
  node scripts/issue-royal-college-batch.mjs
DOCUMENT_HASH_SECRET=… DOCUMENT_HASH_KEY_VERSION=2 SHRS_BATCH=SS  \
  node scripts/issue-royal-college-batch.mjs
DOCUMENT_HASH_SECRET=… DOCUMENT_HASH_KEY_VERSION=2 SHRS_BATCH=PRY \
  node scripts/issue-royal-college-batch.mjs
DOCUMENT_HASH_SECRET=… DOCUMENT_HASH_KEY_VERSION=2 SHRS_BATCH=QUR \
  node scripts/issue-royal-college-batch.mjs
```

Then, per batch, the press artefacts:

```
node scripts/render-royal-college-batch.mjs dist/certificates/<batch-dir> --dpi 600
```

Each run writes one HTML sheet per student, the combined print file, the
register in JSON and Markdown, and the SQL to seed the Registrar's tables. The
pipeline's own gates — global sequence, cross-register Student ID uniqueness,
residue-name detection against the rendered HTML — all run before anything is
written.

**Nothing about the certificate design changes.** The Version 1.0 layout, the
numbering algorithm, the verification logic and the document identifiers are
untouched by this audit, as they must be. No grade appears on any certificate or
on any public verification response.

---

## 6 · Open rulings

Four, none of which blocks the ceremony programme, two of which should be
settled before the four batches are minted.

| | Question | Cost of deciding late |
|---|---|---|
| 1 | **`Sa'ad Sanusi`** — U+0027 as on the certificate roll, or U+2019 as the programme had it? | **High.** After minting, changing it means re-minting: the name is hashed into the engraved number. |
| 2 | **`shroyalschools.ng` or `.com`?** The letterhead says `.ng`; everything that must resolve says `.com`. | **High.** Every certificate QR and verification URL carries it. |
| 3 | **"Lecture" or "Lecture! Lecture!! Lecture!!!"**, and **"Ṣolātu Ẓuhr" or "Solatu Dhur"**? | Low. Programme only, one line each. |
| 4 | **Closing time** — 1:20 p.m. (last stated), 2:00 p.m. (printed, from the items listed), or 3 p.m. (earlier trifold)? | Low. Programme only. |

An earlier open item is now closed: the roll-count and spelling differences
between the old trifold and the registers. The registers and the Founder's own
certificate rolls agree with each other on all forty awards, and the programme
now follows them exactly.

---

## 7 · What was verified, and how

- Programme of Event unpacked and read in full from `word/document.xml`; no
  tables, no second document part, no student list present.
- All fourteen running-order items diffed against the printed programme by hand.
- All forty graduand names diffed by script between the programme, the published
  registers and the Founder's certificate rolls — exact string comparison,
  which is what caught the apostrophe.
- Certificate sequence, Student ID spans, carry-overs, Arabic-name provenance
  and Qur'an award variants checked by `scripts/preflight-graduation-coverage.mjs`.
- Both editions of the programme rebuilt, all four sides rendered and rastered
  at 192 DPI, and the corrected order panel read.
- Cross-edition diff between the press PDF and `word/document.xml` re-run: every
  graduand, guest and running-order item present in both.

---

# REVISION 2 — the Registrar's Notice of 2 July 2026

## 8 · Two official rolls of the same ceremony, and they disagree

This is the most serious finding in the whole audit, and it is not a defect in
anything I built. **The institution holds two official rolls of the Class of
2026 and they name different children.**

| | Registrar's Notice, 2 July | Certificate rolls, 6–7 August |
|---|---|---|
| Categories | **seven** (adds *Islamiyyah (Tamyidi)*) | six |
| Awards | **45** | 40 |
| Distinct names | 35 | 34 |

```

  REGISTRAR’S NOTICE, 2 JULY 2026        vs        THE ROLLS OF 6–7 AUGUST 2026
  ────────────────────────────────────────────────────────────────────────────
  COLUMN                  → PROG   JUL   AUG   STATE
  Basic 5                → PRY      6     7   DIFFERENT PEOPLE
  JSS 3                  → JSS     15    13   DIFFERENT PEOPLE
  SSS 3                  → SS       4     4   same people, spellings differ
  Quran college          → QUR      4     3   DIFFERENT PEOPLE
  Islamiyyah (Tamyidi)   → —        2     0   NO SUCH CERTIFICATE PROGRAMME
  Ibtidaiyah             → IBT      9     7   DIFFERENT PEOPLE
  Idadiyah               → IDD      5     6   DIFFERENT PEOPLE
                                   45    40

  ── ON THE REGISTRAR’S ROLL, ON NO CERTIFICATE ROLL ─────────────────────────
     Each of these is a child who would receive NO certificate for that award.
     Basic 5                Naheemah Ismail
     JSS 3                  Allison Ganiyah
     JSS 3                  Anisa Jokumba
     JSS 3                  Fareedah Aliu
     JSS 3                  Fateemah Ibrahim
     JSS 3                  Jubril Lawal
     JSS 3                  Muhammad Ismail
     Quran college          Sofiah Anofi
     Quran college          Zainab Anofi
     Islamiyyah (Tamyidi)   Abdulbasit Adedokun
     Islamiyyah (Tamyidi)   Muhammad fatih
     Ibtidaiyah             Ameerah Abdulhafeez
     Ibtidaiyah             Ashrof Ojewumi
     Ibtidaiyah             Fareedah Aliu
     Ibtidaiyah             Muhammad Ismail
     Ibtidaiyah             Naheemah Ismaeel
     Idadiyah               Balogun Yaseer
     Idadiyah               Basit Jabarr

  ── ON A CERTIFICATE ROLL, ON NO REGISTRAR COLUMN ───────────────────────────
     Each of these is an award the Registrar’s notice does not record.
     Basic 5                Naheemah Ismai Seriki
     Basic 5                Al-ameen Abidemi Jokomba
     JSS 3                  Muhammad Ismail Seriki
     JSS 3                  Fatimah Desire Ibrahim
     JSS 3                  Faridah Aliu
     JSS 3                  Anisa Opeyemi Jokomba
     Quran college          Zaynab Zakariya Anofi
     Ibtidaiyah             Abdulbasit Adedokun  ← ALREADY MINTED AND PUBLISHED
     Ibtidaiyah             Naheemah Ismail  ← ALREADY MINTED AND PUBLISHED
     Ibtidaiyah             Ashrof Akorede  ← ALREADY MINTED AND PUBLISHED
     Idadiyah               Muhammad Ismail Seriki  ← ALREADY MINTED AND PUBLISHED
     Idadiyah               Faridah Ayomide Aliu  ← ALREADY MINTED AND PUBLISHED
     Idadiyah               Abdulbasit Amobi Jabarr  ← ALREADY MINTED AND PUBLISHED

  ── SAME PERSON, DIFFERENT SPELLING ─────────────────────────────────────────
     The certificate spelling is engraved and hashed into its number.
     PRY   Registrar: Ashraf Ojewumi             Certificate: Ashraf Korede Ojewumi
     PRY   Registrar: Imran Adegoke              Certificate: Imran Iremide Adegoke
     JSS   Registrar: Hameedah Ojewumi           Certificate: Hameedah Adebimpe Ojewumi
     SS    Registrar: Abdulbasit Jabarr          Certificate: Abdulbasit Amobi Jabarr
     QUR   Registrar: Aisha Anofi                Certificate: Aisha Omoshalewa Anofi
     QUR   Registrar: Baqi Anofi                 Certificate: Baqi Olamiposi Anofi
     IBT   Registrar: Hameedah Ojewumi           Certificate: Hameedah Adebimpe Ojewumi  [MINTED]
     IDD   Registrar: Abdullah Anofi             Certificate: Abdullah Oladimeji Anofi  [MINTED]
     IDD   Registrar: Baqi Anofi                 Certificate: Baqi Olamiposi Anofi  [MINTED]

  ── POSSIBLY THE SAME CHILD UNDER TWO FAMILY NAMES ──────────────────────────
     Given name matches; family name does not. Not resolved here — but if any
     of these IS one child, a permanent record carries the wrong name.
     PRY   Registrar: Naheemah Ismail          Certificate: Naheemah Ismai Seriki
     JSS   Registrar: Anisa Jokumba            Certificate: Anisa Opeyemi Jokomba
     JSS   Registrar: Muhammad Ismail          Certificate: Muhammad Ismail Seriki
     IBT   Registrar: Ashrof Ojewumi           Certificate: Ashrof Akorede  ← ONE OF THESE IS ALREADY MINTED
     IBT   Registrar: Naheemah Ismaeel         Certificate: Naheemah Ismail  ← ONE OF THESE IS ALREADY MINTED

  Registrar’s notice: 45 awards · 35 distinct names · 35 distinct children if short forms are merged.
  Certificate rolls:  40 awards · 34 distinct names · 30 distinct children if short forms are merged.
  The certificate system mints one permanent Student ID per DISTINCT NAME.

  THIS SCRIPT RESOLVES NOTHING. Both documents are official. The later one
  carries the Founder’s written rulings and has already been minted for two
  stages; the earlier one is the notice the parents were sent. Which governs
  is a ruling for the Founder and the Registrar, and it must be made before
  the four outstanding batches are signed.
```

### What each difference would cost

- **18 children are on the Registrar's roll and on no certificate roll.** If
  the July notice is right, each of them attends their own graduation and
  receives nothing.
- **13 awards are on a certificate roll and on no Registrar column** — and
  **six of those are already minted and published** (Ibtidā'iyyah and
  I'dādiyyah). If the July notice is right, six certificates have already been
  issued that should not have been, and they would have to be revoked and
  re-issued.
- **There is no Tamyīdī certificate anywhere in this institution's system.**
  The Registrar names two children under *Islamiyyah (Tamyidi)*; no such award
  exists in `PROGRAMMES` or `RC_PROGRAMMES`, no wording has ever been approved
  for it, and no serial range is reserved. If those two are to receive
  certificates, an award has to be created and worded first — that is a
  Founder's decision about what the institution confers, not a template edit.
- **Two children may be carrying the wrong family name on a permanent record.**
  The Ibtidā'iyyah batch is minted. It engraves **Ashrof Akorede**; the
  Registrar's roll for the same stage says **Ashrof Ojewumi**, and the Primary
  roll says **Ashraf Korede Ojewumi**. If these are one child, a certificate
  already in existence carries his middle name where his family name belongs.
  The same pattern applies to **Naheemah Ismail / Naheemah Ismaeel /
  Naheemah Ismai Seriki**.

### What I did about it

Nothing to the rolls. **I changed no name, added no child and removed none.**
Choosing between two official documents about who graduated is not a decision
this pipeline may make: guessing wrong either denies a child a certificate at
their own graduation, or confers an award on a child who did not earn it.

What I built instead is `scripts/reconcile-registrar-roll.mjs`, which
transcribes the Registrar's roll verbatim, diffs it against the certificate
rolls, and prints every difference with its consequence. It resolves nothing
and can be re-run after any ruling.

**This blocks the four outstanding batches.** Minting JSS, SS, PRY and QUR now
would mint the August set, and if the July set governs, 27 certificates would be
wrong on the day they were handed out.

---

## 9 · Three more of my errors, corrected — all evidenced by the notice

### 9.1 · The venue was wrong

The notice says **"Venue: School Hall"**, and again in prose: *"The ceremony
will be held in the school hall."* Both editions printed **School Grounds**,
which appears in no school document. Corrected to **School Hall** on the face
and on the Lecture panel.

### 9.2 · The published time was wrong

The notice publishes the ceremony to parents as **10:00 a.m. – 3:00 p.m.** The
face printed 10:00 a.m. – 2:00 p.m., computed from the last item in the running
order. Both facts are true and both now print: **the window on the face
(10:00 – 3:00, as parents were told), the items on the order panel (10:05 to
2:00, as the school scheduled them).** This closes the open question about the
closing time — 3 p.m. was never wrong; it is the hall booking, not the last item.

### 9.3 · The school's own motto was displaced

The letterhead carries **"Motto: Learning Today, Leading Tomorrow."** The back
panel printed the ceremony tagline in the position a reader takes the motto to
be, so the publication misrepresented the institution to itself. The back panel
now carries the real motto; the ceremony tagline stays on the face, where it
belongs.

---

## 10 · One open question closed, one new one opened

**Closed — the apostrophe.** Both official documents write **`Sa'ad Sanusi`**
with U+0027. The Registrar's notice and the Founder's roll agree, and the
programme now matches both. Nothing further is needed.

**New — the telephone number.** Two official school documents give two
different numbers:

| Document | Number |
|---|---|
| Programme of Event, 7 August | `+234 (0) 807 374 7650` |
| Registrar's Notice, 2 July | `+234 802 456 7452` |

The programme prints the first, from the more recent document. **Which is the
school's line?** It appears on the back panel of four hundred programmes.

**Still open — the domain.** Both letterheads read `shroyalschools.ng`. Every
QR, every verification URL and the live site are `.com`. Now confirmed twice
from the school's own stationery, and still unruled.

---

## 11 · Revised standing of the roll-out

| | |
|---|---|
| Certificates issued and published | **13** (Ibtidā'iyyah 7, I'dādiyyah 6) — **six of them contested by the July roll** |
| Certificates prepared, not minted | **27** (JSS 13, PRY 7, SS 4, QUR 3) |
| Blocked on the signing key | all 27 |
| **Blocked on a ruling about who is on the roll** | **all 27, and possibly 6 already issued** |
| Children on the July roll with no award defined at all | **2** (Tamyīdī) |

The key alone is no longer the only blocker. Even with the key in hand, minting
now would commit the August roll permanently. **The roll must be ruled on
first.**
