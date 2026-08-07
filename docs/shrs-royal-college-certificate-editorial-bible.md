# SHRS Royal College Certificate — Editorial Bible

**Sultan Hanafi Royal College — Junior Secondary Graduation Certificate**
**Certificate System v2.3 · programme code `JSS` · English only**

This is the internal standard for the Royal College graduation certificate. It
is the companion to `docs/shrs-certificate-editorial-bible.md`, which governs
the Islamic-stage certificates (IBT, IDD) frozen at v1.0. Where the two differ,
the difference is deliberate and the reason is stated here.

Its purpose is to make the certificate reproducible **without relying on
institutional memory**: anyone holding this document and the repository can
reissue the sheet, defend every word on it, and know what may not be changed.

---

## 1. What this document is, and what it is not

The Royal College certificate attests that a named student **completed the
three-year Junior Secondary School programme** at Sultan Hanafi Royal College
and is graduated to Senior Secondary.

It is **not** a Basic Education Certificate. In Nigeria the BEC is a national
award made on the Basic Education Certificate Examination by the state
examination board — not by a school. A school certificate that borrowed the
name would be claiming an authority the institution does not hold, and the
first person to notice would be an admissions officer at the receiving school.
The award line therefore reads:

> **Junior Secondary School Graduation Certificate**

This wording is load-bearing. `scripts/verify-royal-college-certificate.mjs`
fails the batch if the phrase "Basic Education Certificate" appears anywhere on
a rendered sheet.

## 2. What never appears on the face

| Never printed | Why |
|---|---|
| A grade, class, division or mark | The certificate attests **completion**, not performance. The grade exists in the record and is bound into the content hash, but a certificate that ranks its holders becomes a document people hide. Transcripts carry results; certificates do not. |
| A founding date ("EST. 1448 A.H. / 2025 C.E.") | The supplied artwork carried both. No founding date is established anywhere in the institution's own record. An unverifiable claim engraved on a credential is worse than a blank space. |
| Arabic | Founder directive, 2026-08-06: *"English, not Arabic."* Royal College delivers the Nigerian National Curriculum; the Islamic-stage certificates are the bilingual ones. |
| Any subject list or teacher name | Two different, unreconciled Royal College subject rosters are on record (`docs/master-academic-structure-register.md` §4a and §4a-bis). Nothing unreconciled goes on a printed credential. |
| A photograph of the student | Not held under any consent that covers printing on a transferable document. |

## 3. The words on the face, and where each comes from

| On the sheet | Source | May it change? |
|---|---|---|
| `Federal Republic of Nigeria · Lagos State` | The two arms above it | No |
| `SULTAN HANAFI ROYAL SCHOOLS` | Registered institutional name | No |
| `SULTAN HANAFI ROYAL COLLEGE` | Official school name (`pages/about-governance.html`) | No |
| `Ikorodu, Lagos, Nigeria` | `stage_certificates.place_en` | Per certificate |
| `CERTIFICATE OF GRADUATION` | `RC_PROGRAMMES.JSS.title` | No — see §1 |
| `Junior Secondary School · JSS 1 – JSS 3` | Real programme structure (`docs/master-academic-structure-register.md` §3) | No |
| Student name | The Founder's roll, **verbatim** | Per certificate; never expanded, abbreviated or corrected |
| Student Identity Number | `students.identity_no`, permanent | Per person — see §5 |
| Citation paragraph | `RC_PROGRAMMES.JSS.stageEn` / `.progressesTo` | No |
| Academic session, date, place | The certificate's own row | Per certificate |
| Signatory names and titles | `pages/about-governance.html` | Only when the office changes hands |
| Every identifier in the foot | Derived from the row — see §4 | Per certificate |

## 4. The identifiers, and what each is for

Six identifiers appear on one sheet. They are not redundant; each answers a
different question, and every one of them is derived — none is typed in.

| Identifier | Example | Derived from |
|---|---|---|
| **Certificate number** (printed) | `SHRS-CERT-JSS-000051` | The global sequence, year and suffix dropped |
| **Full serial** (stored, in the QR and the microtext) | `SHRS-CERT-JSS-2026-000051-A82A3` | Sequence + HMAC head |
| **Student Identity Number** | `717988020633236` | `students.identity_no`, permanent |
| **Document ID** | `DID-2026-JSS-0000051` | Year + programme + record id |
| **Verification code** | `A82A-3E40-132C` | First 12 hex of the content hash |
| **Archive reference / barcode** | `ARCH/JSS/2026/000051` · `2026000051` | Year + 6-digit run |

The printed certificate number drops the year and the five-character
anti-forgery tail, so the document reads as timeless. That is safe **only**
because `stage_certificate_serial_seq` is one global sequence: number 000051 is
issued exactly once, ever, across every year and every programme. If that
sequence is ever re-scoped per year or per school, the short form becomes
ambiguous and this decision must be revisited.

The last five characters of the full serial are the head of the certificate's
own HMAC-SHA256, keyed by `DOCUMENT_HASH_SECRET`. A forger can invent a
plausible sequence number; they cannot compute a matching tail.

**Typography rule:** the engraved certificate number is set in oldstyle
figures, because it is a display number set alone in a face tuned for them.
Every identifier a human might **type back** — the verification code, the
Document ID, the Student ID — is set in **lining** figures. The first proof set
the verification code in oldstyle and `E0AB-87A6-514C` rendered with a zero at
x-height, indistinguishable from a lowercase o.

## 5. The Student Identity Number is permanent, and there is one per person

Five of the thirteen students on this roll already hold an SHRS Student ID from
an earlier award. Their existing number is **carried onto this certificate**;
it is not re-minted. A second permanent number for one child gives the
institution two irreconcilable records of the same person.

The issuer does not re-derive those numbers. It reads them out of the earlier
graduation register at run time and refuses the batch if the lookup is not
exactly one match:

| This roll | Earlier register | Match |
|---|---|---|
| Hameedah Adebimpe Ojewumi | IBT 000035 | exact |
| Aisha Anofi | IBT 000036 | exact |
| Muhammad Ismail Seriki | IDD 000042 | exact |
| Baqi Anofi | IDD 000043 — *Baqi Olamiposi Anofi* | **short form** |
| Faridah Aliu | IDD 000044 — *Faridah Ayomide Aliu* | **short form** |

**The two short-form matches await the Founder's confirmation.** They are
treated as the same student, because minting a second permanent number is the
more damaging of the two possible errors — but that is his call, not the
pipeline's, and it is printed on the register as outstanding rather than
resolved silently. If they are different people, those two certificates must be
reissued with new Student IDs **before** they are printed.

**The two short-form matches are settled.** Two of the five carry-overs were
matched on a short form of a name rather than on an exact string, and both were
held open on the register rather than resolved silently:

| This roll | Existing register | Student ID carried | Ruled | Decision |
|---|---|---|---|---|
| Baqi Anofi | Baqi Olamiposi Anofi (I'dādiyyah) | 710699780947768 | 2026-08-07 | Same student. Carry-over approved. |
| Faridah Aliu | Faridah Ayomide Aliu (I'dādiyyah) | 713944318135552 | 2026-08-07 | Same student. Carry-over approved. |

The ruling is carried in the issuer's roll as a `founderRuling` field, printed
on the register in full, and checked by `scripts/verify-royal-college-certificate.mjs`,
which fails the batch if a short-form match is neither flagged nor ruled on, or
if a ruling does not name its date and its decision. `matchedAs` still reads
`short-form`: the match WAS made on a short form, and a later reader is entitled
to see both that fact and the decision that settled it.

**What the ruling did not change:** the name engraved on each sheet is still the
one on the Founder's roll — *Baqi Anofi*, *Faridah Aliu*. He confirmed an
identity, not a re-spelling, and the printed name is hashed into the serial, so
changing it is a separate instruction given separately.

## 6. The security layer

Every element below is on the sheet. Where a decision had a cost, it is stated.

| Element | Where | Note |
|---|---|---|
| **Guilloche net** | Seven wave systems crossing the whole field | No area of this sheet is bare paper — bare paper is where a forger's inkjet has nothing to match. Structural strokes ≥ 0.10mm, screen strokes ≥ 0.07mm. |
| **The border mass** | A worked-gold body, 8mm at the head and foot and 11.8mm at the sides, with the field cut out of it on an 8mm radius | v1.2 and v1.3 both drew the border as concentric ribbons on cream. The Founder's verdict on v1.3 was two out of ten — "I don't like the shapes you're putting in the air and the angle of each border of the square… I have expected you to design more heavy border certificate, not just the flat one" — and the reference artwork he supplied says exactly what was missing. **A heavy border is a solid saturated patterned mass, not a wider ring of hairlines.** Weight comes from value contrast; the corner problem disappears when the corner is a radius rather than an angle. v2.0 ran the mass at twice this depth; the Founder halved it at v2.1 — a narrower band of worked metal against a wide, open, lightly patterned field is the more confident document. |
| **One path, no joins** | The mass is a single even-odd fill: outer rounded rectangle plus inner rounded rectangle | The head, the foot and both sides are literally the same object. Nothing meets anything, so nothing has to be patched over a join — and the depth no longer has to be equal on all four sides, which is what lets the sides carry the extra 7.5mm the landscape proportion wants. |
| **Khatam tessellation** | The eight-point Islamic star {8/3} on a 3.9mm lattice, with a concentric octagon in each star and a struck lozenge in every interstice, engraved into the gold | This is the layer that makes the mass read as worked metal rather than a printed block of colour. Emitted as real vector paths, and only for the cells the mass actually touches: an SVG `<pattern>` is rasterised into the PDF whatever it holds. |
| **Corner jewels** | An eight-point khatam star struck where the gold fillet turns its radius, with a navy boss and a pendant of three diminishing lozenges trailing inward | **These replace v1.3's corner bosses, v1.2's corner fans and v1.1's navy corner blocks.** Two freehand attempts came first — a radiating palm spray, then a bezier vine — and both read as crude. Drawn ornament that is nearly right is worse than none. The corner now takes the border's own geometry instead, so it repeats a motif the eye has already learned. |
| **Lobed medallions** | Twelve lobes at the centre of each side, ten at the head and foot: gold rim, navy ground, gold rosette | The rhythm that stops a long run of pattern from reading as wallpaper. |
| **Navy keylines** | Navy bounds the mass on both edges and runs just inside the field fillet | Gold on gold is invisible: the rules that bound a gold mass have to be a different ink. |
| **Khatam wash** | The border's own star at three times the scale and a twentieth of the weight, across the open field | A premium ground for the paper that takes no weight off the type. |
| **Two inks, not three** | Gold and navy, plus the paper | Crimson entered at v1.3 on the brief for "flashy crimson" and was withdrawn at v2.1 on the Founder's reading of the proof: against a gold ground it fought the metal instead of accenting it. |
| **Security threads** | Two windowed threads in the quiet side margins, symmetric about the sheet centre | A continuous metallic line surfacing through a run of windows, with the certificate's own serial repeating along it in microtext. **These replace v1.1's holographic strips** — a strip is a rectangle of tint, a thread is a structure. |
| **Iris (split-duct) band** | Behind the title, gold → terracotta → gold | Masked vertically as well as horizontally: a split-duct roll has no edge, and a hard-edged one reads as a pasted rectangle. |
| **Void pantograph** | Across the mid-field | Two screens at the same angle and different frequencies. On the sheet they integrate to one flat tint; a copier's sampling grid beats against the fine one and drops it, so the coarse one surfaces and the word appears. |
| **Intaglio medallion watermark** | One large behind the citation, two flanking | Four concentric rosettes at 13/11/9/7 petals |
| **Dual serial** | In the crimson ribbon — top-right and bottom-left | A banknote carries its serial twice, in a contrasting ink, at opposite corners: two chances to read it, and a disagreement between the two is the first thing an examiner looks for. Terracotta, so it reads as a serial and not as ornament. |
| **Microtext rails** | Top, bottom, left, right — 0.90pt | Each rail carries **this certificate's own serial**, so the security layer differs on every sheet. The supplied artwork's microtext is identical on every copy. |
| **Security fibres** | 36, scattered across the field | Deterministic from the serial — the same certificate regenerates identically, so a reissue that differs is a reissue that can be spotted |
| **UV-reactive motifs** | Six eight-point stars, arranged | Drawn pale lilac on the proof so the press can see where they go; the ink swaps at plate-making to a 365nm fluorescent |
| **Latent-image screen** | Under the certificate number | 38° screen that photocopies as a solid block |
| **Serial microtext** | Along the foot of the number cartouche, 0.78pt | Carries the FULL serial — year and anti-forgery tail — which the printed number drops |
| **Institutional seal** | Centred in the authentication band, 38mm | Vector, with the Royal College's own ring text. The v1.0 raster seal names the School of Islamic & Arabic Studies and is **not** reused here. |
| **QR code** | 17.6mm, error correction H | Payload `https://shroyalschools.com/v/<serial>` — the `/v/` redirect exists to keep the symbol at 45×45 modules; the long form pushes it to 53×53, below the density a phone camera needs at this size |
| **Code 128-C, archive** | Verification plate, left | Payload = archive number, year + 6-digit run. Identifies the **document**. |
| **Code 128-C, holder** | Verification plate, centre | Payload = the permanent Student ID with ONE leading zero, because Code 128-C encodes digits in pairs and needs an even-length payload. Identifies the **holder**. A sheet whose two codes disagree with the register is a sheet assembled from parts of two certificates. `functions/api/certificates/verify.js` strips that padding before parsing — without it, scanning the sheet's own holder barcode reported "no certificate found" on a genuine document. |
| **The engraved number keeps its check tail** | Face, in the number cartouche | `SHRS-CERT-JSS-000048-3E309`, never the tail-less short form. The tail is the first five hex characters of this certificate's own HMAC, and it is the head of the printed verification code — so a verifier holding the paper can check the number against the plate **with no database at all**. v2.0 and v2.1 dropped it, which `certificate-serial.js` warns against by name; v2.2 restores it, and `scripts/verify-royal-college-verifiability.mjs` now fails the batch if it ever goes missing again. |
| **Void warning + verification URL** | Foot of the verification plate | |

**Exactly one QR per sheet.** Finding the right symbol is not enough — an extra
one is its own defect. A reader who scans a dead code on a credential that
promises verification has every reason to doubt the document.

## 7. Signatures

Two blocks, both now carrying a real specimen:

- **Dr. Adegoke Musa Olatunji**, Principal, Sultan Hanafi Royal College —
  `assets/images/certificates/signature-royal-college-principal.svg`. Supplied
  2026-08-06 as a 120 × 86 px photograph of a signature written light-on-dark;
  traced to vector by `scripts/trace-signature.py`, which discards the dark
  ground entirely and reduces the ink to fresh black Béziers.
- **Dr. Zakariya Olanrewaju Anofi**, Chairman, Board of Governors —
  `assets/images/certificates/signature-chairman.png`, already on file.

**Honest limit on the Principal's specimen.** Tracing does not add information.
It makes the edges crisp at any resolution, which is real and worth having, but
the stroke shape can only be as faithful as its source, and a 120 × 86 px
photograph is a very small source. The tracing pipeline is one command
(`python3 scripts/trace-signature.py <photo> <out.svg>`), so re-running it on a
higher-resolution capture — a scan at 600 DPI of the signature on white paper —
would measurably improve the printed result. Worth doing before the press run.

## 8. What may change, and what may not

**May change per certificate:** student name, Student ID, academic session,
date of award, place of issue, and every derived identifier.

**May not change without a new version:** the layout, the numbering algorithms,
the verification logic, the identifier shapes, the award wording, the citation
paragraph, and the security elements listed in §6.

**Must never happen:**

- Re-running the issuer for a batch already printed. The hash **is** the
  printed serial suffix; a new key changes a number already in circulation.
- Issuing without `DOCUMENT_HASH_SECRET`. The issuer refuses, and that refusal
  is load-bearing: a convenience default is how six real certificates once came
  to be signed by a development literal.
- Editing any file frozen at v1.0. This module imports none of them, and
  `scripts/verify-certificate-master.mjs --strict` must stay green.

## 9. Producing the batch

```bash
# 1. Issue — mints serials, hashes, Student IDs, QR payloads, and the register.
DOCUMENT_HASH_SECRET=… DOCUMENT_HASH_KEY_VERSION=2 \
  node scripts/issue-royal-college-batch.mjs

# 2. Structure, identifiers, wording, layout, residue.
node scripts/verify-royal-college-certificate.mjs \
  dist/certificates/2026-08-08-JSS-000048

# 3. Press PDF + 600 DPI proofs.
node scripts/render-royal-college-batch.mjs \
  dist/certificates/2026-08-08-JSS-000048 --dpi 600

# 4. Machine-readable codes, decoded off the real PDF at 150/200/300/600 DPI.
python3 scripts/verify-certificate-codes.py \
  dist/certificates/2026-08-08-JSS-000048/SHRS-JSS-2026-000048-000060-press.pdf \
  dist/certificates/2026-08-08-JSS-000048/register-2026-08-08-JSS-000048.json

# 5. The v1.0 master must still be intact.
node scripts/verify-certificate-master.mjs --strict
```

Step 1 must run in an environment holding the production signing key. It is not
in this repository and must never be put in it
(`docs/certificate-key-deployment.md`).

## 10. Resolution

The sheet is **true vector**. There is no raster background: at 92 DPI the
supplied artwork has about three pixels across every ornamental stroke, and
upsampling invents detail rather than recovering it. Rebuilding it means the
output is exact at 300 DPI, at 600, and at 1200 — the resolution is a render
argument, not a property of the master.

The only rasters on the sheet are the three emblems and the Chairman's
signature, all of which are the institution's own supplied assets.

Trim size is **true A4 landscape, 297 × 210mm**, filling the page edge to edge.
The v1.0 master draws 297 × 209.5 and leaves a 0.34mm strip of body colour at
the foot of its PDF page; this one does not.
